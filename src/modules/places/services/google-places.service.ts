import { mapConfig } from "@/modules/map/config/map.config";
import { loadGoogleMaps } from "@/modules/map/providers/google/google-map-loader";
import type {
  GoogleAddressComponent,
  GoogleAutocompletePrediction,
  GoogleAutocompleteRequest,
  GooglePlaceResult
} from "@/modules/map/providers/google/google-map.types";
import { normalizeGoogleMapsError } from "@/modules/map/providers/shared/map-provider-error";

import type {
  PlaceDetails,
  PlaceDetailsParams,
  PlaceSearchParams,
  PlaceSearchResult
} from "../types/place.types";

const googlePlacesFields = [
  "address_components",
  "formatted_address",
  "geometry.location",
  "international_phone_number",
  "name",
  "place_id",
  "types",
  "url",
  "utc_offset_minutes",
  "website"
];

export async function searchGooglePlaces(
  params: PlaceSearchParams,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const query = params.q?.trim();

  if (!query) {
    return [];
  }

  throwIfAborted(signal);
  const googleMaps = await loadGoogleMaps({
    language: params.language,
    region: params.region
  });
  const service = new googleMaps.places.AutocompleteService();
  const request: GoogleAutocompleteRequest = {
    input: query
  };

  if (params.countryCode) {
    request.componentRestrictions = {
      country: params.countryCode.toLowerCase()
    };
  }
  if (params.language || mapConfig.googleMapsLanguage) {
    request.language = params.language || mapConfig.googleMapsLanguage;
  }
  if (params.region || mapConfig.googleMapsRegion) {
    request.region = params.region || mapConfig.googleMapsRegion;
  }
  if (params.near) {
    request.location = {
      lat: params.near.latitude,
      lng: params.near.longitude
    };
    request.radius = 50_000;
  }

  const predictions = await withAbort<GoogleAutocompletePrediction[]>(signal, (resolve, reject) => {
    service.getPlacePredictions(request, (results, status) => {
      if (status === "OK") {
        resolve(results ?? []);
        return;
      }

      if (status === "ZERO_RESULTS") {
        resolve([]);
        return;
      }

      reject(normalizeGoogleMapsError(status, "Google Places autocomplete failed"));
    });
  });

  return predictions.slice(0, params.limit ?? 8).map(mapPredictionToPlaceSearchResult);
}

export async function getGooglePlaceDetails(
  params: PlaceDetailsParams,
  signal?: AbortSignal
): Promise<PlaceDetails> {
  throwIfAborted(signal);
  const googleMaps = await loadGoogleMaps({
    language: params.language,
    region: params.region
  });
  const service = new googleMaps.places.PlacesService(document.createElement("div"));
  const providerPlaceId =
    params.provider === "google" ? params.placeId.replace(/^google:/, "") : "";

  if (!providerPlaceId) {
    throw normalizeGoogleMapsError("NOT_FOUND", "Google place id is missing");
  }

  const result = await withAbort<GooglePlaceResult>(signal, (resolve, reject) => {
    service.getDetails(
      {
        fields: googlePlacesFields,
        language: params.language || mapConfig.googleMapsLanguage,
        placeId: providerPlaceId,
        region: params.region || mapConfig.googleMapsRegion
      },
      (place, status) => {
        if (status === "OK" && place) {
          resolve(place);
          return;
        }

        reject(normalizeGoogleMapsError(status, "Google place details failed"));
      }
    );
  });

  return mapGooglePlaceToDetails(result, providerPlaceId);
}

function mapPredictionToPlaceSearchResult(
  prediction: GoogleAutocompletePrediction
): PlaceSearchResult {
  const name = prediction.structured_formatting?.main_text ?? prediction.description;
  const formattedAddress =
    prediction.structured_formatting?.secondary_text ?? prediction.description;

  return {
    id: `google:${prediction.place_id}`,
    provider: "google",
    providerPlaceId: prediction.place_id,
    source: "GOOGLE",
    name,
    formattedAddress,
    countryCode: null,
    latitude: null,
    longitude: null,
    websiteUrl: null,
    phoneNumber: null,
    timezone: null,
    categories: prediction.types ?? []
  };
}

function mapGooglePlaceToDetails(place: GooglePlaceResult, fallbackPlaceId: string): PlaceDetails {
  const providerPlaceId = place.place_id ?? fallbackPlaceId;
  const location = place.geometry?.location;
  const categories = place.types ?? [];

  return {
    id: `google:${providerPlaceId}`,
    provider: "google",
    providerPlaceId,
    source: "GOOGLE",
    name: place.name ?? place.formatted_address ?? providerPlaceId,
    formattedAddress: place.formatted_address ?? null,
    countryCode: getCountryCode(place.address_components),
    latitude: location ? location.lat() : null,
    longitude: location ? location.lng() : null,
    websiteUrl: place.website ?? null,
    phoneNumber: place.international_phone_number ?? null,
    timezone: null,
    categories,
    metadata: {
      provider: "google",
      googleUrl: place.url ?? null,
      utcOffsetMinutes: place.utc_offset_minutes ?? null
    },
    sourcePayload: {
      googlePlaceId: providerPlaceId,
      types: categories
    }
  };
}

function getCountryCode(components?: GoogleAddressComponent[]) {
  return components?.find((component) => component.types.includes("country"))?.short_name ?? null;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError");
  }
}

function withAbort<T>(
  signal: AbortSignal | undefined,
  run: (resolve: (value: T) => void, reject: (reason: unknown) => void) => void
) {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    const abort = () => reject(new DOMException("Request aborted", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });

    run(
      (value) => {
        signal?.removeEventListener("abort", abort);
        resolve(value);
      },
      (reason) => {
        signal?.removeEventListener("abort", abort);
        reject(reason);
      }
    );
  });
}
