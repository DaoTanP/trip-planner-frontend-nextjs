"use client";

import type {
  SyncMutationQueueEntry,
  SyncMutationQueueInput,
  SyncMutationState
} from "../types/sync.types";

type QueueListener = () => void;
const storageKey = "trip-planner-sync-mutation-queue:v1";
const acknowledgedRetentionMs = 5 * 60_000;

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readPersistedEntries(): SyncMutationQueueEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is SyncMutationQueueEntry => {
        return (
          entry &&
          typeof entry === "object" &&
          typeof entry.tripId === "string" &&
          typeof entry.clientMutationId === "string" &&
          typeof entry.entityType === "string" &&
          typeof entry.operation === "string" &&
          typeof entry.createdAt === "number"
        );
      })
      .map((entry) => ({
        ...entry,
        state: entry.state === "sending" || entry.state === "retrying" ? "queued" : entry.state,
        attemptCount: entry.attemptCount ?? 0,
        updatedAt: entry.updatedAt ?? entry.createdAt
      }));
  } catch {
    return [];
  }
}

class SyncMutationQueue {
  private entries: SyncMutationQueueEntry[] = readPersistedEntries();
  private snapshot: SyncMutationQueueEntry[] = [...this.entries].sort(
    (left, right) => left.createdAt - right.createdAt
  );
  private listeners = new Set<QueueListener>();
  private sequence = 0;

  enqueue(input: SyncMutationQueueInput): SyncMutationQueueEntry {
    const existing = this.entries.find(
      (entry) => entry.tripId === input.tripId && entry.clientMutationId === input.clientMutationId
    );

    if (existing) {
      return existing;
    }

    const now = Date.now();
    const entry: SyncMutationQueueEntry = {
      id: `${now}:${this.sequence++}`,
      tripId: input.tripId,
      clientMutationId: input.clientMutationId,
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      state: "queued",
      payload: input.payload,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.entries = [...this.entries, entry];
    this.emit();

    return entry;
  }

  markSending(clientMutationId: string) {
    this.updateState(clientMutationId, "sending", (entry) => ({
      ...entry,
      attemptCount: entry.attemptCount + 1,
      lastError: undefined
    }));
  }

  acknowledge(clientMutationId: string) {
    this.updateState(clientMutationId, "acknowledged");
  }

  fail(clientMutationId: string, error: unknown) {
    this.updateState(clientMutationId, "failed", (entry) => ({
      ...entry,
      nextRetryAt: Date.now() + getBackoffMs(entry.attemptCount),
      lastError: error instanceof Error ? error.message : String(error)
    }));
  }

  retry(clientMutationId: string) {
    this.updateState(clientMutationId, "retrying", (entry) => ({
      ...entry,
      nextRetryAt: undefined
    }));
  }

  markConflicted(clientMutationId: string, error: unknown) {
    this.updateState(clientMutationId, "conflicted", (entry) => ({
      ...entry,
      lastError: error instanceof Error ? error.message : String(error)
    }));
  }

  getSnapshot(): SyncMutationQueueEntry[] {
    return this.snapshot;
  }

  getPendingCount() {
    return this.entries.filter((entry) => entry.state !== "acknowledged").length;
  }

  getOfflineQueueSize() {
    return this.entries.filter(
      (entry) => entry.state === "queued" || entry.state === "failed" || entry.state === "retrying"
    ).length;
  }

  getReplayableEntries(now = Date.now()) {
    return this.snapshot.filter(
      (entry) =>
        (entry.state === "queued" || entry.state === "failed" || entry.state === "retrying") &&
        (entry.nextRetryAt === undefined || entry.nextRetryAt <= now)
    );
  }

  subscribe(listener: QueueListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(
    clientMutationId: string,
    state: SyncMutationState,
    patch?: (entry: SyncMutationQueueEntry) => SyncMutationQueueEntry
  ) {
    let changed = false;
    const now = Date.now();

    this.entries = this.entries.map((entry) => {
      if (entry.clientMutationId !== clientMutationId) {
        return entry;
      }

      changed = true;
      const patched = patch ? patch(entry) : entry;

      return {
        ...patched,
        state,
        updatedAt: now
      };
    });

    if (changed) {
      this.emit();
    }
  }

  private emit() {
    const cutoff = Date.now() - acknowledgedRetentionMs;
    this.entries = this.entries.filter(
      (entry) => entry.state !== "acknowledged" || entry.updatedAt >= cutoff
    );
    this.snapshot = [...this.entries].sort((left, right) => left.createdAt - right.createdAt);
    this.persist();
    this.listeners.forEach((listener) => listener());
  }

  private persist() {
    if (!canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(this.snapshot));
    } catch {
      // Persistence is best effort; the in-memory queue remains authoritative for this session.
    }
  }
}

export const syncMutationQueue = new SyncMutationQueue();

function getBackoffMs(attemptCount: number) {
  const baseMs = Math.min(30_000, 1_000 * 2 ** Math.max(0, attemptCount - 1));
  const jitterMs = Math.floor(Math.random() * 500);

  return baseMs + jitterMs;
}
