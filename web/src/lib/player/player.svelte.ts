// The Sakina audio player: one queue for the whole visit, kept playing across page changes.
// Its state is changed only in the browser (user actions), never during server rendering.
import type { Line, MediaItem } from '#lib/media.ts';

export type Repeat = 'off' | 'all' | 'one';

export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

/** A previous-track press within this many seconds of the start goes to the previous track. */
const RESTART_THRESHOLD = 3;

class Player {
	queue = $state<MediaItem[]>([]);
	index = $state(0);
	/** Bound to the <audio> element in PlayerHost. */
	paused = $state(true);
	currentTime = $state(0);
	duration = $state(0);
	rate = $state(1);
	repeat = $state<Repeat>('off');
	shuffle = $state(false);
	/** Synced lines and loudness envelope of the current track, loaded when it starts. */
	lines = $state<Line[]>([]);
	energy = $state<number[]>([]);

	/** A passage being repeated (memorisation): played `remaining` more times, Infinity = loop. */
	loop = $state<{ start: number; end: number; remaining: number; total: number } | null>(null);

	current = $derived(this.queue[this.index] ?? null);
	hasNext = $derived(this.repeat === 'all' || this.shuffle || this.index < this.queue.length - 1);

	#audio: HTMLAudioElement | null = null;
	#pendingSeek = 0;

	attach(audio: HTMLAudioElement | null) {
		this.#audio = audio;
	}

	/** Exact position for animations (the bound currentTime updates only a few times per second). */
	get time(): number {
		return this.#audio?.currentTime ?? this.currentTime;
	}

	/** Plays `items` (audio only) as the queue, starting with `start`, optionally `startAt` seconds in. */
	playItems(items: MediaItem[], start?: MediaItem, startAt = 0) {
		const playable = items.filter((i) => i.kind === 'audio' && i.audioUrl);
		if (playable.length === 0) return;
		const at = start ? playable.findIndex((i) => i.id === start.id) : 0;
		this.queue = playable;
		this.#go(Math.max(0, at));
		if (startAt > 0) this.#pendingSeek = startAt;
	}

	/** Called once the new track's metadata is loaded: applies a requested start position. */
	loaded() {
		if (this.#pendingSeek > 0) this.seek(this.#pendingSeek);
		this.#pendingSeek = 0;
		// Loading a new source pauses the element: resume when the queue is meant to be playing
		if (!this.paused && this.#audio?.paused) this.#audio.play().catch(() => (this.paused = true));
	}

	/** Starts the given track at `seconds`, or just seeks when it is already playing. */
	playFrom(items: MediaItem[], item: MediaItem, seconds: number) {
		if (this.isCurrent(item)) {
			this.seek(seconds);
			this.paused = false;
		} else {
			this.playItems(items, item, seconds);
		}
	}

	isCurrent(item: Pick<MediaItem, 'id'>) {
		return this.current?.id === item.id;
	}

	toggle() {
		this.paused = !this.paused;
	}

	seek(seconds: number) {
		const to = Math.max(0, Math.min(this.duration || seconds, seconds));
		if (this.#audio) this.#audio.currentTime = to;
		this.currentTime = to;
	}

	skip(seconds: number) {
		this.seek(this.time + seconds);
	}

	next() {
		if (this.queue.length === 0) return;
		if (this.shuffle && this.queue.length > 1) {
			let i = this.index;
			while (i === this.index) i = Math.floor(Math.random() * this.queue.length);
			this.#go(i);
		} else if (this.index < this.queue.length - 1) {
			this.#go(this.index + 1);
		} else if (this.repeat === 'all') {
			this.#go(0);
		} else {
			this.paused = true;
		}
	}

	previous() {
		if (this.time > RESTART_THRESHOLD || this.index === 0) this.seek(0);
		else this.#go(this.index - 1);
	}

	/** Called when a track reaches its end. */
	ended() {
		if (this.repeat === 'one') {
			this.seek(0);
			this.paused = false;
		} else {
			this.next();
		}
	}

	/** Plays [start, end] of `item` `times` times (Infinity: until stopped). */
	repeatPassage(items: MediaItem[], item: MediaItem, start: number, end: number, times: number) {
		this.playFrom(items, item, start);
		this.loop = { start, end, remaining: times, total: times };
	}

	/** Called every frame while a passage repeats: jumps back, or lets the recitation go on. */
	checkLoop() {
		const loop = this.loop;
		if (!loop || this.time < loop.end - 0.05) return;
		if (loop.remaining > 1) {
			this.loop = { ...loop, remaining: loop.remaining - 1 };
			this.seek(loop.start);
		} else {
			this.loop = null;
			this.paused = true;
		}
	}

	cycleRepeat() {
		this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off';
	}

	cycleSpeed() {
		const i = SPEEDS.indexOf(this.rate as (typeof SPEEDS)[number]);
		this.rate = SPEEDS[(i + 1) % SPEEDS.length];
	}

	stop() {
		this.paused = true;
		this.queue = [];
		this.index = 0;
	}

	#go(index: number) {
		this.index = index;
		this.loop = null;
		const item = this.queue[index];
		this.lines = item?.lines ?? [];
		this.energy = [];
		this.currentTime = 0;
		// Same track chosen again: the source does not change, so rewind it explicitly
		if (this.#audio && item?.audioUrl && this.#audio.src === item.audioUrl)
			this.#audio.currentTime = 0;
		this.paused = false;
	}
}

export const player = new Player();
