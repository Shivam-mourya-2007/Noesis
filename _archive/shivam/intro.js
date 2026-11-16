/**
 * SHIVAM HANDWRITING INTRO ANIMATION
 * Pure JS + SVG + GSAP monoline handwriting engine
 */

(function () {
  'use strict';

  // ========== CONSTANTS & STATE (Phase 6) ==========
  const STATE = {
    INTRO: 'INTRO',
    CURSOR_READY: 'CURSOR_READY',
    WRITING: 'WRITING',
    COMPLETED: 'COMPLETED',
    TRANSITION: 'TRANSITION',
    PORTFOLIO: 'PORTFOLIO'
  };

  const SPEED = 750; // ViewBox units per second (Phase 4)
  let masterTimeline = null;
  let baseCursorK = 1.0;
  let cursorPressScale = 1.0;
  let pressProxy = { scale: 1.0 };
  let currentPenTween = null;

  // URL parameters for testing & QA (Phases 3, 4, 10)
  const urlParams = new URLSearchParams(window.location.search);
  const onlyS = urlParams.get('only') === 's';
  const isDebug = urlParams.has('debug');
  const forceReplay = urlParams.has('replay');

  function setState(s) {
    document.documentElement.dataset.state = s;
  }

  // ========== PHASE 7 & 9: RESPONSIVE CURSOR SCALING ==========
  function updateCursorScale() {
    const stage = document.getElementById('stage');
    if (!stage) return;

    const ctm = stage.getScreenCTM();
    if (!ctm || !ctm.a) return;

    // c = pixels per viewBox unit
    const c = ctm.a;
    const arrowHeightPx = window.innerWidth > 600 ? 40 : 30;

    // The cursor artwork body is ~18 units tall
    baseCursorK = (arrowHeightPx / 18) / c;
    applyCursorTransform();
  }

  function applyCursorTransform() {
    const cursorArt = document.getElementById('cursor-art');
    if (!cursorArt) return;
    const k = baseCursorK * cursorPressScale;
    cursorArt.setAttribute('transform', `scale(${k}) translate(-8.2 -4.9)`);
  }

  // Phase 9: Pen-down press (scales cursor art to 0.92 of size, tip stays at origin)
  function setPenDown(down) {
    gsap.to(pressProxy, {
      scale: down ? 0.92 : 1.0,
      duration: 0.08,
      ease: 'power1.out',
      overwrite: true,
      onUpdate: () => {
        cursorPressScale = pressProxy.scale;
        applyCursorTransform();
      }
    });
  }

  // Debounce helper for window resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateCursorScale, 100);
  });

  // ========== PHASE 4: REUSABLE DRAW & PEN FUNCTIONS ==========
  function getStrokeStart(path) {
    return path.getPointAtLength(0);
  }

  function movePenTo(point, duration) {
    // Pen-up travel between strokes
    const currentX = gsap.getProperty('#cursor', 'x') || 0;
    const currentY = gsap.getProperty('#cursor', 'y') || 0;
    const dist = Math.hypot(point.x - currentX, point.y - currentY);
    const dur = duration !== undefined ? duration : gsap.utils.clamp(0.18, 0.45, dist / 1800);

    return gsap.to('#cursor', {
      x: point.x,
      y: point.y,
      duration: dur,
      ease: 'power2.inOut',
      onStart: () => setPenDown(false)
    });
  }

  function drawStroke(path) {
    const totalLength = path.getTotalLength(); // Cached once per stroke

    // Phase 9: Per-stroke speed variation (0.9 to 1.1x) to feel hand-drawn
    const speedFactor = 0.9 + Math.random() * 0.2;
    const strokeSpeed = SPEED * speedFactor;
    const duration = totalLength / strokeSpeed;

    const proxy = { p: 0 };
    const tl = gsap.timeline();

    tl.to(proxy, {
      p: 1,
      duration: duration,
      ease: 'power1.inOut',
      onStart: () => {
        path.style.visibility = 'visible';
        setPenDown(true);
      },
      onUpdate: () => {
        // 1. Dashoffset uses pathLength="1" math
        path.style.strokeDashoffset = (1 - proxy.p).toString();

        // 2. Sample cursor in REAL viewBox units
        const pt = path.getPointAtLength(proxy.p * totalLength);
        gsap.set('#cursor', { x: pt.x, y: pt.y });
      },
      onComplete: () => {
        setPenDown(false);
      }
    });

    return tl;
  }

  // ========== PHASE 3: STROKE SETUP & DEBUG MODE ==========
  function setupStrokes() {
    const strokes = document.querySelectorAll('.stroke');
    strokes.forEach((stroke) => {
      stroke.style.strokeDasharray = '1 2';
      stroke.style.strokeDashoffset = '1';
      stroke.style.visibility = 'hidden';
    });

    // Debug mode: overlay thin 1px red centerline
    if (isDebug) {
      const lettersGroup = document.getElementById('letters');
      const stage = document.getElementById('stage');
      const cursor = document.getElementById('cursor');

      if (lettersGroup && stage && cursor) {
        strokes.forEach((stroke) => {
          const debugClone = stroke.cloneNode(true);
          debugClone.removeAttribute('id');
          debugClone.removeAttribute('pathLength');
          debugClone.className.baseVal = 'debug-centerline';
          debugClone.style.strokeDasharray = 'none';
          debugClone.style.strokeDashoffset = '0';
          debugClone.style.visibility = 'visible';
          // Insert behind cursor so it is visible
          stage.insertBefore(debugClone, cursor);
        });
      }
    }
  }

  // ========== PHASE 6 & 8: MASTER TIMELINE ==========
  function createWritingTimeline() {
    const tl = gsap.timeline();

    // 1. INTRO: Cursor starts at center of viewBox (510, 200), hidden
    tl.add(() => setState(STATE.INTRO));
    tl.set('#cursor', { x: 510, y: 200, opacity: 0 });

    // 2. CURSOR_READY: Fade cursor in over 0.3s, hold 0.3s
    tl.add(() => setState(STATE.CURSOR_READY));
    tl.to('#cursor', { opacity: 1, duration: 0.3 });
    tl.to({}, { duration: 0.3 });

    // 3. WRITING: Stroke by stroke with pen-up travel
    tl.add(() => setState(STATE.WRITING));

    const strokes = onlyS
      ? [document.querySelector('#letter-s .stroke')]
      : Array.from(document.querySelectorAll('.stroke'));

    strokes.forEach((stroke) => {
      const startPoint = getStrokeStart(stroke);
      tl.add(movePenTo(startPoint));
      tl.add(drawStroke(stroke));
    });

    // 4. COMPLETED: Hold for 0.7s, apply soft glow (Phase 9)
    tl.add(() => {
      setState(STATE.COMPLETED);
      const lettersEl = document.getElementById('letters');
      if (lettersEl) lettersEl.setAttribute('filter', 'url(#word-glow)');
    });
    tl.to({}, { duration: 0.7 });

    // 5. TRANSITION to PORTFOLIO (Phase 8)
    tl.add(() => setState(STATE.TRANSITION));

    // Cursor exits toward bottom right
    tl.to('#cursor', {
      x: 1060,
      y: 460,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in'
    }, 'transition');

    // Wordmark shifts up and scales slightly
    tl.to('#wordmark', {
      y: '-8vh',
      scale: 0.85,
      duration: 0.8,
      ease: 'power3.inOut'
    }, 'transition');

    // Hero content reveals cleanly
    tl.set('#heroContent', { visibility: 'visible' }, 'transition+=0.3');
    tl.fromTo('#heroContent',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      'transition+=0.3'
    );

    tl.fromTo(['#heroContent .tagline', '#heroContent .cta'],
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out' },
      'transition+=0.4'
    );

    tl.add(() => {
      setState(STATE.PORTFOLIO);
      try {
        sessionStorage.setItem('shivam_intro_played', 'true');
      } catch (e) {
        // Safe fallback if sessionStorage is blocked
      }
    });

    return tl;
  }

  // ========== PHASE 8 & 10: INSTANT FINAL STATE ==========
  function showFinalState() {
    if (masterTimeline) {
      masterTimeline.kill();
      masterTimeline = null;
    }

    // Hide cursor
    gsap.set('#cursor', { opacity: 0 });

    // Show all strokes completely drawn
    const strokes = document.querySelectorAll('.stroke');
    strokes.forEach((stroke) => {
      stroke.style.visibility = 'visible';
      stroke.style.strokeDashoffset = '0';
    });

    // Apply finished glow
    const lettersEl = document.getElementById('letters');
    if (lettersEl) lettersEl.setAttribute('filter', 'url(#word-glow)');

    // Wordmark final position
    gsap.set('#wordmark', { y: '-8vh', scale: 0.85 });

    // Hero content revealed
    gsap.set('#heroContent', { visibility: 'visible', opacity: 1, y: 0 });
    gsap.set(['#heroContent .tagline', '#heroContent .cta'], { opacity: 1, y: 0 });

    setState(STATE.PORTFOLIO);

    try {
      sessionStorage.setItem('shivam_intro_played', 'true');
    } catch (e) {}
  }

  // ========== REPLAY CONTROLLER (Phases 4 & 10) ==========
  function replay() {
    if (masterTimeline) {
      masterTimeline.kill();
      masterTimeline = null;
    }

    // Reset letters filter and transforms
    const lettersEl = document.getElementById('letters');
    if (lettersEl) lettersEl.removeAttribute('filter');

    gsap.set('#wordmark', { y: '0vh', scale: 1 });
    gsap.set('#heroContent', { visibility: 'hidden', opacity: 0, y: 0 });

    setupStrokes();
    updateCursorScale();

    masterTimeline = createWritingTimeline();
    masterTimeline.play();
  }

  // ========== INITIALIZATION (Phase 6 & 10) ==========
  function init() {
    setupStrokes();
    updateCursorScale();

    // Check for reduced motion preference (Phase 10)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      showFinalState();
      return;
    }

    // Check session play state (Phase 10)
    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem('shivam_intro_played') === 'true';
    } catch (e) {}

    if (alreadyPlayed && !forceReplay) {
      showFinalState();
      return;
    }

    // Build and start master timeline
    masterTimeline = createWritingTimeline();
    masterTimeline.play();
  }

  // ========== INTERACTION LISTENERS (Phase 4 & 10) ==========
  // Replay shortcut: Press 'R'
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      replay();
    }
  });

  // Skip on click, tap, Escape, or Space during intro
  function handleSkip(e) {
    const currentState = document.documentElement.dataset.state;
    if (currentState && currentState !== STATE.PORTFOLIO) {
      const isEscape = e.key === 'Escape';
      const isSpace = e.key === ' ' || e.code === 'Space';
      const isPointer = e.type === 'click' || e.type === 'touchstart';

      if (isEscape || isSpace || isPointer) {
        if (e.type === 'keydown') e.preventDefault();
        showFinalState();
      }
    }
  }

  window.addEventListener('click', handleSkip);
  window.addEventListener('touchstart', handleSkip, { passive: true });
  window.addEventListener('keydown', handleSkip);

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
