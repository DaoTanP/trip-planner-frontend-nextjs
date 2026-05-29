import { isRevisionConflict } from "../reconciliation/revision-conflict";
import { syncMutationQueue } from "../queue/mutation-queue";
import type { SyncMutationQueueInput } from "../types/sync.types";

type RunQueuedMutationOptions<TResult> = SyncMutationQueueInput & {
  mutationFn: () => Promise<TResult>;
};

export async function runQueuedMutation<TResult>({
  mutationFn,
  ...queueInput
}: RunQueuedMutationOptions<TResult>): Promise<TResult> {
  syncMutationQueue.enqueue(queueInput);
  syncMutationQueue.markSending(queueInput.clientMutationId);

  try {
    const result = await mutationFn();
    syncMutationQueue.acknowledge(queueInput.clientMutationId);

    return result;
  } catch (error) {
    if (isRevisionConflict(error)) {
      syncMutationQueue.markConflicted(queueInput.clientMutationId, error);
    } else {
      syncMutationQueue.fail(queueInput.clientMutationId, error);
    }

    throw error;
  }
}
