import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiUrl = env.VITE_API_URL || 'http://localhost:8000';
    let apiOrigin = "'self'";
    if (!apiUrl.startsWith('/')) {
        const parsedApiUrl = new URL(apiUrl);
        if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
            throw new Error('VITE_API_URL deve usar HTTP(S) ou um caminho relativo');
        }
        apiOrigin = parsedApiUrl.origin;
    }
    const scriptSources = mode === 'development' ? "'self' 'unsafe-inline'" : "'self'";
    const securityHeaders = {
        'Content-Security-Policy': `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; connect-src 'self' ${apiOrigin}; img-src 'self' data:`,
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
    };

    return {
        plugins: [react(), tailwindcss()],
        server: {
            port: 3000,
            open: true,
            headers: securityHeaders,
            proxy: {
                '/api': {
                    target: apiUrl,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        preview: {
            headers: securityHeaders,
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
