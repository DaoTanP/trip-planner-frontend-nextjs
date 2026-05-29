import type {
  ApiSuccessResponse,
  ListMutationEventsQueryDto,
  ListMutationEventsResponseDto
} from "@/services/api/contracts";
import { apiEndpoints } from "@/services/api/endpoints";
import { apiGet } from "@/services/api/request";

function withMutationEventParams(url: string, params?: ListMutationEventsQueryDto) {
  const searchParams = new URLSearchParams();

  if (params?.afterRevision) searchParams.set("afterRevision", params.afterRevision);
  if (params?.sinceRevision) searchParams.set("sinceRevision", params.sinceRevision);
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function getMutationEvents(
  tripId: string,
  params?: ListMutationEventsQueryDto,
  signal?: AbortSignal
) {
  const response = await apiGet<ApiSuccessResponse<ListMutationEventsResponseDto>>(
    withMutationEventParams(apiEndpoints.trips.mutationEvents(tripId), params),
    signal
  );

  return response.data;
}
