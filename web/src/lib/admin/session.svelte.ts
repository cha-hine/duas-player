import { pb } from './pb.ts';

// Superuser login state for the admin pages (browser only).
class Session {
	loggedIn = $state(false);
	email = $state('');

	constructor() {
		this.#refresh();
		pb.authStore.onChange(() => this.#refresh());
	}

	#refresh() {
		this.loggedIn = pb.authStore.isValid && pb.authStore.isSuperuser;
		this.email = pb.authStore.record?.email ?? '';
	}

	logout() {
		pb.authStore.clear();
	}
}

export const session = new Session();
