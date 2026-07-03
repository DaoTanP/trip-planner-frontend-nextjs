"use client";

import { isRevisionConflict } from "../reconciliation/revision-conflict";
import { syncMutationQueue } from "../queue/mutation-queue";
import type { SyncMutationQueueInput } from "../types/sync.types";
import { reportRevisionConflict } from "@/modules/collaboration/conflict.store";

type RunQueuedMutationOptions<TResult> = SyncMutationQueueInput & {
  mutationFn: () => Promise<TResult>;
  maxAttempts?: number | undefined;
};

function isTransientSyncError(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "TypeError" ||
    /network|fetch|timeout|offline|failed to fetch/i.test(error.message)
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForOnline() {
  if (typeof window === "undefined" || typeof navigator === "undefined" || navigator.onLine) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handleOnline = () => {
      window.removeEventListener("online", handleOnline);
      resolve();
    };

    window.addEventListener("online", handleOnline, { once: true });
  });
}

function getRetryDelayMs(attempt: number) {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt - 1)) + Math.random() * 500;
}

export async function runQueuedMutation<TResult>({
  mutationFn,
  maxAttempts = 5,
  ...queueInput
}: RunQueuedMutationOptions<TResult>): Promise<TResult> {
  syncMutationQueue.enqueue(queueInput);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await waitForOnline();
    syncMutationQueue.markSending(queueInput.clientMutationId);

    try {
      const result = await mutationFn();
      syncMutationQueue.acknowledge(queueInput.clientMutationId);

      return result;
    } catch (error) {
      if (isRevisionConflict(error)) {
        syncMutationQueue.markConflicted(queueInput.clientMutationId, error);
        reportRevisionConflict({
          tripId: queueInput.tripId,
          entityType: queueInput.entityType,
          entityId: queueInput.entityId,
          operation: queueInput.operation,
          localPayload: queueInput.payload,
          details: error.details
        });
        throw error;
      }

      if (!isTransientSyncError(error) || attempt >= maxAttempts) {
        syncMutationQueue.fail(queueInput.clientMutationId, error);
        throw error;
      }

      syncMutationQueue.retry(queueInput.clientMutationId);
      await wait(getRetryDelayMs(attempt));
    }
  }

  throw new Error("Queued mutation failed");
}
