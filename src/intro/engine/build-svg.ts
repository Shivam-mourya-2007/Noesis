import type { WordmarkData } from '../types';
import { INTRO_CONFIG } from '../config/intro.config';

export function buildSVG(container: HTMLElement, data: WordmarkData): SVGSVGElement {
  const { viewBox, brushWidth, glyphs, strokes } = data;
  const vbStr = `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`;

  const maskPaths = strokes
    .map(
      (s) =>
        `<path class="brush" pathLength="1" d="${s.d}" data-stroke-id="${s.id}" data-glyph-index="${s.glyphIndex}" stroke-width="${brushWidth}" />`
    )
    .join('\n      ');

  const glyphPaths = glyphs
    .map(
      (g) =>
        `<path d="${g.outline}" data-glyph-index="${g.index}" data-char="${g.char}" />`
    )
    .join('\n      ');

  const svgHTML = `
    <svg id="stage" viewBox="${vbStr}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style="overflow:visible">
      <defs>
        <filter id="cursor-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#000000" flood-opacity="0.55" />
        </filter>
        <filter id="word-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="60" flood-color="#ffffff" flood-opacity="0.3" />
        </filter>
        <mask id="reveal" maskUnits="userSpaceOnUse" x="${viewBox.minX}" y="${viewBox.minY}" width="${viewBox.width}" height="${viewBox.height}">
          ${maskPaths}
        </mask>
      </defs>
      <g id="glyphs" mask="url(#reveal)" fill="#f5f5f5">
        ${glyphPaths}
      </g>
      <g id="cursor" opacity="0">
        <g id="cursor-art" filter="url(#cursor-shadow)" transform="scale(1) translate(-${INTRO_CONFIG.CURSOR_HOTSPOT_X} -${INTRO_CONFIG.CURSOR_HOTSPOT_Y})">
          <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6" />
          <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5" />
          <rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8" />
          <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5" />
        </g>
      </g>
    </svg>
  `;

  container.innerHTML = svgHTML.trim();
  const svg = container.querySelector<SVGSVGElement>('#stage');
  if (!svg) {
    throw new Error('Failed to create #stage SVG element');
  }
  return svg;
}

export function renderDebugCenterlines(stage: SVGSVGElement, strokes: SVGPathElement[]) {
  const cursor = stage.querySelector('#cursor');
  strokes.forEach((stroke) => {
    const d = stroke.getAttribute('d') || '';
    const centerline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    centerline.setAttribute('d', d);
    centerline.setAttribute('class', 'debug-centerline');
    if (cursor) {
      stage.insertBefore(centerline, cursor);
    } else {
      stage.appendChild(centerline);
    }

    const startPt = stroke.getPointAtLength(0);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', startPt.x.toString());
    dot.setAttribute('cy', startPt.y.toString());
    dot.setAttribute('r', '15');
    dot.setAttribute('class', 'debug-dot');
    if (cursor) {
      stage.insertBefore(dot, cursor);
    } else {
      stage.appendChild(dot);
    }
  });
}
