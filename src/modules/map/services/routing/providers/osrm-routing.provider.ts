import { mapConfig } from "@/modules/map/config/map.config";
import { MapProviderError } from "@/modules/map/providers/shared/map-provider-error";
import type {
  MapRoute,
  MapRouteLeg,
  MapRoutePoint,
  MapRouteRequest,
  MapTravelMode
} from "@/modules/map/types/map.types";
import { decodePolyline } from "@/modules/map/utils/polyline";

import type { RoutingProvider } from "../routing.types";

type OsrmRouteResponse = {
  code?: string;
  message?: string;
  routes?: OsrmRoute[];
};

type OsrmRoute = {
  distance?: number;
  duration?: number;
  geometry?: string;
  legs?: OsrmLeg[];
};

type OsrmLeg = {
  distance?: number;
  duration?: number;
  steps?: OsrmStep[];
};

type OsrmStep = {
  geometry?: string;
};

type OsrmRouteStrategy = {
  overview: "full" | "simplified";
  steps: boolean;
  chunked: boolean;
};

const osrmProviderId = "osrm";
// Route-size thresholds keep OSRM payloads and client-side GeoJSON bounded.
// 1-25 stops: full geometry with per-leg step geometry.
// 26-100 stops: simplified overview without step geometry.
// 101-200 stops: chunked simplified requests with overlapping endpoints.
const detailedRouteStopLimit = 25;
const simplifiedRouteStopLimit = 100;
const maxOsrmRouteStops = 200;
const osrmRouteChunkSize = 50;

export const osrmRoutingProvider: RoutingProvider = {
  id: osrmProviderId,
  isConfigured: () => mapConfig.osrmRouteUrl.trim().length > 0,
  getRoute: getOsrmRoute
};

async function getOsrmRoute(request: MapRouteRequest, signal?: AbortSignal): Promise<MapRoute> {
  const points = request.points.filter(isValidRoutePoint);
  const travelMode = request.travelMode ?? "driving";

  if (points.length < 2) {
    return {
      provider: osrmProviderId,
      points,
      distanceMeters: null,
      durationSeconds: null,
      legs: []
    };
  }

  if (travelMode === "transit") {
    throw new MapProviderError({
      code: "MAP_PROVIDER_UNSUPPORTED_TRAVEL_MODE",
      provider: osrmProviderId,
      message: "OSRM does not support transit routing"
    });
  }

  if (points.length > maxOsrmRouteStops) {
    throw new MapProviderError({
      code: "MAP_PROVIDER_TOO_MANY_WAYPOINTS",
      provider: osrmProviderId,
      message: `OSRM routing is limited to ${maxOsrmRouteStops} stops`
    });
  }

  if (!osrmRoutingProvider.isConfigured()) {
    throw new MapProviderError({
      code: "MAP_PROVIDER_NOT_CONFIGURED",
      provider: osrmProviderId,
      message: "OSRM routing is not configured"
    });
  }

  const strategy = getRouteStrategy(points.length);
  if (strategy.chunked) {
    return getChunkedOsrmRoute(points, travelMode, strategy, signal);
  }

  const route = await fetchOsrmRoute(points, travelMode, strategy, signal);

  return mapOsrmRoute(route, points);
}

async function fetchOsrmRoute(
  points: MapRoutePoint[],
  travelMode: Exclude<MapTravelMode, "transit">,
  strategy: OsrmRouteStrategy,
  signal?: AbortSignal
) {
  const timeoutSignal = createTimeoutSignal(signal);
  const response = await fetch(buildOsrmRouteUrl(points, travelMode, strategy), {
    signal: timeoutSignal.signal
  })
    .catch((error: unknown) => {
      if (isAbortError(error)) {
        throw error;
      }

      throw normalizeOsrmRequestError(error);
    })
    .finally(timeoutSignal.cleanup);

  if (!response.ok) {
    const payload = await readOsrmPayload(response);
    throw new MapProviderError({
      code:
        response.status === 400 || response.status === 404
          ? "MAP_PROVIDER_MISCONFIGURED"
          : "MAP_PROVIDER_REQUEST_FAILED",
      provider: osrmProviderId,
      message: payload?.message ?? `OSRM route request failed with status ${response.status}`
    });
  }

  const payload = (await response.json()) as OsrmRouteResponse;

  if (payload.code && payload.code !== "Ok") {
    throw new MapProviderError({
      code:
        payload.code === "NoRoute" ? "MAP_PROVIDER_ZERO_RESULTS" : "MAP_PROVIDER_REQUEST_FAILED",
      provider: osrmProviderId,
      message: payload.message ?? "OSRM could not calculate a route"
    });
  }

  const route = payload.routes?.[0];
  if (!route) {
    throw new MapProviderError({
      code: "MAP_PROVIDER_ZERO_RESULTS",
      provider: osrmProviderId,
      message: "OSRM returned no route"
    });
  }

  return route;
}

async function getChunkedOsrmRoute(
  points: MapRoutePoint[],
  travelMode: Exclude<MapTravelMode, "transit">,
  strategy: OsrmRouteStrategy,
  signal?: AbortSignal
) {
  const routes: MapRoute[] = [];

  for (const chunk of getRouteChunks(points)) {
    const route = await fetchOsrmRoute(chunk, travelMode, strategy, signal);
    routes.push(mapOsrmRoute(route, chunk));
  }

  return mergeChunkedRoutes(routes, points);
}

