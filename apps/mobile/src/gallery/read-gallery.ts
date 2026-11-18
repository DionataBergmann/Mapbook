import {
  getAssetsAsync,
  type Asset,
  type AssetsOptions,
  type PagedInfo,
} from 'expo-media-library/legacy';
import { Platform } from 'react-native';

import { toGalleryPhoto, type GalleryPhoto } from './gallery-photo';

export type GalleryPage = {
  photos: GalleryPhoto[];
  totalCount: number;
};

export type FetchAssets = (options: AssetsOptions) => Promise<PagedInfo<Asset>>;

type ReadGalleryOptions = {
  pageSize?: number;
  limit?: number;
  createdAfter?: number;
  fetchAssets?: FetchAssets;
};

/** Lê as fotos da mais recente para a mais antiga, uma página por vez. */
export async function* readGallery({
  pageSize = 500,
  limit = Number.POSITIVE_INFINITY,
  createdAfter,
  fetchAssets = getAssetsAsync,
}: ReadGalleryOptions = {}): AsyncGenerator<GalleryPage> {
  let after: string | undefined;
  let read = 0;

  while (read < limit) {
    const page = await fetchAssets({
      first: Math.min(pageSize, limit - read),
      after,
      mediaType: 'photo',
      sortBy: [['creationTime', false]],
      createdAfter,
      // No iOS a localização já vem na página; no Android só com a leitura completa.
      resolveWithFullInfo: Platform.OS === 'android',
    });

    const photos = page.assets.slice(0, limit - read).map(toGalleryPhoto);
    read += photos.length;
    yield { photos, totalCount: page.totalCount };

    if (!page.hasNextPage || page.assets.length === 0) return;
    after = page.endCursor;
  }
}
