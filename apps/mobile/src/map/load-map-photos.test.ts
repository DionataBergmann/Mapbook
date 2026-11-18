import type { GalleryPhoto } from '@/gallery/gallery-photo';
import { memorySql } from '@/photo-index/memory-sql';
import { createPhotoIndex } from '@/photo-index/photo-index';
import { indexPhoto } from '@/photo-index/photo-role';

import { loadMapPhotos, type MapLoad } from './load-map-photos';

function photo(
  assetId: string,
  location: { latitude: number; longitude: number } | null,
  kind: GalleryPhoto['kind'] = 'photo',
): GalleryPhoto {
  return {
    assetId,
    takenAt: 1_700_000_000_000,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    kind,
  };
}

async function openIndex() {
  const index = createPhotoIndex(memorySql());
  await index.migrate();
  return index;
}

function pages(photos: GalleryPhoto[]) {
  const calls: { createdAfter?: number }[] = [];
  const read = async function* (options: { createdAfter?: number }) {
    calls.push(options);
    yield { photos };
  };
  return { read, calls };
}

describe('loadMapPhotos', () => {
  test('coloca no mapa só a foto com GPS, na coordenada lida', async () => {
    const index = await openIndex();
    const { read } = pages([
      photo('gps', { latitude: -30.03464789, longitude: -51.21765812 }),
      photo('sem-gps', null),
      photo('print', { latitude: 1, longitude: 2 }, 'screenshot'),
    ]);

    const result = await loadMapPhotos({
      requestPermission: async () => true,
      openIndex: async () => index,
      read,
    });

    expect(result).toMatchObject({
      status: 'ready',
      markers: [
        {
          assetId: 'gps',
          latitude: -30.03464789,
          longitude: -51.21765812,
          takenAt: 1_700_000_000_000,
        },
      ],
      camera: { latitude: -30.03464789, longitude: -51.21765812 },
    });
  });

  test('sem permissão mostra o que já estava gravado e não relê a galeria', async () => {
    const index = await openIndex();
    await index.upsert([indexPhoto(photo('gravada', { latitude: 51.0447, longitude: -114.0719 }))]);
    const { read, calls } = pages([photo('nova', { latitude: 10, longitude: 20 })]);

    const result = await loadMapPhotos({
      requestPermission: async () => false,
      openIndex: async () => index,
      read,
    });

    expect(calls).toEqual([]);
    expect(readyMarkers(result)).toEqual([
      { assetId: 'gravada', latitude: 51.0447, longitude: -114.0719, takenAt: 1_700_000_000_000 },
    ]);
  });

  test('sem permissão e sem índice avisa que falta permissão', async () => {
    const index = await openIndex();

    await expect(
      loadMapPhotos({
        requestPermission: async () => false,
        openIndex: async () => index,
        read: pages([]).read,
      }),
    ).resolves.toEqual({ status: 'denied' });
  });

  test('se a leitura falha, o mapa continua com as fotos já gravadas', async () => {
    const index = await openIndex();
    await index.upsert([indexPhoto(photo('gravada', { latitude: 10, longitude: 20 }))]);
    const read = async function* () {
      throw new Error('interrompeu');
    };

    const result = await loadMapPhotos({
      requestPermission: async () => true,
      openIndex: async () => index,
      read,
    });

    expect(readyMarkers(result)).toEqual([
      { assetId: 'gravada', latitude: 10, longitude: 20, takenAt: 1_700_000_000_000 },
    ]);
  });

  test('galeria sem GPS fica vazia', async () => {
    const index = await openIndex();

    await expect(
      loadMapPhotos({
        requestPermission: async () => true,
        openIndex: async () => index,
        read: pages([photo('sem-gps', null)]).read,
      }),
    ).resolves.toEqual({ status: 'empty' });
  });
});

function readyMarkers(result: MapLoad) {
  return result.status === 'ready' ? result.markers : result.status;
}
