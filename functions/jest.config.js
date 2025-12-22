module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    testPathIgnorePatterns: ['\\.integration\\.test\\.ts$'],
    transform: {
        '^.+\\.(ts|tsx)$': '<rootDir>/jest.esbuild.transformer.cjs',
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        './src/services/': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        },
        './src/connect/': {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    },
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
