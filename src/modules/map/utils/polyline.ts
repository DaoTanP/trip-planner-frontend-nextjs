import type { MapRoutePoint } from "@/modules/map/types/map.types";

export function decodePolyline(encodedPolyline: string): MapRoutePoint[] {
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const points: MapRoutePoint[] = [];

  while (index < encodedPolyline.length) {
    const latitudeResult = decodeSignedValue(encodedPolyline, index);
    index = latitudeResult.nextIndex;
    latitude += latitudeResult.value;

    const longitudeResult = decodeSignedValue(encodedPolyline, index);
    index = longitudeResult.nextIndex;
    longitude += longitudeResult.value;

    points.push({
      latitude: latitude / 100_000,
      longitude: longitude / 100_000
    });
  }

  return points;
}

export function encodePolyline(points: MapRoutePoint[]) {
  let previousLatitude = 0;
  let previousLongitude = 0;

  return points
    .map((point) => {
      const latitude = Math.round(point.latitude * 100_000);
      const longitude = Math.round(point.longitude * 100_000);
      const encoded =
        encodeSignedValue(latitude - previousLatitude) +
        encodeSignedValue(longitude - previousLongitude);

      previousLatitude = latitude;
      previousLongitude = longitude;

      return encoded;
    })
    .join("");
}

function decodeSignedValue(value: string, startIndex: number) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte = 0;

  do {
    byte = value.charCodeAt(index) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
    index += 1;
  } while (byte >= 0x20 && index <= value.length);

  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    nextIndex: index
  };
}

function encodeSignedValue(value: number) {
  let nextValue = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";

  while (nextValue >= 0x20) {
    encoded += String.fromCharCode((0x20 | (nextValue & 0x1f)) + 63);
    nextValue >>= 5;
  }

  return encoded + String.fromCharCode(nextValue + 63);
}
