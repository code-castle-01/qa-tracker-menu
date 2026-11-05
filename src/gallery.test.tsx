import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EvidenceGallery } from './gallery';
import { ExternalQaPanel } from './external-qa-panel';
import { copyEvidence } from './clipboard';
import { clearEvidence, deleteEvidence, listEvidence } from './storage';
import type { Evidence } from './types';

vi.mock('./storage', () => ({
  DEFAULT_DATABASE: 'test',
  listEvidence: vi.fn(),
  deleteEvidence: vi.fn(),
  clearEvidence: vi.fn(),
}));
vi.mock('./clipboard', () => ({ copyEvidence: vi.fn().mockResolvedValue(undefined) }));
const text = (key: string) => key;
const row: Evidence = {
  id: 'one',
  blob: new Blob(['png']),
  createdAt: '2026-10-16T00:00:00Z',
  width: 100,
  height: 100,
  context: { path: '/sample', title: 'Sample view' },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

it('shows empty state and recovers from a failed read', async () => {
  vi.mocked(listEvidence).mockRejectedValueOnce(new Error('blocked')).mockResolvedValue([]);
  render(<EvidenceGallery text={text} notify={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'retry' }));
  expect(await screen.findByText('empty')).toBeVisible();
  expect(screen.getByRole('button', { name: 'clear' })).toBeDisabled();
});

it('deletes a card only after commit and releases its object URL', async () => {
  vi.mocked(listEvidence).mockResolvedValue([row]);
  vi.mocked(deleteEvidence).mockResolvedValue();
  render(<EvidenceGallery text={text} notify={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'delete' }));
  await waitFor(() => expect(screen.queryByText('Sample view')).not.toBeInTheDocument());
  expect(deleteEvidence).toHaveBeenCalledWith('test', 'one');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
});

it('keeps the evidence when deletion fails', async () => {
  vi.mocked(listEvidence).mockResolvedValue([row]);
  vi.mocked(deleteEvidence).mockRejectedValue(new Error('failed'));
  const notify = vi.fn();
  render(<EvidenceGallery text={text} notify={notify} />);
  fireEvent.click(await screen.findByRole('button', { name: 'delete' }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('error', 'storageError'));
  expect(screen.getByText('Sample view')).toBeVisible();
});

it('requires confirmation before clearing and refreshes the gallery', async () => {
  vi.mocked(listEvidence).mockResolvedValueOnce([row]).mockResolvedValue([]);
  vi.mocked(clearEvidence).mockResolvedValue();
  const notify = vi.fn();
  render(<EvidenceGallery text={text} notify={notify} />);
  await screen.findByText('Sample view');
  fireEvent.click(screen.getByRole('button', { name: 'clear' }));
  expect(await screen.findByText('confirmClear')).toBeInTheDocument();
  expect(clearEvidence).not.toHaveBeenCalled();
  // jsdom has no anchor geometry, so AntD's positioned popup stays visually hidden.
  fireEvent.click(within(screen.getByRole('tooltip', { hidden: true })).getByText('clear'));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('success', 'cleared'));
  expect(await screen.findByText('empty')).toBeVisible();
});

it('releases image URLs on unmount', async () => {
  vi.mocked(listEvidence).mockResolvedValue([row]);
  const view = render(<EvidenceGallery text={text} notify={vi.fn()} />);
  await screen.findByText('Sample view');
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
});

it('keeps the external form mounted when evidence is copied or deleted', async () => {
  vi.mocked(listEvidence).mockResolvedValue([row]);
  vi.mocked(deleteEvidence).mockResolvedValue();
  sessionStorage.removeItem('test.gallery.external');
  render(
    <>
      <EvidenceGallery text={text} notify={vi.fn()} />
      <ExternalQaPanel
        text={text}
        allowedOrigin="https://www.qa-tracker.online"
        storageKey="test.gallery.external"
      />
    </>,
  );
  fireEvent.paste(screen.getByRole('textbox', { name: 'external.label' }), {
    clipboardData: { getData: () => 'https://www.qa-tracker.online/uat/test-only' },
  });
  const frame = screen.getByTitle('external.frameTitle');
  fireEvent.click(await screen.findByRole('button', { name: 'copy' }));
  await waitFor(() => expect(copyEvidence).toHaveBeenCalledWith(row.blob));
  expect(screen.getByTitle('external.frameTitle')).toBe(frame);
  fireEvent.click(screen.getByRole('button', { name: 'delete' }));
  await waitFor(() => expect(screen.queryByText('Sample view')).toBeNull());
  expect(screen.getByTitle('external.frameTitle')).toBe(frame);
  sessionStorage.removeItem('test.gallery.external');
});
