// Media worker: processes uploaded audio and video with ffmpeg (Phase 3).
// For now it only checks that PocketBase is reachable.

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const RETRY_MS = 5000;

async function waitForPocketBase(): Promise<void> {
	for (;;) {
		try {
			const res = await fetch(`${PB_URL}/api/health`);
			if (res.ok) return;
		} catch {
			// PocketBase not up yet
		}
		console.log(`[worker] waiting for PocketBase at ${PB_URL}...`);
		await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
	}
}

await waitForPocketBase();
console.log(`[worker] connected to PocketBase at ${PB_URL}`);

// Keep the process alive until real jobs are added.
setInterval(() => {}, 1 << 30);
