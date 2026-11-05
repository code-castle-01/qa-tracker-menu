import type { CaptureAdapter } from './types';

export const captureDisplay: CaptureAdapter = async (signal, options) => {
  if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
    throw new DOMException('Screen capture unavailable', 'NotSupportedError');
  }
  // Keep this call before any await to preserve transient user activation.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
    ...{ preferCurrentTab: true, selfBrowserSurface: 'include' },
  });
  const stop = () => stream.getTracks().forEach(track => track.stop());
  const video = document.createElement('video');
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    const surface = stream.getVideoTracks()[0]?.getSettings().displaySurface;
    if (surface && surface !== 'browser')
      throw new DOMException('Select a tab', 'WrongSurfaceError');
    video.muted = true;
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => finish(new Error('Frame timeout')), 10000);
      const abort = () => finish(new DOMException('Aborted', 'AbortError'));
      const finish = (error?: unknown) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        video.onloadeddata = null;
        if (error) reject(error);
        else resolve();
      };
      signal.addEventListener('abort', abort, { once: true });
      // A detached video need not reach the compositor; loadeddata guarantees a
      // decoded frame without relying on requestVideoFrameCallback visibility.
      video.onloadeddata = () => finish();
      void video.play().catch(finish);
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish();
    });
    signal.throwIfAborted();
    if (options?.delayMs && options.delayMs > 0) {
      options.onDelayStart?.();
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', abort);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        const timer = window.setTimeout(() => {
          signal.removeEventListener('abort', abort);
          resolve();
        }, options.delayMs);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      });
      signal.throwIfAborted();
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context || !canvas.width || !canvas.height) throw new Error('No video frame');
    context.drawImage(video, 0, 0);
    const createdAt = new Date().toISOString();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        value => (value ? resolve(value) : reject(new Error('PNG encoding failed'))),
        'image/png',
      );
    });
    signal.throwIfAborted();
    return { blob, createdAt, width: canvas.width, height: canvas.height };
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
    video.pause();
    video.srcObject = null;
  }
};

export function errorKey(error: unknown, fallback: string): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'permission';
    if (error.name === 'AbortError') return 'cancelled';
    if (error.name === 'NotSupportedError') return 'unsupported';
    if (error.name === 'WrongSurfaceError') return 'selectTab';
    if (error.name === 'QuotaExceededError') return 'quota';
    if (error.name === 'InvalidStateError') return 'blocked';
  }
  return fallback;
}
