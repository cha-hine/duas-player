import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { DEVICE_COOKIE, detectDevice } from '#lib/device.ts';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { THEME_COOKIE, parseTheme } from '#lib/theme.ts';

const YEAR = 60 * 60 * 24 * 365;

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

// Render the saved theme on the server so the page never flashes the wrong colours.
const handleTheme: Handle = ({ event, resolve }) => {
	const theme = parseTheme(event.cookies.get(THEME_COOKIE));
	event.locals.theme = theme;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%sakina.theme%', theme)
	});
};

// TV mode: large text and remote-control navigation. ?tv=1 or ?tv=0 forces it and is remembered.
const handleDevice: Handle = ({ event, resolve }) => {
	const forced = event.url.searchParams.get('tv');
	if (forced === '1' || forced === '0') {
		event.cookies.set(DEVICE_COOKIE, forced === '1' ? 'tv' : 'default', {
			path: '/',
			maxAge: YEAR,
			httpOnly: false
		});
	}
	const saved =
		forced === '1' ? 'tv' : forced === '0' ? 'default' : event.cookies.get(DEVICE_COOKIE);
	const device = detectDevice(event.request.headers.get('user-agent') ?? '', saved);
	event.locals.device = device;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%sakina.device%', device)
	});
};

export const handle: Handle = sequence(handleTheme, handleDevice, handleParaglide);
