import type { GalleryPhoto } from './gallery-photo';

export type ReadMeasurement = {
  photos: number;
  withDate: number;
  withLocation: number;
  firstPageMs: number;
  elapsedMs: number;
};

/** `ok`: Mundo em ~10 s com 2 mil fotos. `nativo`: precisa de leitura em lote nativa. */
export type ReadVerdict = 'ok' | 'avaliar' | 'nativo';

const OK_MS_PER_THOUSAND = 5_000;
const NATIVE_MS_PER_THOUSAND = 15_000;

export function countPhotos(photos: GalleryPhoto[]) {
  return {
    photos: photos.length,
    withDate: photos.filter((photo) => photo.takenAt !== null).length,
    withLocation: photos.filter((photo) => photo.latitude !== null).length,
  };
}

export function msPerThousand({ photos, elapsedMs }: ReadMeasurement): number | null {
  return photos === 0 ? null : (elapsedMs / photos) * 1_000;
}

export function readVerdict(measurement: ReadMeasurement): ReadVerdict | null {
  const perThousand = msPerThousand(measurement);
  if (perThousand === null) return null;
  if (perThousand <= OK_MS_PER_THOUSAND) return 'ok';
  if (perThousand <= NATIVE_MS_PER_THOUSAND) return 'avaliar';
  return 'nativo';
}
