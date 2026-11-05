import { copyEvidence } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('writes the PNG blob without converting it to text', async () => {
  vi.stubGlobal('isSecureContext', true);
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } });
  const item = vi.fn(function (this: { data: unknown }, data: unknown) {
    this.data = data;
  });
  vi.stubGlobal('ClipboardItem', item);
  const blob = new Blob(['png'], { type: 'image/png' });
  await copyEvidence(blob);
  expect(item).toHaveBeenCalledWith({ 'image/png': blob });
  expect(write).toHaveBeenCalledTimes(1);
  write.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
  await expect(copyEvidence(blob)).rejects.toMatchObject({ name: 'NotAllowedError' });
});

it('rejects insecure contexts', async () => {
  vi.stubGlobal('isSecureContext', false);
  await expect(copyEvidence(new Blob())).rejects.toMatchObject({ name: 'NotSupportedError' });
});
