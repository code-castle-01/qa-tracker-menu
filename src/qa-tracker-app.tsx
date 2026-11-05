import { AuditOutlined } from '@ant-design/icons';
import { Splitter, Typography } from 'antd';
import { useState } from 'react';
import type { QaNotify, QaText } from './types';
import { EvidenceGallery } from './gallery';
import { ExternalQaPanel } from './external-qa-panel';
import './qa-tracker.css';

export interface QaTrackerAppProps {
  allowedOrigin: string;
  databaseName: string;
  notify: QaNotify;
  storageKey: string;
  text: QaText;
}

export function QaTrackerApp({
  allowedOrigin,
  databaseName,
  notify,
  storageKey,
  text,
}: QaTrackerAppProps) {
  const [resizing, setResizing] = useState(false);

  return (
    <div className="qa-tracker-app">
      <header className="qa-tracker-app__header">
        <span className="qa-tracker-app__mark" aria-hidden="true">
          <AuditOutlined />
        </span>
        <div className="qa-tracker-app__identity">
          <Typography.Title level={1} className="qa-tracker-app__title">
            {text('brand.title')}
          </Typography.Title>
          <Typography.Text className="qa-tracker-app__tagline">
            {text('brand.tagline')}
          </Typography.Text>
        </div>
      </header>

      <main className="qa-tracker-app__main">
        <Splitter
          className={`qa-workspace${resizing ? ' qa-workspace--resizing' : ''}`}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
        >
          <Splitter.Panel defaultSize="20%" min="20%" max="30%" className="qa-evidence-panel">
            <EvidenceGallery databaseName={databaseName} text={text} notify={notify} />
          </Splitter.Panel>
          <Splitter.Panel min="35%" className="qa-platform-panel">
            <ExternalQaPanel allowedOrigin={allowedOrigin} storageKey={storageKey} text={text} />
          </Splitter.Panel>
        </Splitter>
      </main>
    </div>
  );
}
