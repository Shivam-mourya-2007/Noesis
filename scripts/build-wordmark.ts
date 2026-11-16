import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import brushesData from '../src/intro/config/brushes.json';
import type { WordmarkData, GlyphData, StrokeData, BrushesConfig } from '../src/intro/types';

const DEFAULT_WORD = 'NOESIS';

function parseWordArg(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--word' && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i].startsWith('--word=')) {
      return args[i].slice(7);
    }
  }
  return DEFAULT_WORD;
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function buildPathData(points: [number, number][]): string {
  if (points.length === 0) return '';
  const first = points[0];
  let d = `M ${round1(first[0])} ${round1(first[1])}`;
  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    d += ` L ${round1(pt[0])} ${round1(pt[1])}`;
  }
  return d;
}

function generateFallbackHatch(
  char: string,
  glyph: opentype.Glyph,
  glyphX: number,
  capHeight: number,
  brushWidth: number
): [number, number][][] {
  console.warn(`WARNING: No brush strokes defined in brushes.json for character '${char}'. Generating fallback hatch.`);
  const bbox = glyph.getBoundingBox();
  const rows = Math.ceil(capHeight / (brushWidth * 0.75));
  const rowHeight = capHeight / rows;
  const xLeft = bbox.x1 - 40;
  const xRight = bbox.x2 + 40;

  const points: [number, number][] = [];
  let leftToRight = true;

  for (let r = 0; r <= rows; r++) {
    const y = capHeight - r * rowHeight;
    if (leftToRight) {
      points.push([xLeft, y]);
      points.push([xRight, y]);
    } else {
      points.push([xRight, y]);
      points.push([xLeft, y]);
    }
    leftToRight = !leftToRight;
  }

  return [points];
}

async function main() {
  const word = parseWordArg();
  const fontPath = path.resolve(process.cwd(), 'src/assets/fonts/BlackOpsOne-Regular.ttf');
  const brushes = brushesData as unknown as BrushesConfig;

  const font = opentype.loadSync(fontPath);
  const unitsPerEm = font.unitsPerEm;
  const os2CapHeight = font.tables.os2?.sCapHeight;
  let capHeight = typeof os2CapHeight === 'number' && os2CapHeight > 0 ? os2CapHeight : 1327;

  if (!os2CapHeight) {
    const hGlyph = font.charToGlyph('H');
    if (hGlyph) {
      const bbox = hGlyph.getBoundingBox();
      capHeight = bbox.y2 - bbox.y1;
    }
  }

  const glyphEntries: { glyph: opentype.Glyph; char: string; x: number; y: number }[] = [];

  font.forEachGlyph(word, 0, capHeight, unitsPerEm, { kerning: true }, (glyph, x, y) => {
    const char = word[glyphEntries.length] || glyph.name || '';
    glyphEntries.push({ glyph, char, x, y });
  });

  const glyphs: GlyphData[] = [];
  const strokes: StrokeData[] = [];
  let strokeCounter = 0;

  glyphEntries.forEach((entry, index) => {
    const { glyph, char, x } = entry;
    const pathObj = glyph.getPath(x, capHeight, unitsPerEm);
    const outline = pathObj.toPathData(1);

    glyphs.push({
      index,
      char,
      x: round1(x),
      outline
    });

    const glyphStrokes = brushes.glyphs[char];
    let strokePolylines: [number, number][][];

    if (glyphStrokes && glyphStrokes.length > 0) {
      strokePolylines = glyphStrokes;
    } else {
      strokePolylines = generateFallbackHatch(char, glyph, x, capHeight, brushes.brushWidth);
    }

    strokePolylines.forEach((poly) => {
      // Map each point (px, py) to (x + px, capHeight - py)
      const mappedPoints: [number, number][] = poly.map(([px, py]) => [
        round1(x + px),
        round1(capHeight - py)
      ]);
      const d = buildPathData(mappedPoints);
      strokes.push({
        id: `stroke-${strokeCounter++}`,
        glyphIndex: index,
        char,
        d
      });
    });
  });

  const lastEntry = glyphEntries[glyphEntries.length - 1];
  const totalWidth = lastEntry ? round1(lastEntry.x + (lastEntry.glyph.advanceWidth || 0)) : 0;

  const viewBox = {
    minX: -300,
    minY: -300,
    width: round1(totalWidth + 600),
    height: round1(capHeight + 600)
  };

  const output: WordmarkData = {
    word,
    unitsPerEm,
    capHeight,
    totalWidth,
    brushWidth: brushes.brushWidth,
    viewBox,
    glyphs,
    strokes
  };

  const outDir = path.resolve(process.cwd(), 'src/intro/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'noesis.wordmark.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`${word}: ${glyphs.length} glyphs, ${strokes.length} strokes, viewBox ${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
