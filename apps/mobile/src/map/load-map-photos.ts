import { syncPhotoIndex, type GalleryPageSource, type PhotoIndex } from '@/photo-index/photo-index';

import { cameraForMarkers, toMapMarkers, type MapCamera, type MapMarker } from './map-markers';

export type MapLoad =
  | { status: 'denied' }
  | { status: 'empty' }
  | { status: 'ready'; markers: MapMarker[]; camera: MapCamera };

export async function loadMapPhotos(deps: {
  requestPermission: () => Promise<boolean>;
  openIndex: () => Promise<PhotoIndex>;
  read: GalleryPageSource;
}): Promise<MapLoad> {
  const index = await deps.openIndex();
  const cached = toMapMarkers(await index.list('map'));
  const granted = await deps.requestPermission();

  if (!granted) {
    return cached.length === 0 ? { status: 'denied' } : present(cached);
  }

  try {
    await syncPhotoIndex(index, deps.read);
  } catch {
    return cached.length === 0 ? { status: 'empty' } : present(cached);
  }

  const markers = toMapMarkers(await index.list('map'));
  return markers.length === 0 ? { status: 'empty' } : present(markers);
}

function present(markers: MapMarker[]): MapLoad {
  const camera = cameraForMarkers(markers);
  if (!camera) return { status: 'empty' };
  return { status: 'ready', markers, camera };
}
