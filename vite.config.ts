import { defineConfig } from 'vitest/config'

export default defineConfig ({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        globals: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            reportsDirectory: 'coverage'
        }
    }
})