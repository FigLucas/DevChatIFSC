import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiUrl = env.VITE_API_URL || 'http://localhost:8000';

    return {
        plugins: [
            react(),
            tailwindcss(),
        ],
        server: {
            port: 3000,
            open: true,
            proxy: {
                '/api': {
                    target: apiUrl,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './src/setupTests.ts',
            css: true,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
            },
        },
    };
});