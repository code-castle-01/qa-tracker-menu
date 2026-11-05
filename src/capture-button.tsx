import { QaButton } from './qa-button';
import { useCapturePosition } from './use-capture-position';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CameraOutlined } from '@ant-design/icons';
import { captureDisplay, errorKey } from './capture';
import { DEFAULT_DATABASE, saveEvidence } from './storage';
import type { CaptureAdapter, CaptureContext, QaNotify, QaText } from './types';

export interface CaptureButtonProps {
  databaseName?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  offset?: number;
  coordinates?: Pick<CSSProperties, 'top' | 'right' | 'bottom' | 'left'>;
  zIndex?: number;
  draggable?: boolean;
  positionStorageKey?: string;
  getContext: () => CaptureContext;
  capture?: CaptureAdapter;
  text: QaText;
  notify: QaNotify;
}

export function CaptureButton({
  databaseName = DEFAULT_DATABASE,
  position = 'bottom-right',
  offset = 24,
  coordinates,
  zIndex = 2147483647,
  draggable = true,
  positionStorageKey = `${databaseName}.capture-position`,
  getContext,
  capture = captureDisplay,
  text,
  notify,
}: CaptureButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const operation = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [container, setContainer] = useState<Element>(() => document.body);
  const placement = useCapturePosition(hostRef, draggable, positionStorageKey, container);

  useEffect(() => {
    const sync = () => {
      const dialogs = document.querySelectorAll('dialog:modal');
      setContainer(dialogs[dialogs.length - 1] ?? document.body);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
    });
    sync();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const raise = (event?: Event) => {
      if (!host?.showPopover || event?.target === host) return;
      if (host.matches(':popover-open')) host.hidePopover();
      host.showPopover();
    };
    raise();
    document.addEventListener('toggle', raise, true);
    return () => {
      document.removeEventListener('toggle', raise, true);
      if (host?.hidePopover && host.matches(':popover-open')) host.hidePopover();
    };
  }, [container]);

  useEffect(() => () => operation.current?.abort(), []);

  async function handleCapture(delayed = false) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    const host = hostRef.current;
    if (host) host.style.visibility = 'hidden';
    let phase = 'captureError';
    try {
      const initial = getContext();
      const image = await capture(
        controller.signal,
        delayed
          ? {
              delayMs: 5000,
              onDelayStart: () => notify('info', text('captureDelayStarted')),
            }
          : undefined,
      );
      controller.signal.throwIfAborted();
      const context = getContext();
      if (initial.path !== context.path) {
        notify('info', text('routeChanged'));
        return;
      }
      phase = 'storageError';
      await saveEvidence(databaseName, { ...image, context, id: crypto.randomUUID() });
      if (!controller.signal.aborted) {
        window.dispatchEvent(new CustomEvent('qa-tracker-updated', { detail: databaseName }));
        notify('success', text('saved'));
      }
    } catch (error) {
      if (!controller.signal.aborted) notify('error', text(errorKey(error, phase)));
    } finally {
      operation.current = null;
      if (host) host.style.visibility = '';
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return createPortal(
    <div
      ref={hostRef}
      popover={typeof HTMLElement.prototype.showPopover === 'function' ? 'manual' : undefined}
      style={{
        position: 'fixed',
        margin: 0,
        padding: 0,
        border: 0,
        background: 'transparent',
        overflow: 'visible',
        visibility: busy ? 'hidden' : undefined,
        inset: 'auto',
        zIndex,
        ...(coordinates ?? {
          [position.startsWith('top') ? 'top' : 'bottom']: offset,
          [position.endsWith('left') ? 'left' : 'right']: offset,
        }),
        ...placement.style,
      }}
    >
      <QaButton
        type="primary"
        shape="circle"
        size="large"
        icon={<CameraOutlined />}
        aria-label={text('capture')}
        aria-description={`${draggable ? text('moveCapture') : ''} ${text('delayedCapture')}`.trim()}
        title={`${text('capture')}. ${draggable ? text('moveCapture') : ''} ${text('delayedCapture')}`.trim()}
        style={
          draggable
            ? {
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: placement.dragging ? 'grabbing' : 'grab',
              }
            : undefined
        }
        {...placement.handlers}
        onPointerDown={event => {
          // Cancelling the primary pointer default preserves the focused input
          // and suppresses compatibility mousedown events used by outside-click
          // listeners (including Ant Design's window capture listeners).
          if (event.button === 0) event.preventDefault();
          placement.handlers.onPointerDown?.(event);
        }}
        onMouseDown={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
        loading={busy}
        onClick={event => {
          event.stopPropagation();
          if (!placement.consumeClick()) void handleCapture(event.shiftKey);
        }}
      />
    </div>,
    container,
  );
}
