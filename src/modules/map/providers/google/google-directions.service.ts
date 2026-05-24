import { mapConfig } from "@/modules/map/config/map.config";
import { normalizeGoogleMapsError } from "@/modules/map/providers/shared/map-provider-error";
import type {
  MapRoute,
  MapRouteLeg,
  MapRoutePoint,
  MapRouteRequest,
  MapTravelMode
} from "@/modules/map/types/map.types";

import { loadGoogleMaps } from "./google-map-loader";
import type {
  GoogleDirectionsRequest,
  GoogleDirectionsRoute,
  GoogleMapsApi
} from "./google-map.types";
import { fromGoogleLatLng, toGoogleLatLngLiteral } from "./google-map.types";

export async function getGoogleRoute(
  request: MapRouteRequest,
  signal?: AbortSignal
): Promise<MapRoute> {
  const points = request.points.filter(isValidRoutePoint);

  if (points.length < 2) {
    return {
      provider: "google",
      points,
      distanceMeters: null,
      durationSeconds: null,
      legs: []
    };
  }

  throwIfAborted(signal);
  const googleMaps = await loadGoogleMaps({
    language: request.language,
    region: request.region
  });
  const directionsService = new googleMaps.DirectionsService();
  const directionsRequest = toGoogleDirectionsRequest(googleMaps, {
    ...request,
    points
  });

  const result = await withAbort<GoogleDirectionsRoute>(signal, (resolve, reject) => {
    directionsService.route(directionsRequest, (directionsResult, status) => {
      if (status === "OK" && directionsResult?.routes?.[0]) {
        resolve(directionsResult.routes[0]);
        return;
      }

      reject(normalizeGoogleMapsError(status, "Google Directions failed"));
    });
  });

  return mapDirectionsRoute(result, points);
}

function toGoogleDirectionsRequest(
  googleMaps: GoogleMapsApi,
  request: MapRouteRequest
): GoogleDirectionsRequest {
  const [origin, ...rest] = request.points;
  const destination = rest.at(-1);
  const waypoints = rest.slice(0, -1);

  if (!origin || !destination) {
    throw normalizeGoogleMapsError("ZERO_RESULTS", "Route requires at least two points");
  }

  const directionsRequest: GoogleDirectionsRequest = {
    destination: toGoogleLatLngLiteral(destination),
    origin: toGoogleLatLngLiteral(origin),
    travelMode: toGoogleTravelMode(googleMaps, request.travelMode ?? "driving"),
    unitSystem: googleMaps.UnitSystem.METRIC
  };

  if (waypoints.length > 0) {
    directionsRequest.waypoints = waypoints.map((point) => ({
      location: toGoogleLatLngLiteral(point),
      stopover: true
    }));
  }
  if (request.optimizeWaypoints) {
    directionsRequest.optimizeWaypoints = true;
  }
  if (request.region || mapConfig.googleMapsRegion) {
    directionsRequest.region = request.region || mapConfig.googleMapsRegion;
  }

  return directionsRequest;
}

function mapDirectionsRoute(
  route: GoogleDirectionsRoute,
  fallbackPoints: MapRoutePoint[]
): MapRoute {
  const points = route.overview_path?.map(fromGoogleLatLng) ?? fallbackPoints;
  const legs = (route.legs ?? []).map(mapDirectionsLeg);

  return {
    provider: "google",
    points: points.length >= 2 ? points : fallbackPoints,
    encodedPolyline: route.overview_polyline,
    distanceMeters: sumNullable(legs.map((leg) => leg.distanceMeters)),
    durationSeconds: sumNullable(legs.map((leg) => leg.durationSeconds)),
    legs
  };
}

function mapDirectionsLeg(leg: NonNullable<GoogleDirectionsRoute["legs"]>[number]): MapRouteLeg {
  return {
    start: leg.start_location
      ? fromGoogleLatLng(leg.start_location)
      : { latitude: 0, longitude: 0 },
    end: leg.end_location ? fromGoogleLatLng(leg.end_location) : { latitude: 0, longitude: 0 },
    distanceMeters: leg.distance?.value ?? null,
    durationSeconds: leg.duration?.value ?? null
  };
}

function toGoogleTravelMode(googleMaps: GoogleMapsApi, travelMode: MapTravelMode) {
  if (travelMode === "walking") {
    return googleMaps.TravelMode.WALKING;
  }
  if (travelMode === "bicycling") {
    return googleMaps.TravelMode.BICYCLING;
  }
  if (travelMode === "transit") {
    return googleMaps.TravelMode.TRANSIT;
  }

  return googleMaps.TravelMode.DRIVING;
}

function sumNullable(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => typeof value === "number");

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((total, value) => total + value, 0);
}

function isValidRoutePoint(point: MapRoutePoint) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
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
