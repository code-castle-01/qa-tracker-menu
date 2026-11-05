import { createQaText, es, en } from './locales';
it('translates nested keys without requiring i18next', () => {
  expect(createQaText()('brand.title')).toBe(es.brand.title);
  expect(createQaText('en-US')('capture')).toBe(en.capture);
  expect(createQaText('fr')('capture')).toBe(es.capture);
  expect(createQaText()('missing.key')).toBe('missing.key');
  expect(createQaText()('brand')).toBe('brand');
  expect(createQaText()('__proto__')).toBe('__proto__');
});
