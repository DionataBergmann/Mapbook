import type { Asset, MediaSubtype } from 'expo-media-library/legacy';

export type GalleryPhotoKind = 'screenshot' | 'photo';

export type GalleryPhoto = {
  assetId: string;
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
  kind: GalleryPhotoKind;
};

type AssetFields = Pick<Asset, 'id' | 'creationTime' | 'location' | 'mediaSubtypes'>;

export function toGalleryPhoto(asset: AssetFields): GalleryPhoto {
  const takenAt =
    Number.isFinite(asset.creationTime) && asset.creationTime > 0 ? asset.creationTime : null;
  const location = isUsableLocation(asset.location) ? asset.location : null;

  return {
    assetId: asset.id,
    takenAt,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    kind: photoKind(asset.mediaSubtypes),
  };
}

export function photoKind(mediaSubtypes: MediaSubtype[] | undefined): GalleryPhotoKind {
  return mediaSubtypes?.includes('screenshot') ? 'screenshot' : 'photo';
}

function isUsableLocation(location: Asset['location']): location is NonNullable<Asset['location']> {
  if (!location) return false;
  const { latitude, longitude } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  // Câmeras sem GPS gravam 0,0, que cai no oceano.
  return latitude !== 0 || longitude !== 0;
}
