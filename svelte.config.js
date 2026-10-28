import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-netlify';

const isCiBuild =
	process.env.NETLIFY === 'true' || process.env.GITHUB_ACTIONS === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Node serverless Functions (not Deno Edge) — required for argon2 / Node APIs
			edge: false,
			split: false
		}),
		experimental: {
			// Not used in repo; adds build graph work and RSS during CI.
			remoteFunctions: !isCiBuild
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	preprocess: [mdsvex()],
	extensions: ['.svelte', '.svx']
};

export default config;
