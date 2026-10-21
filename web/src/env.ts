import { defineEnvVars } from '@sveltejs/kit/env';

const withDefault = (fallback: string) => (value: string | undefined) => value || fallback;

export const variables = defineEnvVars({
	PB_URL: {
		description: 'PocketBase as reached from this server (internal Docker address in production).',
		schema: withDefault('http://127.0.0.1:8090')
	},
	PUBLIC_PB_URL: {
		public: true,
		description: 'PocketBase as reached from browsers, e.g. https://sakina-api.toophan.net',
		schema: withDefault('http://127.0.0.1:8090')
	},
	UPLOAD_DIR: {
		description: 'Folder for chunks of uploads in progress. Defaults to the system temp folder.',
		schema: (value) => value || undefined
	}
});
