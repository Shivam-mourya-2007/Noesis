import gsap from 'gsap';
import { INTRO_CONFIG } from '../config/intro.config';
import { penDown, penUp, setCursorPos } from './cursor';

const lengthCache = new WeakMap<SVGPathElement, number>();

export function getCachedTotalLength(path: SVGPathElement): number {
  let len = lengthCache.get(path);
  if (len === undefined) {
    len = path.getTotalLength();
    lengthCache.set(path, len);
  }
  return len;
}

export function getStrokeStart(brush: SVGPathElement): DOMPoint {
  return brush.getPointAtLength(0);
}

export function drawStroke(brush: SVGPathElement): gsap.core.Tween {
  const totalLength = getCachedTotalLength(brush);

  // Per-stroke speed variation within ±SPEED_JITTER
  const jitter = 1 + (Math.random() * 2 - 1) * INTRO_CONFIG.SPEED_JITTER;
  const speed = INTRO_CONFIG.DRAW_SPEED * jitter;
  const duration = Math.max(0.05, totalLength / speed);

  const proxy = { p: 0 };

  return gsap.to(proxy, {
    p: 1,
    duration,
    ease: 'power1.inOut',
    onStart: () => {
      penDown();
    },
    onUpdate: () => {
      brush.style.strokeDashoffset = (1 - proxy.p).toString();
      const pt = brush.getPointAtLength(proxy.p * totalLength);
      setCursorPos(pt.x, pt.y);
    },
    onComplete: () => {
      penUp();
    }
  });
}
