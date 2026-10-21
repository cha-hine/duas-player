import { PB_URL } from '$app/env/private';

/** PocketBase as seen from this server: the internal Docker address, so traffic skips Cloudflare. */
export { PB_URL };

/** True when `token` belongs to a PocketBase superuser. */
export async function isSuperuser(token: string | null): Promise<boolean> {
	if (!token) return false;
	const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-refresh`, {
		method: 'POST',
		headers: { Authorization: token }
	});
	return res.ok;
}
