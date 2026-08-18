import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 41820,
    host: '0.0.0.0',
    strictPort: true
  },
  preview: {
    port: 41820,
    host: '0.0.0.0',
    strictPort: true
  }
});
