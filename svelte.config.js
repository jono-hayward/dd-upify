/** @type {import('@sveltejs/kit').Config} */

import adapter from '@sveltejs/adapter-netlify';

export default {
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter(),
		ssr: false,
		vite: {
			ssr: false,
			optimizeDeps: {
				include: ["highlight.js/lib/core"]
			}
		}
	}
};
