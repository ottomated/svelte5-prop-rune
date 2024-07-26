import adapter from '@sveltejs/adapter-auto';
import preprocess from './preprocess.js';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [preprocess(), vitePreprocess()],
	kit: { adapter: adapter() },
};

export default config;
