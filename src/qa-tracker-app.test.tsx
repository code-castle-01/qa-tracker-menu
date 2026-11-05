import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QaTrackerApp } from './qa-tracker-app';

vi.mock('./gallery', () => ({
  EvidenceGallery: ({ databaseName }: { databaseName: string }) => (
    <div data-testid="evidence-gallery">{databaseName}</div>
  ),
}));

vi.mock('./external-qa-panel', () => ({
  ExternalQaPanel: ({
    allowedOrigin,
    storageKey,
  }: {
    allowedOrigin: string;
    storageKey: string;
  }) => (
    <div data-testid="external-qa-panel">
      {allowedOrigin} {storageKey}
    </div>
  ),
}));

describe('QaTrackerApp', () => {
  it('renders its own brand and passes host configuration to the workspace', () => {
    render(
      <QaTrackerApp
        allowedOrigin="https://qa.example.test"
        databaseName="host-qa-database"
        notify={vi.fn()}
        storageKey="host.qa-url"
        text={key => key}
      />,
    );

    expect(screen.getByRole('heading', { name: 'brand.title' })).toBeVisible();
    expect(screen.getByText('brand.tagline')).toBeVisible();
    expect(screen.getByTestId('evidence-gallery')).toHaveTextContent('host-qa-database');
    expect(screen.getByTestId('external-qa-panel')).toHaveTextContent(
      'https://qa.example.test host.qa-url',
    );
    expect(document.querySelector('.app-shell-header')).not.toBeInTheDocument();
    expect(document.querySelector('[data-testid="navigation-bar"]')).not.toBeInTheDocument();
  });
});
