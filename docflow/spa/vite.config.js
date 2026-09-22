import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// The SPA builds directly into the Laravel public/ directory, so Laravel serves
// it as a single-origin app (session cookies work without CORS complexity).
// In dev, Vite proxies /api to the Laravel dev server reading the .devport file.
import fs from 'node:fs';
function apiTarget() {
    try {
        var port = fs.readFileSync(path.resolve(__dirname, '..', '.devport'), 'utf-8').trim();
        if (/^\d+$/.test(port))
            return "http://127.0.0.1:".concat(port);
    }
    catch (_a) {
        // fall through
    }
    return 'http://127.0.0.1:8000';
}
export default defineConfig({
    plugins: [react()],
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
        port: 5173,
        proxy: {
            '/api': {
                target: apiTarget(),
                changeOrigin: true,
            },
        },
    },
});
