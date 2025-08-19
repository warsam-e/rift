import { defineConfig } from 'tsdown';

export default defineConfig({
	dts: {
		sourcemap: true,
	},
	minify: true,
	entry: ['./lib/index.ts'],
	sourcemap: true,
	external: () => true,
});
