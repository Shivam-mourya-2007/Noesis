export interface ViewBoxData {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface GlyphData {
  index: number;
  char: string;
  x: number;
  outline: string;
}

export interface StrokeData {
  id: string;
  glyphIndex: number;
  char: string;
  d: string;
}

export interface WordmarkData {
  word: string;
  unitsPerEm: number;
  capHeight: number;
  totalWidth: number;
  brushWidth: number;
  viewBox: ViewBoxData;
  glyphs: GlyphData[];
  strokes: StrokeData[];
}

export interface BrushesConfig {
  brushWidth: number;
  glyphs: Record<string, [number, number][][]>;
}

export const STATE = {
  INTRO: 'INTRO',
  CURSOR_READY: 'CURSOR_READY',
  WRITING: 'WRITING',
  COMPLETED: 'COMPLETED',
  TRANSITION: 'TRANSITION',
  PORTFOLIO: 'PORTFOLIO'
} as const;

export type IntroState = typeof STATE[keyof typeof STATE];
