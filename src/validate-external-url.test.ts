import { validateExternalUrl } from './validate-external-url';

const origin = 'https://www.qa-tracker.online';

it.each([
  [origin, `${origin}/`],
  [`  ${origin}/uat/example?tab=1#evidence  `, `${origin}/uat/example?tab=1#evidence`],
  ['https://WWW.QA-TRACKER.ONLINE:443/uat/example', `${origin}/uat/example`],
])('accepts and normalizes %s', (value, expected) => {
  expect(validateExternalUrl(value, origin)).toBe(expected);
});

it.each([
  '',
  '/uat/example',
  '//www.qa-tracker.online/uat/example',
  'http://www.qa-tracker.online/uat/example',
  'https://qa-tracker.online/',
  'https://other.qa-tracker.online/',
  'https://www.qa-tracker.online.attacker.test/',
  'https://attacker.test/?next=https://www.qa-tracker.online',
  'https://www.qa-tracker.online@attacker.test/',
  'https://user@www.qa-tracker.online/',
  'https://user:password@www.qa-tracker.online/',
  'https://www.qa-tracker.online:444/',
  'https://www.qa-tracker.online./',
  'javascript:alert(1)',
  'data:text/html,<h1>QA</h1>',
  'blob:https://www.qa-tracker.online/example',
])('rejects %s', value => {
  expect(validateExternalUrl(value, origin)).toBeNull();
});

it('uses the configured origin, not a hard-coded platform', () => {
  expect(validateExternalUrl('https://qa.example.test/check', 'https://qa.example.test')).toBe(
    'https://qa.example.test/check',
  );
  expect(validateExternalUrl(origin, 'https://qa.example.test')).toBeNull();
});
