import { mapConfig } from "@/modules/map/config/map.config";
import { MapProviderError } from "@/modules/map/providers/shared/map-provider-error";

import type { GoogleMapsApi } from "./google-map.types";

interface LoadGoogleMapsOptions {
  language?: string | undefined;
  region?: string | undefined;
}

const googleMapsScriptId = "trip-planner-google-maps";

export function loadGoogleMaps(options: LoadGoogleMapsOptions = {}) {
  if (typeof window === "undefined") {
    return Promise.reject(
      new MapProviderError({
        code: "MAP_PROVIDER_UNSUPPORTED",
        provider: "google",
        message: "Google Maps can only be loaded in the browser"
      })
    );
  }

  const loadedMaps = getGoogleMapsFromWindow();

  if (loadedMaps) {
    return Promise.resolve(loadedMaps);
  }

  if (window.__tripPlannerGoogleMapsPromise) {
    return window.__tripPlannerGoogleMapsPromise;
  }

  if (!mapConfig.googleMapsApiKey) {
    return Promise.reject(
      new MapProviderError({
        code: "MAP_PROVIDER_NOT_CONFIGURED",
        provider: "google",
        message: "Google Maps API key is not configured"
      })
    );
  }

  window.__tripPlannerGoogleMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existingScript = document.getElementById(googleMapsScriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        const existingMaps = getGoogleMapsFromWindow();

        if (existingMaps) {
          resolve(existingMaps);
          return;
        }

        rejectGoogleMapsLoad(reject);
      });
      existingScript.addEventListener("error", () => rejectGoogleMapsLoad(reject));
      return;
    }

    const params = new URLSearchParams({
      key: mapConfig.googleMapsApiKey,
      libraries: "places",
      loading: "async",
      v: "weekly"
    });
    const language = options.language || mapConfig.googleMapsLanguage;
    const region = options.region || mapConfig.googleMapsRegion;

    if (language) {
      params.set("language", language);
    }
    if (region) {
      params.set("region", region);
    }

    const script = document.createElement("script");
    script.id = googleMapsScriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.dataset.tripPlannerGoogleMaps = "true";
    script.addEventListener("load", () => {
      const existingMaps = getGoogleMapsFromWindow();

      if (existingMaps) {
        resolve(existingMaps);
        return;
      }

      rejectGoogleMapsLoad(reject);
    });
    script.addEventListener("error", () => rejectGoogleMapsLoad(reject));

    document.head.append(script);
  }).catch((error: unknown) => {
    delete window.__tripPlannerGoogleMapsPromise;
    throw error;
  });

  return window.__tripPlannerGoogleMapsPromise;
}

function rejectGoogleMapsLoad(reject: (reason?: unknown) => void) {
  reject(
    new MapProviderError({
      code: "MAP_PROVIDER_LOAD_FAILED",
      provider: "google",
      message: "Google Maps could not be loaded"
    })
  );
}

function getGoogleMapsFromWindow() {
  return (window.google as { maps?: GoogleMapsApi } | undefined)?.maps;
}
