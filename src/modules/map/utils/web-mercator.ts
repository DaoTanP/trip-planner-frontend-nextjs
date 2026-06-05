const tileSize = 256;

export function longitudeToWorldX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * tileSize * 2 ** zoom;
}

export function latitudeToWorldY(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180;
  const mercator = Math.log(Math.tan(radians) + 1 / Math.cos(radians));

  return ((1 - mercator / Math.PI) / 2) * tileSize * 2 ** zoom;
}

export function worldXToTileX(worldX: number) {
  return Math.floor(worldX / tileSize);
}

export function worldYToTileY(worldY: number) {
  return Math.floor(worldY / tileSize);
}

export function worldXToLongitude(worldX: number, zoom: number) {
  return (worldX / (tileSize * 2 ** zoom)) * 360 - 180;
}

export function worldYToLatitude(worldY: number, zoom: number) {
  const normalized = 1 - (2 * worldY) / (tileSize * 2 ** zoom);
  const radians = Math.atan(Math.sinh(Math.PI * normalized));

  return (radians * 180) / Math.PI;
}

export function projectPoint(
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number; zoom: number }
) {
  const centerX = longitudeToWorldX(center.longitude, center.zoom);
  const centerY = latitudeToWorldY(center.latitude, center.zoom);

  return {
    x: longitudeToWorldX(point.longitude, center.zoom) - centerX,
    y: latitudeToWorldY(point.latitude, center.zoom) - centerY
  };
}

export const webMercatorTileSize = tileSize;
