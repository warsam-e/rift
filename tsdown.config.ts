import { defineConfig } from 'tsdown';

export default defineConfig({
	dts: false,
	minify: true,
	entry: ['./lib/index.ts'],
	sourcemap: true,
	external: () => true,
});
