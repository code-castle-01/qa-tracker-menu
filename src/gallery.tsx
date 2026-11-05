import { QaButton } from './qa-button';
import { CopyOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Card, Empty, Image, Popconfirm, Space, Spin, Typography } from 'antd';
import { clearEvidence, DEFAULT_DATABASE, deleteEvidence, listEvidence } from './storage';
import { errorKey } from './capture';
import type { Evidence, QaNotify, QaText } from './types';
import './qa-tracker.css';
import { copyEvidence } from './clipboard';

function EvidenceCard({
  evidence,
  text,
  notify,
  onDelete,
}: {
  evidence: Evidence;
  text: QaText;
  notify: QaNotify;
  onDelete: (id: string) => Promise<void>;
}) {
  const [url, setUrl] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(evidence.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [evidence.blob]);
  return (
    <Card size="small" className="qa-evidence">
      <Image src={url} alt={`${evidence.context.title} — ${evidence.createdAt}`} width="100%" />
      <Typography.Paragraph strong>{evidence.context.title}</Typography.Paragraph>
      <Typography.Paragraph code>{evidence.context.path}</Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        {new Date(evidence.createdAt).toLocaleString()}
      </Typography.Paragraph>
      <Space wrap>
        <QaButton
          icon={<CopyOutlined aria-hidden />}
          onClick={() => {
            void copyEvidence(evidence.blob).then(
              () => notify('success', text('copied')),
              error => notify('error', text(errorKey(error, 'copyError'))),
            );
          }}
        >
          {text('copy')}
        </QaButton>
        <QaButton
          danger
          icon={<DeleteOutlined aria-hidden />}
          loading={deleting}
          onClick={() => {
            setDeleting(true);
            void onDelete(evidence.id).finally(() => setDeleting(false));
          }}
        >
          {text('delete')}
        </QaButton>
      </Space>
    </Card>
  );
}

export interface EvidenceGalleryProps {
  databaseName?: string;
  text: QaText;
  notify: QaNotify;
}

export function EvidenceGallery({
  databaseName = DEFAULT_DATABASE,
  text,
  notify,
}: EvidenceGalleryProps) {
  const [rows, setRows] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(false);
  const [clearing, setClearing] = useState(false);
  const generation = useRef(0);
  const cancelLoads = useCallback(() => {
    generation.current++;
  }, []);
  const load = useCallback(
    async (before?: [string, string]) => {
      const current = ++generation.current;
      setLoading(true);
      setError(false);
      try {
        const batch = await listEvidence(databaseName, before);
        if (current !== generation.current) return;
        setRows(previous => (before ? [...previous, ...batch] : batch));
        setMore(batch.length === 30);
      } catch {
        if (current === generation.current) setError(true);
      } finally {
        if (current === generation.current) setLoading(false);
      }
    },
    [databaseName],
  );
  useEffect(() => {
    void load();
    const refresh = (event: Event) => {
      if ((event as CustomEvent<string>).detail === databaseName) void load();
    };
    window.addEventListener('qa-tracker-updated', refresh);
    return () => {
      cancelLoads();
      window.removeEventListener('qa-tracker-updated', refresh);
    };
  }, [databaseName, load, cancelLoads]);

  async function remove(id: string) {
    try {
      await deleteEvidence(databaseName, id);
      setRows(previous => previous.filter(row => row.id !== id));
    } catch (reason) {
      notify('error', text(errorKey(reason, 'storageError')));
    }
  }
  async function clear() {
    setClearing(true);
    try {
      await clearEvidence(databaseName);
      await load();
      notify('success', text('cleared'));
    } catch (reason) {
      notify('error', text(errorKey(reason, 'storageError')));
    } finally {
      setClearing(false);
    }
  }
  return (
    <section aria-label={text('title')}>
      <div className="qa-toolbar">
        <Typography.Paragraph type="secondary">{text('description')}</Typography.Paragraph>
        <Popconfirm
          title={text('confirmClear')}
          onConfirm={clear}
          okText={text('clear')}
          cancelText={text('cancel')}
          okButtonProps={{ className: 'qa-button', danger: true }}
          cancelButtonProps={{ className: 'qa-button' }}
        >
          <QaButton
            danger
            icon={<DeleteOutlined aria-hidden />}
            loading={clearing}
            disabled={loading || !rows.length}
          >
            {text('clear')}
          </QaButton>
        </Popconfirm>
      </div>
      {error && (
        <Alert
          type="error"
          title={text('storageError')}
          action={
            <QaButton icon={<ReloadOutlined aria-hidden />} onClick={() => void load()}>
              {text('retry')}
            </QaButton>
          }
        />
      )}
      {!loading && !error && !rows.length && <Empty description={text('empty')} />}
      <div className="qa-masonry">
        {rows.map(evidence => (
          <EvidenceCard
            key={evidence.id}
            evidence={evidence}
            text={text}
            notify={notify}
            onDelete={remove}
          />
        ))}
      </div>
      {loading && <Spin aria-label={text('loading')} />}
      {more && !loading && !error && (
        <QaButton
          icon={<PlusOutlined aria-hidden />}
          onClick={() => {
            const last = rows[rows.length - 1];
            void load(last ? [last.createdAt, last.id] : undefined);
          }}
        >
          {text('more')}
        </QaButton>
      )}
    </section>
  );
}
