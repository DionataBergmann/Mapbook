import type { Asset, AssetsOptions, PagedInfo } from 'expo-media-library/legacy';

import { readGallery, type FetchAssets, type GalleryPage } from './read-gallery';

function fakeAsset(index: number): Asset {
  return {
    id: `asset-${index}`,
    filename: `IMG_${index}.HEIC`,
    uri: `ph://asset-${index}`,
    mediaType: 'photo',
    width: 4032,
    height: 3024,
    creationTime: 1_700_000_000_000 - index * 60_000,
    modificationTime: 1_700_000_000_000,
    duration: 0,
    location: { latitude: 51.0447, longitude: -114.0719 },
  };
}

function fakeLibrary(size: number) {
  const calls: AssetsOptions[] = [];
  const fetchAssets: FetchAssets = async (options) => {
    calls.push(options);
    const start = options.after ? Number(options.after) + 1 : 0;
    const end = Math.min(start + (options.first ?? 20), size);
    const assets = Array.from({ length: end - start }, (_, i) => fakeAsset(start + i));
    const page: PagedInfo<Asset> = {
      assets,
      endCursor: String(end - 1),
      hasNextPage: end < size,
      totalCount: size,
    };
    return page;
  };
  return { fetchAssets, calls };
}

async function collect(pages: AsyncGenerator<GalleryPage>) {
  const result: GalleryPage[] = [];
  for await (const page of pages) result.push(page);
  return result;
}

describe('readGallery', () => {
  test('percorre todas as páginas usando o cursor da anterior', async () => {
    const { fetchAssets, calls } = fakeLibrary(1_200);

    const pages = await collect(readGallery({ pageSize: 500, fetchAssets }));

    expect(pages.map((page) => page.photos.length)).toEqual([500, 500, 200]);
    expect(calls.map((call) => call.after)).toEqual([undefined, '499', '999']);
    expect(pages[2].photos.at(-1)?.assetId).toBe('asset-1199');
  });

  test('pede fotos da mais recente para a mais antiga', async () => {
    const { fetchAssets, calls } = fakeLibrary(10);

    await collect(readGallery({ fetchAssets }));

    expect(calls[0]).toMatchObject({ mediaType: 'photo', sortBy: [['creationTime', false]] });
  });

  test('para no limite sem pedir fotos além dele', async () => {
    const { fetchAssets, calls } = fakeLibrary(5_000);

    const pages = await collect(readGallery({ pageSize: 500, limit: 1_200, fetchAssets }));

    expect(pages.flatMap((page) => page.photos)).toHaveLength(1_200);
    expect(calls.map((call) => call.first)).toEqual([500, 500, 200]);
  });

  test('repassa a data de corte da leitura incremental', async () => {
    const { fetchAssets, calls } = fakeLibrary(10);

    await collect(readGallery({ createdAfter: 1_699_000_000_000, fetchAssets }));

    expect(calls[0].createdAfter).toBe(1_699_000_000_000);
  });

  test('galeria vazia devolve uma página vazia com o total zero', async () => {
    const { fetchAssets } = fakeLibrary(0);

    const pages = await collect(readGallery({ fetchAssets }));

    expect(pages).toEqual([{ photos: [], totalCount: 0 }]);
  });
});
