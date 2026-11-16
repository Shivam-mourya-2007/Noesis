# NOESIS — Video Editing Agency Landing Intro

Modular, typed, and resilient masked-reveal intro animation for NOESIS using GSAP, SVG, and Black Ops One font geometry.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview

# Regenerate wordmark data from font
npm run wordmark
```

## Project Structure

```
noesis/
├── index.html                   # Semantic entry point with progressive enhancement (.js class)
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # Strict TypeScript configuration
├── scripts/
│   └── build-wordmark.ts        # CLI tool extracting font outlines & generating brush masks
├── src/
│   ├── main.ts                  # Application entry point, event binding & resilience wiring
│   ├── vite-env.d.ts            # Client environment type definitions
│   ├── assets/
│   │   └── fonts/               # BlackOpsOne-Regular.ttf and OFL.txt
│   ├── styles/
│   │   ├── tokens.css           # Design tokens (colors, fluid typography, spacing)
│   │   ├── fonts.css            # @font-face definition for Black Ops One
│   │   └── hero.css             # Full-viewport layout, stage, hero content, responsive styles
│   └── intro/
│       ├── types.ts             # TypeScript interfaces for wordmark, glyphs, and engine state
│       ├── config/
│       │   ├── brushes.json     # Glyph-local stroke polylines (y-up font coordinates)
│       │   └── intro.config.ts  # Master configuration for speeds, timings, and scales
│       ├── data/
│       │   └── noesis.wordmark.json  # Pre-computed wordmark geometry and brush paths
│       └── engine/
│           ├── build-svg.ts     # Constructs SVG stage, defs, filters, mask, and cursor
│           ├── cursor.ts        # macOS arrow cursor scale, hotspot math & pen down/up
│           ├── writer.ts        # Single-progress stroke animation & length caching
│           ├── timeline.ts      # GSAP master timeline & instant final-state handler
│           └── session.ts       # Session storage persistence & replay checks
└── _archive/
    └── ...                      # Archived legacy prototype (untouched)
```

## Changing the Word

To regenerate the wordmark with a different word:

```bash
npm run wordmark -- --word NOESIS
```

If any letter does not have predefined brush strokes in `brushes.json`, the generator automatically falls back to a zigzag hatch covering the glyph bounding box and prints a warning.

## Adding Brush Strokes for New Letters

1. Open `src/intro/config/brushes.json`.
2. Under `glyphs`, add the uppercase letter character.
3. Define an array of strokes. Each stroke is a list of `[x, y]` points in font units where:
   - Coordinates are glyph-local (x=0 at glyph origin, y=0 at baseline, capHeight=1327).
   - Coordinates use y-up convention.
4. Run `npm run wordmark` to regenerate `src/intro/data/noesis.wordmark.json`.

## Configuration & Tunables (`src/intro/config/intro.config.ts`)

All timing, speed, and geometric constants are centralized in `intro.config.ts`:

- `DRAW_SPEED`: Reveal speed in font units per second (default: `8000`).
- `PEN_MOVE_SPEED`: Travel speed between strokes (default: `20000`).
- `PEN_MOVE_MIN` / `PEN_MOVE_MAX`: Clamped duration range for pen travel (`0.15s` - `0.35s`).
- `CURSOR_FADE_IN` / `CURSOR_HOLD`: Initial cursor entry timings (`0.3s`, `0.25s`).
- `HOLD_AFTER_WRITING`: Pause after completing the word before hero content transitions (`0.7s`).
- `PEN_DOWN_SCALE`: Cursor scale during active drawing (`0.92`).
- `SPEED_JITTER`: Hand-drawn speed variation per stroke (`±8%`).
- `ARROW_PX_DESKTOP` / `ARROW_PX_MOBILE`: Rendered cursor height in screen pixels (`40px` desktop / `30px` mobile).
- `MOBILE_BREAKPOINT`: Viewport width breakpoint (`600px`).
- `MAX_INTRO_SECONDS`: Watchdog safety limit before forcing completion (`15s`).
- `SESSION_KEY`: SessionStorage flag (`noesis:introSeen`).

## Dev & Testing Modes (Development Only)

- `?debug`: Renders brush centerlines in red with dots at starting points.
- `?only=0`: Animates only the strokes of glyph index 0 ("N") and skips the transition.
- `?only=0,1`: Animates only glyphs 0 and 1 ("N" and "O").
- `?replay`: Ignores `sessionStorage` and replays intro on load.
- Press **R**: Replays the entire intro animation at any time.
- Press **Escape**, **Space**, or click/tap: Instantly skips to the finished portfolio state.
- Honors `prefers-reduced-motion: reduce` by jumping directly to the final state.
