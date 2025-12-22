module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['.'],
                    extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.json'],
                    alias: {
                        '@': '.',
                        '@/components': './components',
                        '@/context': './context',
                        '@/services': './services',
                        '@/utils': './utils',
                        '@/theme': './theme',
                    },
                },
            ],
        ],
    };
};
