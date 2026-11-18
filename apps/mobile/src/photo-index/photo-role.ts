import type { GalleryPhoto, GalleryPhotoKind } from '@/gallery/gallery-photo';

/** `map` entra no mapa global. `classify` espera um lugar. `screenshot` fica de fora dos dois. */
export type PhotoRole = 'map' | 'classify' | 'screenshot';

export type IndexedPhoto = {
  assetId: string;
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
  kind: GalleryPhotoKind;
  role: PhotoRole;
};

export function photoRole(photo: Pick<GalleryPhoto, 'kind' | 'latitude' | 'longitude'>): PhotoRole {
  if (photo.kind === 'screenshot') return 'screenshot';
  if (photo.latitude === null || photo.longitude === null) return 'classify';
  return 'map';
}

export function indexPhoto(photo: GalleryPhoto): IndexedPhoto {
  return { ...photo, role: photoRole(photo) };
}
