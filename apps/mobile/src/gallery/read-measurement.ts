import type { GalleryPhoto, GalleryPhotoKind } from './gallery-photo';

export type KindCount = {
  photos: number;
  withLocation: number;
};

export type ReadMeasurement = {
  photos: number;
  withDate: number;
  withLocation: number;
  byKind: Record<GalleryPhotoKind, KindCount>;
  firstPageMs: number;
  elapsedMs: number;
};

/** `ok`: Mundo em ~10 s com 2 mil fotos. `nativo`: precisa de leitura em lote nativa. */
export type ReadVerdict = 'ok' | 'avaliar' | 'nativo';

const OK_MS_PER_THOUSAND = 5_000;
const NATIVE_MS_PER_THOUSAND = 15_000;

const emptyKind = (): KindCount => ({ photos: 0, withLocation: 0 });

export function countPhotos(photos: GalleryPhoto[]) {
  const byKind: Record<GalleryPhotoKind, KindCount> = {
    photo: emptyKind(),
    screenshot: emptyKind(),
  };

  let withDate = 0;
  let withLocation = 0;

  for (const photo of photos) {
    const bucket = byKind[photo.kind];
    bucket.photos += 1;
    if (photo.takenAt !== null) withDate += 1;
    if (photo.latitude !== null) {
      withLocation += 1;
      bucket.withLocation += 1;
    }
  }

  return {
    photos: photos.length,
    withDate,
    withLocation,
    byKind,
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
