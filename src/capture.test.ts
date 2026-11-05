import { captureDisplay } from './capture';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function media(surface = 'browser') {
  const stop = vi.fn();
  const track = { stop, getSettings: () => ({ displaySurface: surface }) };
  const getDisplayMedia = vi
    .fn()
    .mockResolvedValue({ getTracks: () => [track], getVideoTracks: () => [track] });
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getDisplayMedia },
  });
  return { stop, getDisplayMedia };
}

it('rejects unsupported contexts without asking permission', async () => {
  const { getDisplayMedia } = media();
  vi.stubGlobal('isSecureContext', false);
  await expect(captureDisplay(new AbortController().signal)).rejects.toMatchObject({
    name: 'NotSupportedError',
  });
  expect(getDisplayMedia).not.toHaveBeenCalled();
});

it('rejects a monitor and stops its tracks', async () => {
  const { stop } = media('monitor');
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  await expect(captureDisplay(new AbortController().signal)).rejects.toMatchObject({
    name: 'WrongSurfaceError',
  });
  expect(stop).toHaveBeenCalled();
});

it('stops streams that arrive after unmount cancellation', async () => {
  const { stop } = media();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const controller = new AbortController();
  const result = captureDisplay(controller.signal);
  controller.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(stop).toHaveBeenCalled();
});

it('propagates permission cancellation', async () => {
  const { getDisplayMedia } = media();
  getDisplayMedia.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
  await expect(captureDisplay(new AbortController().signal)).rejects.toMatchObject({
    name: 'NotAllowedError',
  });
});

function decodedVideo() {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLVideoElement,
  ) {
    Object.defineProperty(this, 'videoWidth', { value: 800 });
    Object.defineProperty(this, 'videoHeight', { value: 600 });
    queueMicrotask(() => this.dispatchEvent(new Event('loadeddata')));
    return Promise.resolve();
  });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback =>
    callback(new Blob(['png'], { type: 'image/png' })),
  );
  return drawImage;
}

it('captures a decoded frame as PNG and always releases the stream', async () => {
  const { stop, getDisplayMedia } = media();
  decodedVideo();
  const result = await captureDisplay(new AbortController().signal);
  expect(result).toMatchObject({ width: 800, height: 600, blob: expect.any(Blob) });
  expect(getDisplayMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
  expect(stop).toHaveBeenCalledTimes(1);
});

it('requests permission immediately and waits five seconds after readiness before drawing', async () => {
  vi.useFakeTimers();
  const { stop, getDisplayMedia } = media();
  const drawImage = decodedVideo();
  const onDelayStart = vi.fn();
  const result = captureDisplay(new AbortController().signal, { delayMs: 5000, onDelayStart });
  expect(getDisplayMedia).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(0);
  expect(onDelayStart).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(4999);
  expect(drawImage).not.toHaveBeenCalled();
  expect(stop).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toMatchObject({ width: 800, height: 600 });
  expect(drawImage).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalled();
});

it('cancels a pending delay and releases its stream without drawing', async () => {
  vi.useFakeTimers();
  const { stop } = media();
  const drawImage = decodedVideo();
  const controller = new AbortController();
  const result = captureDisplay(controller.signal, { delayMs: 5000 });
  const rejected = result.catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  expect(await rejected).toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(5000);
  expect(drawImage).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
