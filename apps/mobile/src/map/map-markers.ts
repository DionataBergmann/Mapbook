import type { IndexedPhoto } from '@/photo-index/photo-role';

export type MapMarker = {
  assetId: string;
  latitude: number;
  longitude: number;
};

export type MapCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
};

/** Uma foto sozinha abre no bairro em volta do pino. A coordenada continua a da foto. */
const SINGLE_PHOTO_ZOOM = 14;
const MIN_ZOOM = 1;
const MAX_ZOOM = 16;

export function toMapMarkers(
  photos: Pick<IndexedPhoto, 'assetId' | 'latitude' | 'longitude' | 'role'>[],
): MapMarker[] {
  return photos.flatMap((photo) => {
    if (photo.role !== 'map' || photo.latitude === null || photo.longitude === null) return [];
    return [{ assetId: photo.assetId, latitude: photo.latitude, longitude: photo.longitude }];
  });
}

/** Enquadra a câmera em volta dos pinos, sem mover a coordenada de nenhuma foto. */
export function cameraForMarkers(markers: MapMarker[]): MapCamera | null {
  if (markers.length === 0) return null;

  let minLatitude = Infinity;
  let maxLatitude = -Infinity;
  let minLongitude = Infinity;
  let maxLongitude = -Infinity;

  for (const marker of markers) {
    minLatitude = Math.min(minLatitude, marker.latitude);
    maxLatitude = Math.max(maxLatitude, marker.latitude);
    minLongitude = Math.min(minLongitude, marker.longitude);
    maxLongitude = Math.max(maxLongitude, marker.longitude);
  }

  const latitude = (minLatitude + maxLatitude) / 2;
  const longitude = (minLongitude + maxLongitude) / 2;
  const span = Math.max(maxLatitude - minLatitude, maxLongitude - minLongitude) * 1.4;

  if (span === 0) {
    return { latitude, longitude, zoom: SINGLE_PHOTO_ZOOM };
  }

  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.log2(360 / span)));
  return { latitude, longitude, zoom };
}
