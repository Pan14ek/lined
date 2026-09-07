import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  framework: '@storybook/react-vite',

  stories: ['../src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'],

  addons: ['@storybook/addon-a11y', '@storybook/addon-mcp'],

  features: {
    componentsManifest: true,
  },

  staticDirs: ['../public'],

  async viteFinal(viteConfig) {
    const { mergeConfig } = await import('vite');
    const tailwindcss = (await import('@tailwindcss/vite')).default;

    return mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(dirname, '../src'),
        },
      },
    });
  },
};

export default config;
