import type { IndexedPhoto } from '@/photo-index/photo-role';

export type MapMarker = {
  assetId: string;
  latitude: number;
  longitude: number;
  takenAt: number | null;
};

export type MapPlace = {
  id: string;
  latitude: number;
  longitude: number;
  photos: MapMarker[];
};

/** Fotos tiradas no mesmo ponto, com a folga do GPS. Não move a foto para uma cidade. */
const SAME_PLACE_METERS = 40;
const EARTH_RADIUS_METERS = 6_371_000;

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
  photos: Pick<IndexedPhoto, 'assetId' | 'latitude' | 'longitude' | 'role' | 'takenAt'>[],
): MapMarker[] {
  return photos.flatMap((photo) => {
    if (photo.role !== 'map' || photo.latitude === null || photo.longitude === null) return [];
    return [
      {
        assetId: photo.assetId,
        latitude: photo.latitude,
        longitude: photo.longitude,
        takenAt: photo.takenAt,
      },
    ];
  });
}

/**
 * Junta fotos a até 40 m da mais recente. O marcador fica na coordenada dessa
 * foto; as outras continuam na galeria do ponto.
 */
export function groupPlaces(markers: MapMarker[]): MapPlace[] {
  const newestFirst = [...markers].sort(
    (a, b) => (b.takenAt ?? -1) - (a.takenAt ?? -1) || a.assetId.localeCompare(b.assetId),
  );
  const places: MapPlace[] = [];

  for (const marker of newestFirst) {
    const place = places.find(
      (candidate) => distanceMeters(candidate, marker) <= SAME_PLACE_METERS,
    );
    if (place) {
      place.photos.push(marker);
      continue;
    }
    places.push({
      id: marker.assetId,
      latitude: marker.latitude,
      longitude: marker.longitude,
      photos: [marker],
    });
  }

  return places;
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

function distanceMeters(
  origin: Pick<MapMarker, 'latitude' | 'longitude'>,
  target: Pick<MapMarker, 'latitude' | 'longitude'>,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(target.latitude - origin.latitude);
  const longitudeDelta = toRadians(target.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const targetLatitude = toRadians(target.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}
