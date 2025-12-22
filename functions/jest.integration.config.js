// Integration test config - runs ONLY *.integration.test.ts files
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.integration.test.ts'],
    testPathIgnorePatterns: [],  // Don't ignore integration tests
    transform: {
        '^.+\\.(ts|tsx)$': '<rootDir>/jest.esbuild.transformer.cjs',
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    testTimeout: 30000  // Integration tests may take longer
};
