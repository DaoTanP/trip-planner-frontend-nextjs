import { afterEach, describe, expect, it, vi } from "vitest";

import type { MapProviderError } from "@/modules/map/providers/shared/map-provider-error";
import type { MapRoutePoint, MapTravelMode } from "@/modules/map/types/map.types";

import { osrmRoutingProvider } from "./osrm-routing.provider";

function makePoints(count: number): MapRoutePoint[] {
  return Array.from({ length: count }, (_, index) => ({
    latitude: 10 + index / 1000,
    longitude: 20 + index / 1000
  }));
}

function installOsrmFetchMock() {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const coordinateText = url.split("?")[0]?.split("/").at(-1) ?? "";
    const coordinateCount = coordinateText.split(";").filter(Boolean).length;

    return new Response(
      JSON.stringify({
        code: "Ok",
        routes: [
          {
            distance: coordinateCount * 1000,
            duration: coordinateCount * 120,
            legs: Array.from({ length: Math.max(0, coordinateCount - 1) }, () => ({
              distance: 1000,
              duration: 120
            }))
          }
        ]
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200
      }
    );
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("osrmRoutingProvider", () => {
  it.each([
    ["driving", "/routed-car/route/v1/driving/"],
    ["walking", "/routed-foot/route/v1/foot/"],
    ["bicycling", "/routed-bike/route/v1/bike/"]
  ] satisfies Array<[MapTravelMode, string]>)(
    "uses the OpenStreetMap %s backend and OSRM profile",
    async (travelMode, expectedPath) => {
      const fetchMock = installOsrmFetchMock();

      await osrmRoutingProvider.getRoute({ points: makePoints(2), travelMode });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toContain(expectedPath);
    }
  );

  it("uses full geometry with steps for small trips", async () => {
    const fetchMock = installOsrmFetchMock();

    await osrmRoutingProvider.getRoute({ points: makePoints(10), travelMode: "driving" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("overview=full");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("steps=true");
  });

  it.each([50, 100])("uses simplified geometry without steps for %i stops", async (count) => {
    const fetchMock = installOsrmFetchMock();

    await osrmRoutingProvider.getRoute({ points: makePoints(count), travelMode: "driving" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("overview=simplified");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("steps=false");
  });

  it("chunks 200-stop routes with simplified geometry", async () => {
    const fetchMock = installOsrmFetchMock();

    await osrmRoutingProvider.getRoute({ points: makePoints(200), travelMode: "driving" });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    fetchMock.mock.calls.forEach(([url]) => {
      expect(String(url)).toContain("overview=simplified");
      expect(String(url)).toContain("steps=false");
    });
  });

  it("rejects routes above the supported stop ceiling", async () => {
    const fetchMock = installOsrmFetchMock();

    await expect(
      osrmRoutingProvider.getRoute({ points: makePoints(201), travelMode: "driving" })
    ).rejects.toMatchObject({
      code: "MAP_PROVIDER_TOO_MANY_WAYPOINTS"
    } satisfies Partial<MapProviderError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects transit mode instead of silently downgrading to driving", async () => {
    const fetchMock = installOsrmFetchMock();

    await expect(
      osrmRoutingProvider.getRoute({ points: makePoints(10), travelMode: "transit" })
    ).rejects.toMatchObject({
      code: "MAP_PROVIDER_UNSUPPORTED_TRAVEL_MODE"
    } satisfies Partial<MapProviderError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