function buildOsrmRouteUrl(
  points: MapRoutePoint[],
  travelMode: Exclude<MapTravelMode, "transit">,
  strategy: OsrmRouteStrategy
) {
  const baseUrl = mapConfig.osrmRouteUrl.replace(/\/+$/, "");
  const coordinates = points
    .map((point) => `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`)
    .join(";");
  const params = new URLSearchParams({
    alternatives: "false",
    geometries: "polyline",
    overview: strategy.overview,
    steps: String(strategy.steps)
  });

  return `${baseUrl}/${toOsrmProfile(travelMode)}/${coordinates}?${params.toString()}`;
}

function getRouteStrategy(stopCount: number): OsrmRouteStrategy {
  if (stopCount <= detailedRouteStopLimit) {
    return { chunked: false, overview: "full", steps: true };
  }

  if (stopCount <= simplifiedRouteStopLimit) {
    return { chunked: false, overview: "simplified", steps: false };
  }

  return { chunked: true, overview: "simplified", steps: false };
}

function getRouteChunks(points: MapRoutePoint[]) {
  const chunks: MapRoutePoint[][] = [];
  let startIndex = 0;

  while (startIndex < points.length - 1) {
    const endIndex = Math.min(points.length, startIndex + osrmRouteChunkSize);
    const chunk = points.slice(startIndex, endIndex);

    if (chunk.length >= 2) {
      chunks.push(chunk);
    }

    startIndex = endIndex - 1;
  }

  return chunks;
}

function mergeChunkedRoutes(routes: MapRoute[], requestPoints: MapRoutePoint[]): MapRoute {
  const points = routes.flatMap((route, index) =>
    index === 0 ? route.points : route.points.slice(1)
  );
  const legs = routes.flatMap((route) => route.legs);
  const distanceMeters = sumNullable(routes.map((route) => route.distanceMeters));
  const durationSeconds = sumNullable(routes.map((route) => route.durationSeconds));

  return {
    provider: osrmProviderId,
    points: points.length >= 2 ? points : requestPoints,
    distanceMeters,
    durationSeconds,
    legs
  };
}

function mapOsrmRoute(route: OsrmRoute, requestPoints: MapRoutePoint[]): MapRoute {
  const routePoints = route.geometry ? decodePolyline(route.geometry) : requestPoints;
  const legs = requestPoints.slice(1).map((end, index) => {
    const start = requestPoints[index] ?? end;
    const osrmLeg = route.legs?.[index];

    return mapOsrmLeg(osrmLeg, start, end);
  });

  return {
    provider: osrmProviderId,
    points: routePoints.length >= 2 ? routePoints : requestPoints,
    encodedPolyline: route.geometry,
    distanceMeters: typeof route.distance === "number" ? route.distance : null,
    durationSeconds: typeof route.duration === "number" ? route.duration : null,
    legs
  };
}

function mapOsrmLeg(
  leg: OsrmLeg | undefined,
  start: MapRoutePoint,
  end: MapRoutePoint
): MapRouteLeg {
  const points = getLegPoints(leg, start, end);

  return {
    start,
    end,
    distanceMeters: typeof leg?.distance === "number" ? leg.distance : null,
    durationSeconds: typeof leg?.duration === "number" ? leg.duration : null,
    points
  };
}

function getLegPoints(
  leg: OsrmLeg | undefined,
  start: MapRoutePoint,
  end: MapRoutePoint
): MapRoutePoint[] {
  const points =
    leg?.steps?.flatMap((step, index) => {
      if (!step.geometry) {
        return [];
      }

      const stepPoints = decodePolyline(step.geometry);

      return index === 0 ? stepPoints : stepPoints.slice(1);
    }) ?? [];

  return points.length >= 2 ? points : [start, end];
}

function createTimeoutSignal(signal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new Error("OSRM route request timed out"));
  }, mapConfig.osrmTimeoutMs);

  const abort = () => controller.abort(signal?.reason);

  if (signal?.aborted) {
    abort();
  } else {
    signal?.addEventListener("abort", abort, { once: true });
  }

  const cleanup = () => {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  };

  controller.signal.addEventListener("abort", cleanup, { once: true });

  return {
    cleanup,
    signal: controller.signal
  };
}

function toOsrmProfile(travelMode: Exclude<MapTravelMode, "transit">) {
  if (travelMode === "walking") {
    return "foot";
  }
  if (travelMode === "bicycling") {
    return "bike";
  }

  return "driving";
}

function sumNullable(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => typeof value === "number");

  if (numericValues.length !== values.length) {
    return null;
  }

  return numericValues.reduce((total, value) => total + value, 0);
}

async function readOsrmPayload(response: Response) {
  try {
    return (await response.clone().json()) as OsrmRouteResponse;
  } catch {
    return null;
  }
}

function normalizeOsrmRequestError(error: unknown) {
  if (isTimeoutError(error)) {
    return new MapProviderError({
      code: "MAP_PROVIDER_TIMEOUT",
      provider: osrmProviderId,
      message: "OSRM route request timed out",
      cause: error
    });
  }

  if (isOfflineError(error)) {
    return new MapProviderError({
      code: "MAP_PROVIDER_OFFLINE",
      provider: osrmProviderId,
      message: "Network is offline",
      cause: error
    });
  }

  return new MapProviderError({
    code: "MAP_PROVIDER_REQUEST_FAILED",
    provider: osrmProviderId,
    message: "OSRM route request failed",
    cause: error
  });
}

function isValidRoutePoint(point: MapRoutePoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("timed out");
}

function isOfflineError(error: unknown) {
  const isBrowserOffline =
    typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine;

  return (
    isBrowserOffline ||
    (error instanceof TypeError && /fetch|network|offline|failed/i.test(error.message))
  );
}
