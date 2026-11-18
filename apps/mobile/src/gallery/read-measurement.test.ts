import { countPhotos, msPerThousand, readVerdict, type ReadMeasurement } from './read-measurement';

function measurement(photos: number, elapsedMs: number): ReadMeasurement {
  return { photos, withDate: photos, withLocation: photos, firstPageMs: 0, elapsedMs };
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
  test('conta fotos com data e com localização', () => {
    expect(
      countPhotos([
        { assetId: 'a', takenAt: 1, latitude: 1, longitude: 1 },
        { assetId: 'b', takenAt: 1, latitude: null, longitude: null },
        { assetId: 'c', takenAt: null, latitude: null, longitude: null },
      ]),
    ).toEqual({ photos: 3, withDate: 2, withLocation: 1 });
  });
});
