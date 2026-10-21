// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			theme: import('#lib/theme.ts').Theme;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
