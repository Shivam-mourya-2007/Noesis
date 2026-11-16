import gsap from 'gsap';
import { STATE, type IntroState, type WordmarkData } from '../types';
import { INTRO_CONFIG } from '../config/intro.config';
import { movePenTo, penUp } from './cursor';
import { drawStroke, getStrokeStart } from './writer';
import { markIntroSeen } from './session';

export { STATE };

let activeTimeline: gsap.core.Timeline | null = null;

export function setState(state: IntroState): void {
  document.documentElement.dataset.state = state;
}

export function getCurrentState(): string | undefined {
  return document.documentElement.dataset.state;
}

export function getActiveTimeline(): gsap.core.Timeline | null {
  return activeTimeline;
}

export function showFinalState(stage?: SVGSVGElement): void {
  if (activeTimeline) {
    activeTimeline.kill();
    activeTimeline = null;
  }

  penUp();
  gsap.set('#cursor', { opacity: 0 });

  const brushes = (stage || document).querySelectorAll<SVGPathElement>('.brush');
  brushes.forEach((brush) => {
    brush.style.strokeDashoffset = '0';
  });

  const glyphsEl = (stage || document).querySelector('#glyphs');
  if (glyphsEl) {
    glyphsEl.setAttribute('filter', 'url(#word-glow)');
  }

  gsap.set('#wordmark', {
    y: INTRO_CONFIG.WORDMARK_Y_OFFSET,
    scale: INTRO_CONFIG.WORDMARK_SCALE
  });

  gsap.set('#heroContent', {
    visibility: 'visible',
    opacity: 1,
    y: 0
  });

  gsap.set(['#heroContent .tagline', '#heroContent .cta'], {
    opacity: 1,
    y: 0
  });

  setState(STATE.PORTFOLIO);
  markIntroSeen();
}

export function createWritingTimeline(
  stage: SVGSVGElement,
  data: WordmarkData,
  filterGlyphs?: number[]
): gsap.core.Timeline {
  if (activeTimeline) {
    activeTimeline.kill();
    activeTimeline = null;
  }

  const { viewBox } = data;
  const centerX = viewBox.minX + viewBox.width / 2;
  const centerY = viewBox.minY + viewBox.height / 2;

  const allBrushes = Array.from(stage.querySelectorAll<SVGPathElement>('.brush'));

  // Reset initial stroke states
  allBrushes.forEach((brush) => {
    brush.style.strokeDashoffset = '1';
  });

  const glyphsEl = stage.querySelector('#glyphs');
  if (glyphsEl) {
    glyphsEl.removeAttribute('filter');
  }

  gsap.set('#wordmark', { y: '0vh', scale: 1 });
  gsap.set('#heroContent', { visibility: 'hidden', opacity: 0 });

  let targetBrushes = allBrushes;
  const isFiltered = filterGlyphs && filterGlyphs.length > 0;
  if (isFiltered) {
    targetBrushes = allBrushes.filter((b) => {
      const gIndex = Number(b.getAttribute('data-glyph-index'));
      return filterGlyphs.includes(gIndex);
    });
  }

  const tl = gsap.timeline();
  activeTimeline = tl;

  // 1. INTRO
  tl.add(() => setState(STATE.INTRO));
  tl.set('#cursor', { x: centerX, y: centerY, opacity: 0 });

  // 2. CURSOR_READY
  tl.add(() => setState(STATE.CURSOR_READY));
  tl.to('#cursor', { opacity: 1, duration: INTRO_CONFIG.CURSOR_FADE_IN });
  tl.to({}, { duration: INTRO_CONFIG.CURSOR_HOLD });

  // 3. WRITING
  tl.add(() => setState(STATE.WRITING));
  targetBrushes.forEach((brush) => {
    const startPoint = getStrokeStart(brush);
    tl.add(movePenTo(startPoint));
    tl.add(drawStroke(brush));
  });

  // 4. COMPLETED
  tl.add(() => {
    setState(STATE.COMPLETED);
    if (glyphsEl) {
      glyphsEl.setAttribute('filter', 'url(#word-glow)');
    }
  });
  tl.to({}, { duration: INTRO_CONFIG.HOLD_AFTER_WRITING });

  // 5. TRANSITION (skip if testing single glyphs)
  if (!isFiltered) {
    tl.add(() => setState(STATE.TRANSITION));

    const exitX = viewBox.minX + viewBox.width + 200;
    const exitY = viewBox.minY + viewBox.height + 200;

    tl.to(
      '#cursor',
      {
        x: exitX,
        y: exitY,
        opacity: 0,
        duration: INTRO_CONFIG.CURSOR_EXIT_DURATION,
        ease: 'power2.in'
      },
      'transition'
    );

    tl.to(
      '#wordmark',
      {
        y: INTRO_CONFIG.WORDMARK_Y_OFFSET,
        scale: INTRO_CONFIG.WORDMARK_SCALE,
        duration: INTRO_CONFIG.WORDMARK_TRANSITION_DURATION,
        ease: 'power3.inOut'
      },
      'transition'
    );

    tl.set('#heroContent', { visibility: 'visible' }, 'transition+=0.3');
    tl.fromTo(
      '#heroContent',
      { opacity: 0, y: INTRO_CONFIG.HERO_Y_OFFSET },
      {
        opacity: 1,
        y: 0,
        duration: INTRO_CONFIG.HERO_FADE_DURATION,
        ease: 'power2.out'
      },
      'transition+=0.3'
    );

    tl.fromTo(
      ['#heroContent .tagline', '#heroContent .cta'],
      { opacity: 0, y: INTRO_CONFIG.HERO_ITEM_Y_OFFSET },
      {
        opacity: 1,
        y: 0,
        duration: INTRO_CONFIG.HERO_ITEM_FADE_DURATION,
        stagger: INTRO_CONFIG.HERO_STAGGER,
        ease: 'power2.out'
      },
      'transition+=0.4'
    );

    tl.add(() => {
      setState(STATE.PORTFOLIO);
      markIntroSeen();
    });
  } else {
    tl.add(() => {
      setState(STATE.PORTFOLIO);
    });
  }

  return tl;
}
