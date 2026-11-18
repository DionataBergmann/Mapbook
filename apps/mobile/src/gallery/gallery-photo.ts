import type { Asset } from 'expo-media-library/legacy';

export type GalleryPhoto = {
  assetId: string;
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
};

type AssetFields = Pick<Asset, 'id' | 'creationTime' | 'location'>;

export function toGalleryPhoto(asset: AssetFields): GalleryPhoto {
  const takenAt =
    Number.isFinite(asset.creationTime) && asset.creationTime > 0 ? asset.creationTime : null;
  const location = isUsableLocation(asset.location) ? asset.location : null;

  return {
    assetId: asset.id,
    takenAt,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
  };
}

function isUsableLocation(location: Asset['location']): location is NonNullable<Asset['location']> {
  if (!location) return false;
  const { latitude, longitude } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  // Câmeras sem GPS gravam 0,0, que cai no oceano.
  return latitude !== 0 || longitude !== 0;
}
