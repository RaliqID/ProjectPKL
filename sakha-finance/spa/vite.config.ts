import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// The SPA builds directly into the Laravel public/ directory, so Laravel serves
// it as a single-origin app (session cookies work without CORS complexity).
// In dev, Vite proxies /api to the Laravel dev server reading the .devport file.
import fs from 'node:fs'

/**
 * Laravel's public/ also holds its own files (favicon, .htaccess, ...), so the
 * build cannot use Vite's emptyOutDir. The side effect is that every build
 * leaves the previous hashed bundle behind, and public/assets slowly fills with
 * dead files. This plugin removes the stale hashed bundles before a build so
 * only the current one remains â€” without touching anything else in public/.
 */
function cleanStaleAssets() {
  return {
    name: 'sakha-clean-stale-assets',
    apply: 'build' as const,
    buildStart() {
      const assetsDir = path.resolve(__dirname, '../public/assets')
      if (!fs.existsSync(assetsDir)) return

      for (const file of fs.readdirSync(assetsDir)) {
        // Only ever delete files this build produces: hashed index-*.js/.css
        // plus the sourcemap that may accompany them.
        if (/^index-[\w-]+\.(js|css)(\.map)?$/.test(file)) {
          fs.rmSync(path.join(assetsDir, file), { force: true })
        }
      }
    },
  }
}

function apiTarget(): string {
  try {
    const port = fs.readFileSync(path.resolve(__dirname, '..', '.devport'), 'utf-8').trim()
    if (/^\d+$/.test(port)) return `http://127.0.0.1:${port}`
  } catch {
    // fall through
  }
  return 'http://127.0.0.1:8000'
}

export default defineConfig({
  plugins: [react(), cleanStaleAssets()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../public'),
    emptyOutDir: false,
    assetsDir: 'assets',
  },
  server: {
    // Bind IPv4 explicitly: bare `localhost` resolves to ::1 (IPv6) on Windows,
    // which port health checks on 127.0.0.1 cannot see. 127.0.0.1 is
    // deterministic and matches how the Laravel API is served.
    host: '127.0.0.1',
    port: 5173,
    // Fail loudly instead of silently drifting to 5174+; the launcher and the
    // e2e tests both expect exactly 5173.
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget(),
        changeOrigin: true,
      },
    },
  },
})
