/// <reference path="../pb_data/types.d.ts" />

// How many playable recitations each surah has, per reciter, counted by the database. The Quran
// page listed every track to count them, ~75 KB each with its synced lines: 37 s for 5,000
// tracks. "Playable" and "public" are the same as the site's READY filter and the tracks list rule.

migrate(
	(app) => {
		const counts = new Collection({
			type: 'view',
			name: 'quran_recitation_counts',
			listRule: '',
			viewRule: '',
			viewQuery: `
				SELECT (tr.text || '-' || tr.reciter) AS id, tr.text AS text, tr.reciter AS reciter, COUNT(*) AS n
				FROM tracks tr
				JOIN texts tx ON tx.id = tr.text
				WHERE tr.published = 1
					AND tx.slug LIKE 'sourate-%'
					AND (tr.status = 'ready'
						OR (tr.status != 'error' AND tr.submitted_by IN ('EveryAyah', 'Le-Coran.com')))
				GROUP BY tr.text, tr.reciter
			`
		});
		app.save(counts);
	},
	(app) => {
		app.delete(app.findCollectionByNameOrId('quran_recitation_counts'));
	}
);
