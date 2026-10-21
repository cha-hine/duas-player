// Remote-control navigation for TV browsers: the arrow keys move the focus to the nearest
// focusable element in that direction; OK (Enter) activates it as usual; Back goes back.

export type Direction = 'up' | 'down' | 'left' | 'right';

const KEYS: Record<string, Direction> = {
	ArrowUp: 'up',
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right'
};

// Back button: Escape/Backspace on most remotes, 10009 on Samsung (Tizen), 461 on LG (webOS)
const BACK_KEYS = new Set(['Escape', 'GoBack', 'BrowserBack']);
const BACK_CODES = new Set([10009, 461]);

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, video[controls], audio[controls], [tabindex]:not([tabindex="-1"])';

type Rect = { left: number; right: number; top: number; bottom: number };

function isVisible(el: HTMLElement): boolean {
	if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
	const style = getComputedStyle(el);
	if (style.visibility === 'hidden' || style.display === 'none') return false;
	const r = el.getBoundingClientRect();
	// Elements parked above the page (like the skip link) are not reachable with the remote
	return r.width > 0 && r.height > 0 && r.bottom + window.scrollY > 0;
}

/**
 * Distance from `from` to `to` when moving in `dir`, or Infinity when `to` is not in that
 * direction. Being well aligned on the other axis counts more than being close.
 */
export function distance(from: Rect, to: Rect, dir: Direction): number {
	const SLACK = 2;
	let main: number;
	let cross: number;
	if (dir === 'right' || dir === 'left') {
		main = dir === 'right' ? to.left - from.right : from.left - to.right;
		const overlap = Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top);
		cross = overlap > 0 ? 0 : Math.abs((from.top + from.bottom) / 2 - (to.top + to.bottom) / 2);
	} else {
		main = dir === 'down' ? to.top - from.bottom : from.top - to.bottom;
		const overlap = Math.min(from.right, to.right) - Math.max(from.left, to.left);
		cross = overlap > 0 ? 0 : Math.abs((from.left + from.right) / 2 - (to.left + to.right) / 2);
	}
	if (main < -SLACK) return Infinity;
	return Math.max(main, 0) + cross * 3;
}

/** The focusable element to move to from `current` in `dir`, if any. */
export function nextFocus(
	current: HTMLElement,
	dir: Direction,
	root: ParentNode = document
): HTMLElement | null {
	const from = current.getBoundingClientRect();
	let best: HTMLElement | null = null;
	let bestScore = Infinity;
	for (const el of root.querySelectorAll<HTMLElement>(FOCUSABLE)) {
		if (el === current || current.contains(el) || el.contains(current) || !isVisible(el)) continue;
		const score = distance(from, el.getBoundingClientRect(), dir);
		if (score < bestScore) {
			bestScore = score;
			best = el;
		}
	}
	return best;
}

/** Keys the focused control needs for itself (moving in a text field, seeking in a player). */
function keepsKey(el: Element | null, dir: Direction): boolean {
	if (!el) return false;
	const horizontal = dir === 'left' || dir === 'right';
	if (el instanceof HTMLTextAreaElement) return true;
	if (el instanceof HTMLSelectElement) return !horizontal;
	if (el instanceof HTMLInputElement) {
		return el.type === 'range' ? horizontal : horizontal && el.value.length > 0;
	}
	if (el instanceof HTMLMediaElement) return horizontal;
	return false;
}

/** First focusable element of the page's main content. */
export function focusMain(): void {
	const main = document.getElementById('main');
	if (!main) return;
	const first = [...main.querySelectorAll<HTMLElement>(FOCUSABLE)].find(isVisible);
	first?.focus({ preventScroll: true });
}

export function handleKey(event: KeyboardEvent): void {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

	const active = document.activeElement as HTMLElement | null;
	if (BACK_KEYS.has(event.key) || BACK_CODES.has(event.keyCode)) {
		if (active instanceof HTMLInputElement && event.key === 'Escape' && active.value) return;
		if (history.length > 1) {
			event.preventDefault();
			history.back();
		}
		return;
	}

	const dir = KEYS[event.key];
	if (!dir || keepsKey(active, dir)) return;

	event.preventDefault();
	if (!active || active === document.body) {
		focusMain();
		return;
	}
	const next = nextFocus(active, dir);
	if (next) {
		next.focus({ preventScroll: true });
		next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
	} else if (dir === 'up') {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}
