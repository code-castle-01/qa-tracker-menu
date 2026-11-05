import { mkdir, copyFile, writeFile, readFile, readdir } from 'node:fs/promises';
await mkdir(new URL('../dist/locales/', import.meta.url), { recursive: true });
for (const locale of ['es', 'en']) {
  await copyFile(
    new URL(`../src/locales/${locale}.json`, import.meta.url),
    new URL(`../dist/locales/${locale}.json`, import.meta.url),
  );
}
await writeFile(new URL('../dist/styles.d.ts', import.meta.url), 'export {};\n');

// CSS is distributed through styles.css; declaration files must not reference
// the source-only CSS paths retained by TypeScript's declaration emitter.
const dist = new URL('../dist/', import.meta.url);
for (const file of await readdir(dist)) {
  if (!file.endsWith('.d.ts')) continue;
  const path = new URL(file, dist);
  const declaration = await readFile(path, 'utf8');
  await writeFile(path, declaration.replace(/^import ['"][^'"]+\.css['"];?\r?\n/gm, ''));
}
