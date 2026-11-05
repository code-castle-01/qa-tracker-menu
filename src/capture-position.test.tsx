import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CaptureButton } from './capture-button';

const storageKey = 'qa-position-test';
const capture = vi.fn(() => new Promise<never>(() => {}));
const props = {
  positionStorageKey: storageKey,
  capture,
  getContext: () => ({ path: '/', title: 'Test' }),
  text: (key: string) => key,
  notify: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  capture.mockClear();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return {
      left: Number.parseFloat(this.style.left) || 100,
      top: Number.parseFloat(this.style.top) || 100,
      width: 40,
      height: 40,
    } as DOMRect;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(extra = {}) {
  const view = render(<CaptureButton {...props} {...extra} />);
  const button = screen.getByRole('button', { name: 'capture' });
  return { ...view, button, host: button.parentElement! };
}
function pointer(
  button: HTMLElement,
  type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
  x: number,
  y: number,
) {
  fireEvent[type](button, { pointerId: 1, button: 0, clientX: x, clientY: y });
}

it('drags without jumping or capturing and restores the saved position on remount', () => {
  const { button, host, unmount } = setup();
  pointer(button, 'pointerDown', 110, 110);
  pointer(button, 'pointerMove', 210, 220);
  pointer(button, 'pointerUp', 210, 220);
  fireEvent.click(button);
  expect(capture).not.toHaveBeenCalled();
  expect(host.style.left).toBe('200px');
  expect(host.style.top).toBe('210px');
  expect(host.style.right).toBe('auto');
  expect(host.style.bottom).toBe('auto');
  expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ left: 200, top: 210 });
  unmount();
  expect(setup().host.style.left).toBe('200px');
});

it('keeps a movement below 5px as a capture click', () => {
  const { button } = setup();
  pointer(button, 'pointerDown', 110, 110);
  pointer(button, 'pointerMove', 113, 110);
  pointer(button, 'pointerUp', 113, 110);
  fireEvent.click(button);
  expect(capture).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(storageKey)).toBeNull();
});

it('clamps dragging and resizing to the viewport', () => {
  const { button, host } = setup();
  pointer(button, 'pointerDown', 110, 110);
  pointer(button, 'pointerMove', 10000, 10000);
  pointer(button, 'pointerUp', 10000, 10000);
  expect(host.style.left).toBe(`${window.innerWidth - 40}px`);
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(300);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(200);
  fireEvent(window, new Event('resize'));
  expect(host.style.left).toBe('260px');
  expect(host.style.top).toBe('160px');
});

it('moves using arrows and keeps keyboard capture available', () => {
  const { button, host } = setup();
  fireEvent.keyDown(button, { key: 'ArrowRight' });
  expect(host.style.left).toBe('110px');
  expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ left: 110, top: 100 });
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.click(button, { detail: 0 });
  expect(capture).toHaveBeenCalledTimes(1);
});

it('cancels a drag without persisting or capturing', () => {
  const { button, host } = setup();
  pointer(button, 'pointerDown', 110, 110);
  pointer(button, 'pointerMove', 210, 220);
  pointer(button, 'pointerCancel', 210, 220);
  fireEvent.click(button);
  expect(host.style.left).toBe('100px');
  expect(localStorage.getItem(storageKey)).toBeNull();
  expect(capture).not.toHaveBeenCalled();
});

it.each(['broken-json', '{"left":"10","top":20}', 'null'])('ignores invalid storage: %s', value => {
  localStorage.setItem(storageKey, value);
  const { host } = setup();
  expect(host.style.bottom).toBe('24px');
  expect(host.style.right).toBe('24px');
});

it('continues in memory when storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const { button, host } = setup();
  fireEvent.keyDown(button, { key: 'ArrowRight' });
  expect(host.style.left).toBe('110px');
});

it('honors explicit positioning when dragging is disabled', () => {
  localStorage.setItem(storageKey, JSON.stringify({ left: 200, top: 200 }));
  const { button, host } = setup({ draggable: false, position: 'top-left', offset: 30 });
  fireEvent.keyDown(button, { key: 'ArrowRight' });
  expect(host.style.left).toBe('30px');
  expect(host.style.top).toBe('30px');
});
