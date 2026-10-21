import { json } from '@sveltejs/kit';
import { requireSuperuser } from '#lib/server/auth.ts';
import { ImportError, importFromDuasOrg } from '#lib/server/duas-org.ts';
import type { RequestHandler } from './$types';

/** Text of a duas.org page, for the admin text library. */
export const GET: RequestHandler = async ({ request, url }) => {
	await requireSuperuser(request);
	try {
		return json(await importFromDuasOrg(url.searchParams.get('url') ?? ''));
	} catch (e) {
		if (e instanceof ImportError) return json({ message: e.message }, { status: 400 });
		throw e;
	}
};
