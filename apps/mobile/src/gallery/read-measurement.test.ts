import { countPhotos, msPerThousand, readVerdict, type ReadMeasurement } from './read-measurement';

function measurement(photos: number, elapsedMs: number): ReadMeasurement {
  return {
    photos,
    withDate: photos,
    withLocation: photos,
    byKind: {
      photo: { photos, withLocation: photos },
      screenshot: { photos: 0, withLocation: 0 },
    },
    firstPageMs: 0,
    elapsedMs,
  };
}

describe('msPerThousand', () => {
  test('normaliza o tempo para mil fotos', () => {
    expect(msPerThousand(measurement(2_000, 6_000))).toBe(3_000);
  });

  test('sem fotos não há taxa', () => {
    expect(msPerThousand(measurement(0, 100))).toBeNull();
  });
});

describe('readVerdict', () => {
  test.each([
    [5_000, 'ok'],
    [5_001, 'avaliar'],
    [15_000, 'avaliar'],
    [15_001, 'nativo'],
  ] as const)('%p ms por mil fotos é %p', (elapsedMs, verdict) => {
    expect(readVerdict(measurement(1_000, elapsedMs))).toBe(verdict);
  });

  test('sem fotos não há veredito', () => {
    expect(readVerdict(measurement(0, 0))).toBeNull();
  });
});

describe('countPhotos', () => {
  test('conta fotos com data, localização e tipo', () => {
    expect(
      countPhotos([
        { assetId: 'a', takenAt: 1, latitude: 1, longitude: 1, kind: 'photo' },
        { assetId: 'b', takenAt: 1, latitude: null, longitude: null, kind: 'photo' },
        { assetId: 'c', takenAt: null, latitude: null, longitude: null, kind: 'screenshot' },
        { assetId: 'd', takenAt: 1, latitude: 2, longitude: 2, kind: 'screenshot' },
      ]),
    ).toEqual({
      photos: 4,
      withDate: 3,
      withLocation: 2,
      byKind: {
        photo: { photos: 2, withLocation: 1 },
        screenshot: { photos: 2, withLocation: 1 },
      },
    });
  });
});
