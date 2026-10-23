import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3048,
    strictPort: true
  },
  test: {
    include: ['src/**/*.test.js'],
    env: {
      // Tests never touch a real database
      DATABASE_URL: '',
      SESSION_SECRET: 'test-session-secret',
      AUTH_SALT: 'test-auth-salt'
    }
  }
});
