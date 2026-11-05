import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExternalQaPanel } from './external-qa-panel';

const origin = 'https://www.qa-tracker.online';
const validUrl = `${origin}/uat/test-only?tab=1#evidence`;
const storageKey = 'test.qa-url';
const props = { allowedOrigin: origin, storageKey, text: (key: string) => key };
const input = () => screen.getByRole('textbox', { name: 'external.label' });
function paste(value: string) {
  fireEvent.paste(input(), { clipboardData: { getData: () => value } });
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('starts empty and loads a pasted valid URL with the intended frame restrictions', () => {
  render(<ExternalQaPanel {...props} />);
  expect(screen.getByText('external.empty')).toBeInTheDocument();
  expect(document.querySelector('iframe')).toBeNull();
  paste(validUrl);
  const frame = screen.getByTitle('external.frameTitle');
  expect(frame).toHaveAttribute('src', validUrl);
  expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
  expect(sessionStorage.getItem(storageKey)).toBe(validUrl);
  const link = screen.getByRole('link', { name: 'external.open' });
  expect(link).toHaveAttribute('href', validUrl);
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(
    screen.getByRole('button', { name: 'external.load' }).closest('.qa-url-actions'),
  ).toContainElement(link);
});

it('clears the field, frame and stored URL on invalid paste', () => {
  render(<ExternalQaPanel {...props} />);
  paste(validUrl);
  paste('https://www.qa-tracker.online.attacker.test/');
  expect(input()).toHaveValue('');
  expect(input()).toHaveAttribute('aria-invalid', 'true');
  expect(document.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent('external.invalidUrl');
  expect(sessionStorage.getItem(storageKey)).toBeNull();
});

it('allows partial typing and validates on blur or form submission', () => {
  render(<ExternalQaPanel {...props} />);
  fireEvent.change(input(), { target: { value: 'https://' } });
  expect(input()).toHaveValue('https://');
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.blur(input());
  expect(input()).toHaveValue('');
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.change(input(), { target: { value: validUrl } });
  fireEvent.submit(input().closest('form')!);
  expect(screen.getByTitle('external.frameTitle')).toHaveAttribute('src', validUrl);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('does not erase the error through blur followed by submit', () => {
  render(<ExternalQaPanel {...props} />);
  fireEvent.change(input(), { target: { value: 'https://other.test' } });
  const button = screen.getByRole('button', { name: 'external.load' });
  fireEvent.blur(input(), { relatedTarget: button });
  fireEvent.click(button);
  expect(input()).toHaveValue('');
  expect(screen.getByRole('alert')).toBeInTheDocument();
});

it('clears voluntarily without showing an error', () => {
  render(<ExternalQaPanel {...props} />);
  paste(validUrl);
  fireEvent.change(input(), { target: { value: '' } });
  expect(document.querySelector('iframe')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(sessionStorage.getItem(storageKey)).toBeNull();
});

it('restores the valid link when returning to the scene', () => {
  const view = render(<ExternalQaPanel {...props} />);
  paste(validUrl);
  view.unmount();
  render(<ExternalQaPanel {...props} />);
  expect(input()).toHaveValue(validUrl);
  expect(screen.getByTitle('external.frameTitle')).toHaveAttribute('src', validUrl);
});

it('revalidates and removes a tampered stored URL before creating an iframe', () => {
  sessionStorage.setItem(storageKey, 'https://attacker.test');
  render(<ExternalQaPanel {...props} />);
  expect(document.querySelector('iframe')).toBeNull();
  expect(input()).toHaveValue('');
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});

it('continues in memory when browser storage throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('disabled');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('disabled');
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('disabled');
  });
  render(<ExternalQaPanel {...props} />);
  paste(validUrl);
  expect(screen.getByTitle('external.frameTitle')).toHaveAttribute('src', validUrl);
});

it('keeps the iframe node on rerender and repeated validation of the same URL', async () => {
  const view = render(<ExternalQaPanel {...props} />);
  paste(validUrl);
  const frame = screen.getByTitle('external.frameTitle');
  const mutations = vi.fn();
  const observer = new MutationObserver(mutations);
  observer.observe(frame, { attributes: true, attributeFilter: ['src'] });
  view.rerender(<ExternalQaPanel {...props} text={key => key} />);
  fireEvent.blur(input());
  await waitFor(() => expect(screen.getByTitle('external.frameTitle')).toBe(frame));
  expect(mutations).not.toHaveBeenCalled();
  observer.disconnect();
});
