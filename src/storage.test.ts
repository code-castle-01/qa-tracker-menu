import 'fake-indexeddb/auto';
import { clearEvidence, deleteEvidence, listEvidence, saveEvidence } from './storage';
import type { Evidence } from './types';

const evidence = (id: string): Evidence => ({
  id,
  createdAt: '2026-10-16T00:00:00.000Z',
  context: { path: '/view', title: 'View' },
  blob: new Blob(['png'], { type: 'image/png' }),
  width: 100,
  height: 80,
});

it('persists records across connections, pages ties without duplicates, and deletes only evidence', async () => {
  const name = crypto.randomUUID();
  for (let i = 0; i < 32; i++) await saveEvidence(name, evidence(String(i).padStart(2, '0')));
  const first = await listEvidence(name);
  expect(first).toHaveLength(30);
  expect(first[0].id).toBe('31');
  const last = first[first.length - 1];
  const second = await listEvidence(name, [last.createdAt, last.id]);
  expect(second.map(row => row.id)).toEqual(['01', '00']);
  await deleteEvidence(name, '31');
  expect((await listEvidence(name))[0].id).toBe('30');
  await clearEvidence(name);
  expect(await listEvidence(name)).toEqual([]);
});

it('rejects an aborted write without reporting success or replacing existing data', async () => {
  const name = crypto.randomUUID();
  await saveEvidence(name, evidence('same'));
  await expect(saveEvidence(name, evidence('same'))).rejects.toBeDefined();
  expect(await listEvidence(name)).toHaveLength(1);
});
