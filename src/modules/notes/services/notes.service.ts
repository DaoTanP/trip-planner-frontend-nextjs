import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type {
  ApiSuccessResponse,
  CursorPaginationMeta,
  ListNotesQueryDto
} from "@/services/api/contracts";

import type {
  CollaborativeNote,
  CreateNotePayload,
  CursorPage,
  DeleteNoteQuery,
  Note,
  NoteMutationResult,
  UpdateNotePayload
} from "../types/note.types";

function withNoteParams(url: string, params?: ListNotesQueryDto) {
  const searchParams = new URLSearchParams();

  if (params?.tripId) searchParams.set("tripId", params.tripId);
  if (params?.targetEntityType) searchParams.set("targetEntityType", params.targetEntityType);
  if (params?.targetEntityId) searchParams.set("targetEntityId", params.targetEntityId);
  if (params?.parentNoteId) searchParams.set("parentNoteId", params.parentNoteId);
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function withDeleteParams(url: string, params?: DeleteNoteQuery) {
  const searchParams = new URLSearchParams();

  if (params?.expectedRevision) searchParams.set("expectedRevision", params.expectedRevision);
  if (params?.clientMutationId) searchParams.set("clientMutationId", params.clientMutationId);
  if (params?.deviceId) searchParams.set("deviceId", params.deviceId);

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function getNotes(
  params?: ListNotesQueryDto,
  signal?: AbortSignal
): Promise<CursorPage<CollaborativeNote>> {
  const response = await apiGet<
    ApiSuccessResponse<{ notes: Note[] }, { pagination: CursorPaginationMeta }>
  >(withNoteParams(apiEndpoints.notes.list, params), signal);

  return {
    items: response.data.notes,
    pagination: response.meta.pagination
  };
}

export async function createNote(payload: CreateNotePayload) {
  const response = await apiPost<ApiSuccessResponse<NoteMutationResult>, CreateNotePayload>(
    apiEndpoints.notes.list,
    payload
  );

  return response.data;
}

export async function updateNote(noteId: string, payload: UpdateNotePayload) {
  const response = await apiPatch<ApiSuccessResponse<NoteMutationResult>, UpdateNotePayload>(
    apiEndpoints.notes.detail(noteId),
    payload
  );

  return response.data;
}

export async function deleteNote(noteId: string, params?: DeleteNoteQuery) {
  const response = await apiDelete<ApiSuccessResponse<NoteMutationResult>>(
    withDeleteParams(apiEndpoints.notes.detail(noteId), params)
  );

  return response.data;
}
