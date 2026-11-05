import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        storage: fileURLToPath(new URL('./src/storage.ts', import.meta.url)),
        locales: fileURLToPath(new URL('./src/locales.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: id => /^(react|react-dom|antd|@ant-design\/icons)(\/|$)/.test(id),
    },
  },
});
