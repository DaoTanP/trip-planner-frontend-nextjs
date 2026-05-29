import type {
  SyncMutationQueueEntry,
  SyncMutationQueueInput,
  SyncMutationState
} from "../types/sync.types";

type QueueListener = () => void;

class SyncMutationQueue {
  private entries: SyncMutationQueueEntry[] = [];
  private snapshot: SyncMutationQueueEntry[] = [];
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
      lastError: error instanceof Error ? error.message : String(error)
    }));
  }

  retry(clientMutationId: string) {
    this.updateState(clientMutationId, "retrying");
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
    this.snapshot = [...this.entries].sort((left, right) => left.createdAt - right.createdAt);
    this.listeners.forEach((listener) => listener());
  }
}

export const syncMutationQueue = new SyncMutationQueue();
