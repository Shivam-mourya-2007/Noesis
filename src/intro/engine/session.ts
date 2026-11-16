import { INTRO_CONFIG } from '../config/intro.config';

export function isIntroSeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_CONFIG.SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_CONFIG.SESSION_KEY, 'true');
  } catch {
    // Graceful fallback when sessionStorage is restricted
  }
}

export function shouldForceReplay(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('replay');
}
