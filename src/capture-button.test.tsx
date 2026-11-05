import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CaptureButton } from './capture-button';
import { saveEvidence } from './storage';
import type { CaptureImage } from './types';

vi.mock('./storage', () => ({ DEFAULT_DATABASE: 'test', saveEvidence: vi.fn() }));
const image: CaptureImage = {
  blob: new Blob(),
  width: 10,
  height: 10,
  createdAt: '2026-10-16T00:00:00Z',
};
const text = (key: string) => key;

it('blocks repeated clicks and saves the captured context', async () => {
  let finish!: (image: CaptureImage) => void;
  const capture = vi.fn(
    () =>
      new Promise<CaptureImage>(resolve => {
        finish = resolve;
      }),
  );
  const notify = vi.fn();
  render(
    <CaptureButton
      capture={capture}
      getContext={() => ({ path: '/a', title: 'A' })}
      text={text}
      notify={notify}
    />,
  );
  const button = screen.getByRole('button', { name: 'capture' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(capture).toHaveBeenCalledTimes(1);
  finish(image);
  await waitFor(() => expect(notify).toHaveBeenCalledWith('success', 'saved'));
  expect(saveEvidence).toHaveBeenCalledWith(
    'test',
    expect.objectContaining({ context: { path: '/a', title: 'A' } }),
  );
});

it('discards a screenshot when the route changes', async () => {
  vi.mocked(saveEvidence).mockClear();
  let finish!: (image: CaptureImage) => void;
  let path = '/a';
  const notify = vi.fn();
  render(
    <CaptureButton
      capture={() =>
        new Promise(resolve => {
          finish = resolve;
        })
      }
      getContext={() => ({ path, title: 'A' })}
      text={text}
      notify={notify}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'capture' }));
  path = '/b';
  finish(image);
  await waitFor(() => expect(notify).toHaveBeenCalledWith('info', 'routeChanged'));
  expect(saveEvidence).not.toHaveBeenCalled();
});

it('aborts on unmount and does not store a late result', async () => {
  vi.mocked(saveEvidence).mockClear();
  let signal!: AbortSignal;
  let finish!: (image: CaptureImage) => void;
  const notify = vi.fn();
  const view = render(
    <CaptureButton
      capture={input => {
        signal = input;
        return new Promise(resolve => {
          finish = resolve;
        });
      }}
      getContext={() => ({ path: '/a', title: 'A' })}
      text={text}
      notify={notify}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'capture' }));
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish(image);
  await Promise.resolve();
  expect(saveEvidence).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

it('restores the button and reports storage quota errors', async () => {
  vi.mocked(saveEvidence).mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
  const notify = vi.fn();
  render(
    <CaptureButton
      capture={async () => image}
      getContext={() => ({ path: '/a', title: 'A' })}
      text={text}
      notify={notify}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'capture' }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('error', 'quota'));
  expect(screen.getByRole('button', { name: 'capture' })).toBeVisible();
});
