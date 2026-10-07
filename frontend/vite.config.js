import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (command === 'build' && !(env.VITE_API_URL || env.VITE_API_BASE_URL)) throw new Error('Set VITE_API_URL or VITE_API_BASE_URL explicitly before building');
  return {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'subgroup-flattery-endurance.ngrok-free.dev'
    ]
  }
  };
})
