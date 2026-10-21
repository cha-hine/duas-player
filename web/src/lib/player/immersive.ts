import { pushState } from '$app/navigation';

// The immersive view is a history entry (shallow routing): the browser, phone or TV
// Back button closes it, like any page.

export function openImmersive() {
	pushState('', { immersive: true });
}

export function closeImmersive() {
	history.back();
}
