import type { Evidence } from './types';

export const DEFAULT_DATABASE = 'qa-tracker';

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('captures', { keyPath: 'id' });
      store.createIndex('chronological', ['createdAt', 'id']);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new DOMException('Database blocked', 'InvalidStateError'));
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });
}

async function transaction<T>(
  name: string,
  mode: IDBTransactionMode,
  execute: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase(name);
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('captures', mode);
    let value: T;
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('Transaction aborted'));
    };
    tx.onerror = () => {
      /* onabort reports the failed transaction. */
    };
    try {
      execute(tx.objectStore('captures'), result => {
        value = result;
      });
    } catch (error) {
      tx.abort();
      db.close();
      reject(error);
    }
  });
}

export const saveEvidence = (name: string, evidence: Evidence) =>
  transaction<void>(name, 'readwrite', store => {
    store.add(evidence);
  });
export const deleteEvidence = (name: string, id: string) =>
  transaction<void>(name, 'readwrite', store => {
    store.delete(id);
  });
export const clearEvidence = (name: string) =>
  transaction<void>(name, 'readwrite', store => {
    store.clear();
  });

export function listEvidence(name: string, before?: [string, string], limit = 30) {
  return transaction<Evidence[]>(name, 'readonly', (store, result) => {
    const rows: Evidence[] = [];
    const request = store
      .index('chronological')
      .openCursor(before ? IDBKeyRange.upperBound(before, true) : undefined, 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || rows.length === limit) {
        result(rows);
        return;
      }
      rows.push(cursor.value as Evidence);
      cursor.continue();
    };
  });
}
