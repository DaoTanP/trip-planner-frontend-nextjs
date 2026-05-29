import type { ApiError } from "@/services/api/errors";

import type { RevisionConflictDetails } from "../types/sync.types";

export type RevisionConflictError = ApiError & {
  code: "REVISION_CONFLICT";
  details: RevisionConflictDetails;
};

function hasRevisionConflictDetails(
  details: ApiError["details"]
): details is RevisionConflictDetails {
  return (
    !!details &&
    !Array.isArray(details) &&
    typeof details.currentRevision === "string" &&
    typeof details.latestTripRevision === "string"
  );
}

export function isRevisionConflict(error: unknown): error is RevisionConflictError {
  const candidate = error as ApiError | undefined;

  return candidate?.code === "REVISION_CONFLICT" && hasRevisionConflictDetails(candidate.details);
}

export function getRevisionConflictDetails(error: unknown): RevisionConflictDetails | null {
  return isRevisionConflict(error) ? error.details : null;
}
