import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [svelte({ hot: !process.env.VITEST })],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    test: {
        environment: 'happy-dom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{js,svelte}'],
            exclude: [
                'src/background/**',
                'node_modules/**',
                'dist/**',
                '**/*.config.js'
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 60,
                statements: 60
            }
        },
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        exclude: ['tests/e2e/**'],
        testTimeout: 10000
    }
});
