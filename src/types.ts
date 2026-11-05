export interface CaptureContext {
  path: string;
  title: string;
}

export interface CaptureImage {
  blob: Blob;
  width: number;
  height: number;
  createdAt: string;
}

export interface Evidence extends CaptureImage {
  id: string;
  context: CaptureContext;
}

export interface CaptureOptions {
  /** Delay after screen permission and video readiness, not before requesting permission. */
  delayMs?: number;
  onDelayStart?: () => void;
}

export type CaptureAdapter = (
  signal: AbortSignal,
  options?: CaptureOptions,
) => Promise<CaptureImage>;
export type QaText = (key: string) => string;
export type QaNotify = (kind: 'success' | 'error' | 'info', text: string) => void;
