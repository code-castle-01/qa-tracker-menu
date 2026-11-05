import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from 'react';

type Point = { left: number; top: number };

function readPosition(key: string): Point | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return value && Number.isFinite(value.left) && Number.isFinite(value.top)
      ? { left: value.left, top: value.top }
      : null;
  } catch {
    return null;
  }
}

export function useCapturePosition(
  hostRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  storageKey: string,
  container: Element,
) {
  const [saved, setSaved] = useState(() => ({ key: storageKey, point: readPosition(storageKey) }));
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    origin: Point;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  if (saved.key !== storageKey) {
    setSaved({ key: storageKey, point: readPosition(storageKey) });
  }

  function move(point: Point, persist = false) {
    const rect = hostRef.current?.getBoundingClientRect();
    const next = {
      left: Math.max(0, Math.min(point.left, Math.max(0, window.innerWidth - (rect?.width ?? 0)))),
      top: Math.max(0, Math.min(point.top, Math.max(0, window.innerHeight - (rect?.height ?? 0)))),
    };
    setSaved({ key: storageKey, point: next });
    if (persist) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* Memory fallback. */
      }
    }
    return next;
  }

  useEffect(() => {
    if (!enabled) return;
    const host = hostRef.current;
    const clamp = () => {
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const left = Math.max(0, Math.min(rect.left, Math.max(0, window.innerWidth - rect.width)));
      const top = Math.max(0, Math.min(rect.top, Math.max(0, window.innerHeight - rect.height)));
      if (left !== rect.left || top !== rect.top) {
        setSaved({ key: storageKey, point: { left, top } });
      }
    };
    clamp();
    window.addEventListener('resize', clamp);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(clamp) : null;
    if (host) observer?.observe(host);
    return () => {
      window.removeEventListener('resize', clamp);
      observer?.disconnect();
    };
  }, [container, enabled, hostRef, storageKey]);

  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    suppressClick.current = current.moved || cancelled;
    if (current.moved) {
      if (cancelled) move(current.origin);
      else
        move(
          {
            left: current.origin.left + event.clientX - current.x,
            top: current.origin.top + event.clientY - current.y,
          },
          true,
        );
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    style: (enabled && saved.point
      ? { right: 'auto', bottom: 'auto', ...saved.point }
      : {}) as CSSProperties,
    dragging,
    consumeClick: () => {
      const suppressed = suppressClick.current;
      suppressClick.current = false;
      return suppressed;
    },
    handlers: enabled
      ? {
          onPointerDown(event: PointerEvent<HTMLElement>) {
            if (event.button !== 0 || gesture.current) return;
            const rect = hostRef.current?.getBoundingClientRect();
            if (!rect) return;
            suppressClick.current = false;
            gesture.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              origin: { left: rect.left, top: rect.top },
              moved: false,
            };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          },
          onPointerMove(event: PointerEvent<HTMLElement>) {
            const current = gesture.current;
            if (!current || current.id !== event.pointerId) return;
            const dx = event.clientX - current.x;
            const dy = event.clientY - current.y;
            if (!current.moved && Math.hypot(dx, dy) < 5) return;
            current.moved = true;
            setDragging(true);
            move({ left: current.origin.left + dx, top: current.origin.top + dy });
          },
          onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event),
          onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
          onLostPointerCapture: (event: PointerEvent<HTMLElement>) => finish(event, true),
          onKeyDown(event: KeyboardEvent<HTMLElement>) {
            suppressClick.current = false;
            const delta: Record<string, [number, number]> = {
              ArrowLeft: [-10, 0],
              ArrowRight: [10, 0],
              ArrowUp: [0, -10],
              ArrowDown: [0, 10],
            };
            const direction = delta[event.key];
            const rect = hostRef.current?.getBoundingClientRect();
            if (!direction || !rect) return;
            event.preventDefault();
            move({ left: rect.left + direction[0], top: rect.top + direction[1] }, true);
          },
        }
      : {},
  };
}
