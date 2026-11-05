import es from './locales/es.json';
import en from './locales/en.json';
import type { QaText } from './types';
export { es, en };
export type QaLocale = 'es' | 'en';

/** Unknown keys are returned unchanged, matching common i18n adapters. */
export function createQaText(locale: string = 'es'): QaText {
  const dictionary = locale.toLowerCase().split('-')[0] === 'en' ? en : es;
  return key => {
    let value: unknown = dictionary;
    for (const segment of key.split('.')) {
      if (typeof value !== 'object' || value === null || !Object.hasOwn(value, segment)) return key;
      value = (value as Record<string, unknown>)[segment];
    }
    return typeof value === 'string' ? value : key;
  };
}
