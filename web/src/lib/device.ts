export type Device = 'tv' | 'default';

export const DEVICE_COOKIE = 'device';

// Browsers of Samsung (Tizen), LG (webOS/NetCast), Sony, Hisense (VIDAA), Philips,
// Android TV / Google TV, Fire TV, Chromecast, Roku and HbbTV sets
const TV_AGENT =
	/SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|HbbTV|VIDAA|Philips|GoogleTV|Android ?TV|AFT[A-Z]|CrKey|Roku|; TV;/i;

/** TV mode from an explicit choice (?tv=1 / ?tv=0, remembered in a cookie) or the user agent. */
export function detectDevice(userAgent: string, saved: string | undefined): Device {
	if (saved === 'tv' || saved === 'default') return saved;
	return TV_AGENT.test(userAgent) ? 'tv' : 'default';
}
