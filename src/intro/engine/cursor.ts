import gsap from 'gsap';
import { INTRO_CONFIG } from '../config/intro.config';

let baseK = 1.0;
let pressScale = 1.0;
const pressProxy = { scale: 1.0 };

export function setArt(scaleMultiplier = 1.0): void {
  const cursorArt = document.getElementById('cursor-art');
  if (!cursorArt) return;
  const k = baseK * scaleMultiplier;
  cursorArt.setAttribute(
    'transform',
    `scale(${k}) translate(-${INTRO_CONFIG.CURSOR_HOTSPOT_X} -${INTRO_CONFIG.CURSOR_HOTSPOT_Y})`
  );
}

export function updateCursorScale(stage: SVGSVGElement): void {
  const ctm = stage.getScreenCTM();
  if (!ctm || !ctm.a) return;

  const c = ctm.a; // pixels per viewBox unit
  const arrowHeightPx =
    window.innerWidth > INTRO_CONFIG.MOBILE_BREAKPOINT
      ? INTRO_CONFIG.ARROW_PX_DESKTOP
      : INTRO_CONFIG.ARROW_PX_MOBILE;

  baseK = (arrowHeightPx / INTRO_CONFIG.CURSOR_BODY_HEIGHT) / c;
  setArt(pressScale);
}

export function setCursorPos(x: number, y: number): void {
  gsap.set('#cursor', { x, y });
}

export function fadeIn(duration = INTRO_CONFIG.CURSOR_FADE_IN): gsap.core.Tween {
  return gsap.to('#cursor', { opacity: 1, duration, ease: 'power1.out' });
}

export function fadeOut(duration = INTRO_CONFIG.CURSOR_FADE_IN): gsap.core.Tween {
  return gsap.to('#cursor', { opacity: 0, duration, ease: 'power1.in' });
}

export function penDown(): gsap.core.Tween {
  return gsap.to(pressProxy, {
    scale: INTRO_CONFIG.PEN_DOWN_SCALE,
    duration: INTRO_CONFIG.PEN_PRESS_DURATION,
    ease: 'power1.out',
    overwrite: 'auto',
    onUpdate: () => {
      pressScale = pressProxy.scale;
      setArt(pressScale);
    }
  });
}

export function penUp(): gsap.core.Tween {
  return gsap.to(pressProxy, {
    scale: INTRO_CONFIG.PEN_UP_SCALE,
    duration: INTRO_CONFIG.PEN_PRESS_DURATION,
    ease: 'power1.out',
    overwrite: 'auto',
    onUpdate: () => {
      pressScale = pressProxy.scale;
      setArt(pressScale);
    }
  });
}

export function movePenTo(
  point: { x: number; y: number },
  overrideDuration?: number
): gsap.core.Tween {
  const currentX = (gsap.getProperty('#cursor', 'x') as number) || 0;
  const currentY = (gsap.getProperty('#cursor', 'y') as number) || 0;
  const dist = Math.hypot(point.x - currentX, point.y - currentY);

  const duration =
    overrideDuration !== undefined
      ? overrideDuration
      : gsap.utils.clamp(
          INTRO_CONFIG.PEN_MOVE_MIN,
          INTRO_CONFIG.PEN_MOVE_MAX,
          dist / INTRO_CONFIG.PEN_MOVE_SPEED
        );

  return gsap.to('#cursor', {
    x: point.x,
    y: point.y,
    duration,
    ease: 'power2.inOut',
    onStart: () => {
      penUp();
    }
  });
}
