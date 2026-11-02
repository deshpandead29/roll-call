import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { enqueue, persist, pendingPhotos, removePending, subscribeQueue, type PendingPhoto } from "../src/lib/photo-store";

beforeEach(() => {
  Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true });
  Object.defineProperty(globalThis, "window", { value: new EventTarget(), configurable: true });
});
function photo(id: string, owner = "owner-a"): PendingPhoto {
  return { id, owner, createdAt: Date.now(), file: new File(["original image bytes"], "photo.jpg", { type: "image/jpeg" }),
    options: { eventId: "event", memberId: "member", frame: 1, who: "Sam", today: "2026-11-02", mission: "Test", accent: "pink" },
    action: { type: "answer", callId: "call" } };
}

test("photo bytes and reply destination survive closing and reopening storage", async () => {
  await persist(photo("one"));
  const [saved] = await pendingPhotos("owner-a");
  assert.equal(await saved.file.text(), "original image bytes");
  assert.deepEqual(saved.action, { type: "answer", callId: "call" });
  assert.equal(saved.options.eventId, "event");
});

test("pending photos are isolated by account and retries update the same entry", async () => {
  await persist(photo("one"));
  await persist(photo("two", "owner-b"));
  await persist({ ...photo("one"), error: "Offline", blocked: false });
  assert.equal((await pendingPhotos("owner-a")).length, 1);
  assert.equal((await pendingPhotos("owner-a"))[0].error, "Offline");
  assert.deepEqual((await pendingPhotos("owner-b")).map((p) => p.id), ["two"]);
});

test("discard removes only the selected photo after committing storage", async () => {
  let changes = 0;
  const stop = subscribeQueue(() => { changes++; });
  await persist(photo("one")); await persist(photo("two"));
  await removePending("one");
  assert.deepEqual((await pendingPhotos("owner-a")).map((p) => p.id), ["two"]);
  assert.equal(changes, 3);
  stop();
});

test("expired replies remain downloadable until explicitly discarded", async () => {
  await persist({ ...photo("one"), blocked: true, error: "This call has closed." });
  const [saved] = await pendingPhotos("owner-a");
  assert.equal(saved.blocked, true);
  assert.equal(await saved.file.text(), "original image bytes");
});

test("offline captures receive distinct frame numbers even when saved concurrently", async () => {
  const saved = await Promise.all([enqueue(photo("one")), enqueue(photo("two"))]);
  assert.deepEqual(saved.map((p) => p.options.frame).sort(), [1, 2]);
});
