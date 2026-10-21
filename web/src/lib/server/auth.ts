import { error } from '@sveltejs/kit';
import { isSuperuser } from './pocketbase.ts';

/** Returns the caller's token, or throws 401 unless it belongs to a PocketBase superuser. */
export async function requireSuperuser(request: Request): Promise<string> {
	const token = request.headers.get('authorization');
	if (!(await isSuperuser(token))) error(401, 'Superuser login required');
	return token!;
}
