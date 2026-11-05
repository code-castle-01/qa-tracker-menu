import { QaButton } from './qa-button';
import { useEffect, useId, useState } from 'react';
import { Alert, Empty, Input, Typography } from 'antd';
import { ExportOutlined, LinkOutlined } from '@ant-design/icons';
import type { QaText } from './types';
import { validateExternalUrl } from './validate-external-url';
import './qa-tracker.css';

export interface ExternalQaPanelProps {
  allowedOrigin: string;
  storageKey: string;
  text: QaText;
}

function ExternalQaPanelContent({ allowedOrigin, storageKey, text }: ExternalQaPanelProps) {
  const inputId = useId();
  const errorId = useId();
  const [initial] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      const url = saved ? validateExternalUrl(saved, allowedOrigin) : null;
      return { url: url ?? '', invalid: Boolean(saved && !url) };
    } catch {
      return { url: '', invalid: false };
    }
  });
  const [draft, setDraft] = useState(initial.url);
  const [activeUrl, setActiveUrl] = useState(initial.url);
  const [invalid, setInvalid] = useState(initial.invalid);

  useEffect(() => {
    try {
      if (activeUrl) sessionStorage.setItem(storageKey, activeUrl);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // Storage can be disabled; the current scene remains usable in memory.
    }
  }, [activeUrl, storageKey]);

  function apply(value: string) {
    const normalized = value.trim();
    const url = normalized ? validateExternalUrl(normalized, allowedOrigin) : '';
    setInvalid(url === null);
    setDraft(url ?? '');
    setActiveUrl(url ?? '');
  }

  return (
    <section className="qa-external-panel" aria-label={text('external.title')}>
      <form
        className="qa-url-form"
        noValidate
        onSubmit={event => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <label htmlFor={inputId}>{text('external.label')}</label>
        <div className="qa-url-controls">
          <Input
            id={inputId}
            value={draft}
            allowClear
            autoComplete="off"
            spellCheck={false}
            placeholder={`${allowedOrigin}/…`}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            status={invalid ? 'error' : undefined}
            onChange={event => {
              const value = event.target.value;
              setDraft(value);
              if (!value.trim()) apply('');
            }}
            onPaste={event => {
              event.preventDefault();
              apply(event.clipboardData.getData('text/plain'));
            }}
            onBlur={event => {
              // Submitting validates once, avoiding a blur-clear followed by a second submit.
              if (
                event.relatedTarget instanceof HTMLElement &&
                event.relatedTarget.closest('button[type="submit"]')
              )
                return;
              if (draft.trim()) apply(draft);
            }}
          />
          <div className="qa-url-actions">
            <QaButton type="primary" htmlType="submit" icon={<LinkOutlined aria-hidden />}>
              {text('external.load')}
            </QaButton>
            {activeUrl && (
              <QaButton
                type="link"
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                icon={<ExportOutlined aria-hidden />}
              >
                {text('external.open')}
              </QaButton>
            )}
          </div>
        </div>
        {invalid && (
          <Alert id={errorId} role="alert" type="error" title={text('external.invalidUrl')} />
        )}
      </form>
      <div className="qa-external-help">
        <Typography.Text type="secondary">{text('external.instructions')}</Typography.Text>
      </div>
      {activeUrl ? (
        <iframe
          className="qa-external-frame"
          src={activeUrl}
          title={text('external.frameTitle')}
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="qa-external-empty">
          <Empty description={text('external.empty')} />
        </div>
      )}
    </section>
  );
}

export function ExternalQaPanel(props: ExternalQaPanelProps) {
  return <ExternalQaPanelContent key={`${props.allowedOrigin}:${props.storageKey}`} {...props} />;
}
