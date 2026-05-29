import type {
  CreateNoteRequestDto,
  CursorPaginationMeta,
  DeleteNoteQueryDto,
  ListNotesQueryDto,
  NoteDto,
  NoteTargetEntityTypeDto,
  UpdateNoteRequestDto
} from "@/services/api/contracts";

export type NoteTargetEntityType = NoteTargetEntityTypeDto;
export type Note = NoteDto;
export type CollaborativeNote = NoteDto & {
  isPending?: boolean;
};
export type CreateNotePayload = CreateNoteRequestDto;
export type UpdateNotePayload = UpdateNoteRequestDto;
export type DeleteNoteQuery = DeleteNoteQueryDto;
export type ListNotesQuery = ListNotesQueryDto;

export type NoteMutationResult = {
  note: Note;
  revision: string;
  clientMutationId?: string;
};

export type CursorPage<TItem> = {
  items: TItem[];
  pagination: CursorPaginationMeta;
};
