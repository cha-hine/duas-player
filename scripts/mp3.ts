// Joins MP3 files without re-encoding and measures them exactly, from their MPEG frames.
// Used to build one track per surah from verse-by-verse recordings: each verse's start is the
// sum of the durations of the frames before it.

const BITRATES: Record<string, number[]> = {
	// kbit/s by bitrate index, Layer III
	mpeg1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
	mpeg2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
};
const SAMPLE_RATES: Record<number, number[]> = {
	3: [44100, 48000, 32000], // MPEG 1
	2: [22050, 24000, 16000], // MPEG 2
	0: [11025, 12000, 8000] // MPEG 2.5
};

type Frame = { length: number; samples: number; sampleRate: number };

/** The Layer III frame starting at `i`, or null when the bytes there are not one. */
function frameAt(data: Uint8Array, i: number): Frame | null {
	if (i + 4 > data.length || data[i] !== 0xff || (data[i + 1] & 0xe0) !== 0xe0) return null;
	const version = (data[i + 1] >> 3) & 3;
	const layer = (data[i + 1] >> 1) & 3;
	const bitrateIndex = data[i + 2] >> 4;
	const rateIndex = (data[i + 2] >> 2) & 3;
	if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
	const sampleRate = SAMPLE_RATES[version][rateIndex];
	const bitrate = BITRATES[version === 3 ? 'mpeg1' : 'mpeg2'][bitrateIndex] * 1000;
	const padding = (data[i + 2] >> 1) & 1;
	const samples = version === 3 ? 1152 : 576;
	const length = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
	return { length, samples, sampleRate };
}

/** Skips the ID3v2 tag at the start, if any. */
function audioStart(data: Uint8Array): number {
	if (data[0] !== 0x49 || data[1] !== 0x44 || data[2] !== 0x33) return 0; // "ID3"
	const size = (data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9];
	const footer = data[5] & 0x10 ? 10 : 0;
	return 10 + size + footer;
}

/** A frame carrying a Xing/Info/VBRI header describes the whole file: dropped when joining. */
function isInfoFrame(data: Uint8Array, i: number, length: number): boolean {
	const text = new TextDecoder('latin1').decode(data.subarray(i, Math.min(i + length, data.length)));
	return text.includes('Xing') || text.includes('Info') || text.includes('VBRI');
}

export type Mp3Part = {
	frames: Uint8Array[];
	seconds: number;
	sampleRate: number;
	samplesPerFrame: number;
};

/** The audio frames of one MP3 file (tags and info frame left out) and its exact duration. */
export function readMp3(data: Uint8Array): Mp3Part {
	const frames: Uint8Array[] = [];
	let samples = 0;
	let sampleRate = 0;
	let samplesPerFrame = 0;
	let i = audioStart(data);
	let first = true;
	while (i < data.length) {
		const frame = frameAt(data, i);
		// Stray bytes and trailing tags (ID3v1 "TAG", APE) are not frames: step over them
		if (!frame) {
			i++;
			continue;
		}
		if (i + frame.length > data.length) break;
		if (first && isInfoFrame(data, i, frame.length)) {
			first = false;
			i += frame.length;
			continue;
		}
		first = false;
		frames.push(data.subarray(i, i + frame.length));
		samples += frame.samples;
		sampleRate = frame.sampleRate;
		samplesPerFrame = frame.samples;
		i += frame.length;
	}
	if (frames.length === 0) throw new Error('No MP3 audio frames found');
	return { frames, seconds: samples / sampleRate, sampleRate, samplesPerFrame };
}

/**
 * A Xing frame for the joined file: its frame count, size and seek table. Without it, players
 * guess the duration from the first frame's bitrate, which is wrong when the verses were not
 * all encoded alike (a 192 kbit/s basmala before 128 kbit/s verses: 2 h heard as 1 h 20).
 */
function xingFrame(first: Uint8Array, frames: Uint8Array[]): Uint8Array {
	const version = (first[1] >> 3) & 3;
	const rateIndex = (first[2] >> 2) & 3;
	const mono = first[3] >> 6 === 3;
	const sideInfo = version === 3 ? (mono ? 17 : 32) : mono ? 9 : 17;
	const needed = 4 + sideInfo + 120; // header, side info, "Xing" + flags + frames + bytes + TOC + quality

	// The smallest bitrate whose frame holds the tag; no CRC, no padding
	const header = Uint8Array.of(0xff, first[1] | 1, 0, first[3]);
	let length = 0;
	for (let index = 1; index < 15 && length < needed; index++) {
		header[2] = (index << 4) | (rateIndex << 2) | (first[2] & 1);
		length = frameAt(header, 0)!.length;
	}

	const total = length + frames.reduce((s, f) => s + f.length, 0);
	const out = new Uint8Array(length);
	const view = new DataView(out.buffer);
	out.set(header);
	let at = 4 + sideInfo;
	out.set(new TextEncoder().encode('Xing'), at);
	view.setUint32(at + 4, 0x0f); // frames, bytes, TOC and quality present
	view.setUint32(at + 8, frames.length);
	view.setUint32(at + 12, total);
	// TOC: where (in 1/256 of the file) each percent of the duration starts
	let offset = length;
	let frame = 0;
	for (let percent = 0; percent < 100; percent++) {
		const target = Math.floor((frames.length * percent) / 100);
		for (; frame < target; frame++) offset += frames[frame].length;
		out[at + 16 + percent] = Math.min(255, Math.floor((256 * offset) / total));
	}
	return out;
}

/** One MP3 made of the given parts in order; they must share their sample rate and layout. */
export function joinMp3(parts: Mp3Part[]): Uint8Array<ArrayBuffer> {
	const rate = parts[0].sampleRate;
	if (parts.some((p) => p.sampleRate !== rate || p.samplesPerFrame !== parts[0].samplesPerFrame)) {
		throw new Error('Parts have different sample rates');
	}
	const frames = parts.flatMap((p) => p.frames);
	const xing = xingFrame(frames[0], frames);
	const out = new Uint8Array(xing.length + frames.reduce((s, f) => s + f.length, 0));
	out.set(xing);
	let at = xing.length;
	for (const frame of frames) {
		out.set(frame, at);
		at += frame.length;
	}
	return out;
}
