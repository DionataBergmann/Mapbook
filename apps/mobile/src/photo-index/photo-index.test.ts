import type { GalleryPhoto, GalleryPhotoKind } from '@/gallery/gallery-photo';

import { memorySql } from './memory-sql';
import { createPhotoIndex, syncPhotoIndex, type GalleryPageSource } from './photo-index';

function photo(
  assetId: string,
  takenAt: number | null,
  location: { latitude: number; longitude: number } | null,
  kind: GalleryPhotoKind = 'photo',
): GalleryPhoto {
  return {
    assetId,
    takenAt,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    kind,
  };
}

function library(photos: GalleryPhoto[]) {
  const calls: { createdAfter?: number }[] = [];
  const read: GalleryPageSource = async function* (options) {
    calls.push(options);
    const visible = photos.filter(
      (item) => options.createdAfter === undefined || (item.takenAt ?? -1) > options.createdAfter,
    );
    yield { photos: visible };
  };
  return { read, calls };
}

async function openIndex() {
  const index = createPhotoIndex(memorySql());
  await index.migrate();
  return index;
}

describe('createPhotoIndex', () => {
  test('separa mapa, classificar e print, com o print fora das outras listas', async () => {
    const index = await openIndex();

    await index.upsert([
      {
        assetId: 'gps',
        takenAt: 30,
        latitude: -30,
        longitude: -51,
        kind: 'photo',
        role: 'map',
      },
      {
        assetId: 'sem-gps',
        takenAt: 20,
        latitude: null,
        longitude: null,
        kind: 'photo',
        role: 'classify',
      },
      {
        assetId: 'print',
        takenAt: 10,
        latitude: 1,
        longitude: 2,
        kind: 'screenshot',
        role: 'screenshot',
      },
    ]);

    expect(await index.counts()).toEqual({ map: 1, classify: 1, screenshot: 1 });
    expect(await index.list('map')).toEqual([
      {
        assetId: 'gps',
        takenAt: 30,
        latitude: -30,
        longitude: -51,
        kind: 'photo',
        role: 'map',
      },
    ]);
    expect((await index.list('screenshot'))[0]).toMatchObject({
      assetId: 'print',
      latitude: 1,
      longitude: 2,
    });
  });

  test('atualiza a mesma foto quando ela passa a ter GPS', async () => {
    const index = await openIndex();
    const base = {
      assetId: 'foto',
      takenAt: 10,
      kind: 'photo' as const,
    };

    await index.upsert([{ ...base, latitude: null, longitude: null, role: 'classify' }]);
    await index.upsert([{ ...base, latitude: 10, longitude: 20, role: 'map' }]);

    expect(await index.counts()).toEqual({ map: 1, classify: 0, screenshot: 0 });
    expect(await index.list('map')).toHaveLength(1);
  });

  test('lista da mais recente para a mais antiga e deixa data nula no fim', async () => {
    const index = await openIndex();
    await index.upsert([
      { assetId: 'b', takenAt: 2, latitude: 1, longitude: 1, kind: 'photo', role: 'map' },
      { assetId: 'a', takenAt: 2, latitude: 1, longitude: 1, kind: 'photo', role: 'map' },
      { assetId: 'c', takenAt: 9, latitude: 1, longitude: 1, kind: 'photo', role: 'map' },
      { assetId: 'd', takenAt: null, latitude: 1, longitude: 1, kind: 'photo', role: 'map' },
    ]);

    expect((await index.list('map')).map((item) => item.assetId)).toEqual(['c', 'a', 'b', 'd']);
  });
});

describe('syncPhotoIndex', () => {
  test('a primeira passagem lê tudo e a seguinte só o que é mais novo', async () => {
    const index = await openIndex();
    const photos = [
      photo('nova', 300, { latitude: 1, longitude: 2 }),
      photo('antiga', 100, null),
      photo('print', 200, null, 'screenshot'),
    ];
    const { read, calls } = library(photos);

    const first = await syncPhotoIndex(index, read);

    expect(first).toEqual({ upserted: 3, createdAfter: null });
    expect(calls[0]).toEqual({});
    expect(await index.counts()).toEqual({ map: 1, classify: 1, screenshot: 1 });

    photos.push(photo('chegou', 400, { latitude: 3, longitude: 4 }));
    const second = await syncPhotoIndex(index, read);

    expect(second).toEqual({ upserted: 1, createdAfter: 300 });
    expect(calls[1]).toEqual({ createdAfter: 300 });
    expect(await index.counts()).toEqual({ map: 2, classify: 1, screenshot: 1 });
  });

  test('galeria vazia termina e a próxima leitura continua completa', async () => {
    const index = await openIndex();
    const { read, calls } = library([]);

    expect(await syncPhotoIndex(index, read)).toEqual({ upserted: 0, createdAfter: null });
    expect(await syncPhotoIndex(index, read)).toEqual({ upserted: 0, createdAfter: null });
    expect(calls).toEqual([{}, {}]);
  });

  test('passagem interrompida faz a seguinte reler a galeria inteira', async () => {
    const index = await openIndex();
    const photos = [photo('foto', 100, { latitude: 1, longitude: 2 })];
    await syncPhotoIndex(index, library(photos).read);

    const failing: GalleryPageSource = async function* () {
      throw new Error('interrompeu');
    };
    await expect(syncPhotoIndex(index, failing)).rejects.toThrow('interrompeu');

    const { read, calls } = library(photos);
    const recovered = await syncPhotoIndex(index, read);

    expect(recovered.createdAfter).toBeNull();
    expect(calls[0]).toEqual({});
    expect(await index.counts()).toEqual({ map: 1, classify: 0, screenshot: 0 });
  });
});
