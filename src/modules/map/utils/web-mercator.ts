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
