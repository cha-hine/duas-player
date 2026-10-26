// In-memory cache for the public reads of the pages. A value older than its lifetime is still
// served while a fresh one is fetched in the background, so a visitor only waits for PocketBase
// the very first time a page is asked for after a restart.

type Entry = { at: number; value?: unknown; pending?: Promise<unknown> };

const entries = new Map<string, Entry>();
/** Oldest entries are dropped beyond this (one per category, item, reciter, surah...). */
const MAX_ENTRIES = 2000;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function cached<T>(key: string, load: () => Promise<T>, ttl = DEFAULT_TTL_MS): Promise<T> {
	const entry = entries.get(key);
	if (entry && 'value' in entry) {
		if (Date.now() - entry.at > ttl && !entry.pending) refresh(key, entry, load);
		return Promise.resolve(entry.value as T);
	}
	if (entry?.pending) return entry.pending as Promise<T>;
	const fresh: Entry = { at: 0 };
	entries.set(key, fresh);
	return refresh(key, fresh, load).catch((e) => {
		entries.delete(key);
		throw e;
	});
}

function refresh<T>(key: string, entry: Entry, load: () => Promise<T>): Promise<T> {
	const pending = load().then(
		(value) => {
			entries.delete(key); // re-inserted last, so the oldest come first when trimming
			entries.set(key, { at: Date.now(), value });
			for (const old of entries.keys()) {
				if (entries.size <= MAX_ENTRIES) break;
				entries.delete(old);
			}
			return value;
		},
		(e) => {
			// Keep serving the old value if there is one; the next visit tries again
			delete entry.pending;
			throw e;
		}
	);
	entry.pending = pending;
	pending.catch(() => {});
	return pending;
}
