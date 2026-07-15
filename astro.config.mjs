// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// Static output: the whole site is prerendered to `dist/` at build time.
// Sensor JSON in `src/data/` is downsampled at build time (see src/lib/),
// so the client never parses megabytes of raw samples.
export default defineConfig({
  output: 'static',
  site: 'https://vishk.dev',
  trailingSlash: 'ignore',
});
