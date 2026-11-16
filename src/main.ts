import gsap from 'gsap';
import wordmarkDataRaw from './intro/data/noesis.wordmark.json';
import type { WordmarkData } from './intro/types';
import { INTRO_CONFIG } from './intro/config/intro.config';
import { buildSVG, renderDebugCenterlines } from './intro/engine/build-svg';
import { updateCursorScale } from './intro/engine/cursor';
import {
  createWritingTimeline,
  showFinalState,
  getCurrentState,
  STATE
} from './intro/engine/timeline';
import { isIntroSeen, shouldForceReplay } from './intro/engine/session';

const wordmarkData = wordmarkDataRaw as WordmarkData;

function initIntro(): void {
  const container = document.getElementById('wordmark');
  if (!container) return;

  let stage: SVGSVGElement | null = null;

  try {
    stage = buildSVG(container, wordmarkData);

    // Initial responsive cursor scale
    updateCursorScale(stage);

    // Debounced resize handler
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (stage) updateCursorScale(stage);
      }, 100);
    });

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      showFinalState(stage);
      return;
    }

    // Check once-per-session
    if (isIntroSeen() && !shouldForceReplay()) {
      showFinalState(stage);
      return;
    }

    // Dev options
    let filterGlyphs: number[] | undefined;
    if (import.meta.env.DEV) {
      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.has('debug')) {
        const brushes = Array.from(stage.querySelectorAll<SVGPathElement>('.brush'));
        renderDebugCenterlines(stage, brushes);
      }

      const onlyParam = urlParams.get('only');
      if (onlyParam !== null) {
        filterGlyphs = onlyParam
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n));
      }

      // Replay hotkey 'R'
      window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
          if (stage) {
            updateCursorScale(stage);
            createWritingTimeline(stage, wordmarkData, filterGlyphs).play();
          }
        }
      });
    }

    // Skip interactions: click, tap, Escape, Space
    function handleSkip(e: MouseEvent | TouchEvent | KeyboardEvent): void {
      const currentState = getCurrentState();
      if (!currentState || currentState === STATE.PORTFOLIO) return;

      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          if (stage) showFinalState(stage);
        }
      } else if (e.type === 'click' || e.type === 'touchstart') {
        if (stage) showFinalState(stage);
      }
    }

    window.addEventListener('click', handleSkip);
    window.addEventListener('touchstart', handleSkip, { passive: true });
    window.addEventListener('keydown', handleSkip);

    // Watchdog timer
    setTimeout(() => {
      if (getCurrentState() !== STATE.PORTFOLIO) {
        console.warn('Intro exceeded MAX_INTRO_SECONDS watchdog; forcing final state.');
        if (stage) showFinalState(stage);
      }
    }, INTRO_CONFIG.MAX_INTRO_SECONDS * 1000);

    // Run writing timeline
    const tl = createWritingTimeline(stage, wordmarkData, filterGlyphs);
    tl.play();
  } catch (error) {
    console.error('Failed to initialize intro animation, displaying final state:', error);
    showFinalState(stage ?? undefined);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIntro);
} else {
  initIntro();
}
