/**
 * Smart TV Remote & Keyboard Spatial Navigation Engine
 * Provides complete directional (D-Pad: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Back)
 * navigation across menus, buttons, inputs, tables, and product lists on Smart TVs.
 * Supports Android TV, Google TV, Samsung Tizen, LG webOS, Fire TV, and Desktop keyboards.
 */

// TV Browser Detection
export function isSmartTv(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return (
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('tizen') ||
    ua.includes('webos') ||
    ua.includes('web0s') ||
    ua.includes('netcast') ||
    ua.includes('googletv') ||
    ua.includes('android tv') ||
    ua.includes('hbbtv') ||
    ua.includes('vidaa') ||
    ua.includes('bravia') ||
    ua.includes('mitv') ||
    ua.includes('aft') || // Amazon Fire TV
    ua.includes('apple tv') ||
    ua.includes('roku') ||
    ua.includes('crkey') || // Chromecast
    ua.includes('tv bro') ||
    ua.includes('jiopages')
  );
}

// Selector for all interactive focusable elements
const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([aria-hidden="true"])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex="0"]',
  '[role="button"]:not([aria-hidden="true"])',
  '.tv-nav-item',
].join(', ');

function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getFocusableElements(): HTMLElement[] {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter(isElementVisible);
}

// Directional angle & distance calculation for spatial navigation
type Direction = 'up' | 'down' | 'left' | 'right';

function findNextElement(currentEl: HTMLElement, direction: Direction): HTMLElement | null {
  const allElements = getFocusableElements();
  if (allElements.length === 0) return null;

  const currentRect = currentEl.getBoundingClientRect();
  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;

  let bestCandidate: HTMLElement | null = null;
  let minDistance = Infinity;

  for (const candidate of allElements) {
    if (candidate === currentEl) continue;

    const candRect = candidate.getBoundingClientRect();
    const candCenterX = candRect.left + candRect.width / 2;
    const candCenterY = candRect.top + candRect.height / 2;

    const dx = candCenterX - currentCenterX;
    const dy = candCenterY - currentCenterY;

    let isInDirection = false;
    let distance = Infinity;

    if (direction === 'down') {
      if (dy > 4) {
        isInDirection = true;
        // Prioritize vertical alignment over pure euclidean distance
        distance = Math.sqrt(dx * dx * 2 + dy * dy);
      }
    } else if (direction === 'up') {
      if (dy < -4) {
        isInDirection = true;
        distance = Math.sqrt(dx * dx * 2 + dy * dy);
      }
    } else if (direction === 'right') {
      if (dx > 4) {
        isInDirection = true;
        distance = Math.sqrt(dx * dx + dy * dy * 2);
      }
    } else if (direction === 'left') {
      if (dx < -4) {
        isInDirection = true;
        distance = Math.sqrt(dx * dx + dy * dy * 2);
      }
    }

    if (isInDirection && distance < minDistance) {
      minDistance = distance;
      bestCandidate = candidate;
    }
  }

  // If spatial candidate found, return it
  if (bestCandidate) return bestCandidate;

  // Fallback: sequential DOM order navigation
  const currentIndex = allElements.indexOf(currentEl);
  if (currentIndex === -1) return allElements[0] || null;

  if (direction === 'down' || direction === 'right') {
    return allElements[(currentIndex + 1) % allElements.length];
  } else {
    return allElements[(currentIndex - 1 + allElements.length) % allElements.length];
  }
}

let isInitialized = false;

export function initTvRemoteNavigation(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  // Add tv-mode class to body if Smart TV
  if (isSmartTv()) {
    document.body.classList.add('tv-mode');
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    const keyCode = e.keyCode || e.which;

    // TV Remote specific key codes:
    // 38 = Up, 40 = Down, 37 = Left, 39 = Right
    // 13 = Enter / OK
    // 27 = Escape, 10009 = Tizen Back, 461 = webOS Back, 8 = Backspace
    const isUp = key === 'ArrowUp' || keyCode === 38;
    const isDown = key === 'ArrowDown' || keyCode === 40;
    const isLeft = key === 'ArrowLeft' || keyCode === 37;
    const isRight = key === 'ArrowRight' || keyCode === 39;
    const isEnter = key === 'Enter' || keyCode === 13;
    const isBack = key === 'Escape' || keyCode === 27 || keyCode === 10009 || keyCode === 461;

    // 1. Back Button handler: close open modals or back to dashboard
    if (isBack) {
      // Find visible modal close buttons or cancel buttons
      const modalCloseBtn = document.querySelector<HTMLElement>('[data-modal-close], [aria-label="Close"], button.modal-close');
      if (modalCloseBtn && isElementVisible(modalCloseBtn)) {
        e.preventDefault();
        modalCloseBtn.click();
        return;
      }
      // If an input is focused, blur it
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    // 2. Navigation handling for directional keys
    if (isUp || isDown || isLeft || isRight) {
      const activeEl = document.activeElement as HTMLElement | null;

      // If typing in an input/textarea:
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        const inputEl = activeEl as HTMLInputElement;
        // Allow left/right for cursor movement inside input unless at extremities
        if (isLeft || isRight) {
          return;
        }
        // If ArrowDown / ArrowUp pressed inside input, move focus away from input
      }

      let direction: Direction = 'down';
      if (isUp) direction = 'up';
      if (isDown) direction = 'down';
      if (isLeft) direction = 'left';
      if (isRight) direction = 'right';

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      if (!activeEl || !focusables.includes(activeEl)) {
        // Focus the first visible interactive element
        const target = focusables[0];
        if (target) {
          e.preventDefault();
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
        return;
      }

      const nextEl = findNextElement(activeEl, direction);
      if (nextEl) {
        e.preventDefault();
        nextEl.focus();
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      return;
    }

    // 3. Enter/OK key handling on focused custom button elements
    if (isEnter) {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
        if (activeEl.getAttribute('role') === 'button' || activeEl.hasAttribute('tabindex')) {
          e.preventDefault();
          activeEl.click();
        }
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return () => {
    isInitialized = false;
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}
