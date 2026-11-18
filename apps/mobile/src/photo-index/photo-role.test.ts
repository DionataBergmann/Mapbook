import { indexPhoto, photoRole } from './photo-role';

describe('photoRole', () => {
  test('foto com GPS vai para o mapa', () => {
    expect(photoRole({ kind: 'photo', latitude: -30.03, longitude: -51.21 })).toBe('map');
  });

  test('foto sem GPS vai para classificar', () => {
    expect(photoRole({ kind: 'photo', latitude: null, longitude: null })).toBe('classify');
  });

  test('coordenada incompleta vai para classificar', () => {
    expect(photoRole({ kind: 'photo', latitude: -30.03, longitude: null })).toBe('classify');
    expect(photoRole({ kind: 'photo', latitude: null, longitude: -51.21 })).toBe('classify');
  });

  test('print fica fora do mapa e da classificação, com ou sem GPS', () => {
    expect(photoRole({ kind: 'screenshot', latitude: -30.03, longitude: -51.21 })).toBe(
      'screenshot',
    );
    expect(photoRole({ kind: 'screenshot', latitude: null, longitude: null })).toBe('screenshot');
  });
});

describe('indexPhoto', () => {
  test('guarda a coordenada do print sem colocá-lo no mapa', () => {
    expect(
      indexPhoto({
        assetId: 'print-1',
        takenAt: 10,
        latitude: 1,
        longitude: 2,
        kind: 'screenshot',
      }),
    ).toEqual({
      assetId: 'print-1',
      takenAt: 10,
      latitude: 1,
      longitude: 2,
      kind: 'screenshot',
      role: 'screenshot',
    });
  });
});
