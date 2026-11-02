export type CaptureOptions = {
  eventId: string; memberId: string; frame: number; who: string;
  today: string; mission: string; accent: string; time?: string;
};
export type PhotoAction =
  | { type: "photo"; row: Record<string, string | number> }
  | { type: "call"; recipients: string[] | null }
  | { type: "answer"; callId: string };
export type PendingPhoto = {
  id: string; owner: string; file: File; options: CaptureOptions; action: PhotoAction;
  createdAt: number; error?: string; blocked?: boolean;
};
const DB = "roll-call-photos";
const STORE = "pending";
const CHANGE = "rc-photo-queue";
export const queueChanged = () => window.dispatchEvent(new Event(CHANGE));
export function subscribeQueue(fn: () => void) {
  window.addEventListener(CHANGE, fn);
  return () => window.removeEventListener(CHANGE, fn);
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other Roll Call tabs and try again."));
  });
}
// Resolve only when the transaction commits, not when its individual request succeeds.
async function storage<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error ?? request.error); };
  });
}
export async function pendingPhotos(owner: string): Promise<PendingPhoto[]> {
  const all = await storage<PendingPhoto[]>("readonly", (s) => s.getAll());
  return all.filter((p) => p.owner === owner).sort((a, b) => a.createdAt - b.createdAt);
}
export async function removePending(id: string) {
  await storage("readwrite", (s) => s.delete(id));
  queueChanged();
}
export async function persist(photo: PendingPhoto) {
  await storage("readwrite", (s) => s.put(photo));
  queueChanged();
}

// Allocate print numbers atomically, including captures still waiting offline.
export async function enqueue(photo: PendingPhoto): Promise<PendingPhoto> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.getAll();
    let saved = photo;
    request.onsuccess = () => {
      const peers = (request.result as PendingPhoto[]).filter((p) => p.owner === photo.owner
        && p.options.eventId === photo.options.eventId && p.options.memberId === photo.options.memberId);
      saved = { ...photo, options: { ...photo.options,
        frame: Math.max(photo.options.frame, ...peers.map((p) => p.options.frame + 1)) } };
      store.put(saved);
    };
    transaction.oncomplete = () => { db.close(); queueChanged(); resolve(saved); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error ?? request.error); };
  });
}
