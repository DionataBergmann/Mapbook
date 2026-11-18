import { photoKind, toGalleryPhoto } from './gallery-photo';

const takenAt = Date.UTC(2014, 0, 12, 15, 30);

describe('toGalleryPhoto', () => {
  test('converte id, data, localização e tipo', () => {
    expect(
      toGalleryPhoto({
        id: 'asset-1',
        creationTime: takenAt,
        location: { latitude: -30.0346, longitude: -51.2177 },
      }),
    ).toEqual({
      assetId: 'asset-1',
      takenAt,
      latitude: -30.0346,
      longitude: -51.2177,
      kind: 'photo',
    });
  });

  test('marca print de tela pelo mediaSubtype', () => {
    expect(
      toGalleryPhoto({
        id: 'asset-1',
        creationTime: takenAt,
        mediaSubtypes: ['screenshot'],
      }),
    ).toMatchObject({ kind: 'screenshot' });
  });

  test('foto sem localização fica com latitude e longitude nulas', () => {
    expect(toGalleryPhoto({ id: 'asset-1', creationTime: takenAt })).toMatchObject({
      latitude: null,
      longitude: null,
    });
  });

  test('descarta a localização 0,0', () => {
    expect(
      toGalleryPhoto({
        id: 'asset-1',
        creationTime: takenAt,
        location: { latitude: 0, longitude: 0 },
      }),
    ).toMatchObject({ latitude: null, longitude: null });
  });

  test('mantém localização com só uma coordenada zero', () => {
    expect(
      toGalleryPhoto({
        id: 'asset-1',
        creationTime: takenAt,
        location: { latitude: 51.4779, longitude: 0 },
      }),
    ).toMatchObject({ latitude: 51.4779, longitude: 0 });
  });

  test.each([
    { latitude: 91, longitude: 10 },
    { latitude: 10, longitude: -181 },
    { latitude: Number.NaN, longitude: 10 },
  ])('descarta localização inválida %o', (location) => {
    expect(toGalleryPhoto({ id: 'asset-1', creationTime: takenAt, location })).toMatchObject({
      latitude: null,
      longitude: null,
    });
  });

  test.each([0, -1, Number.NaN])('data %p vira nula', (creationTime) => {
    expect(toGalleryPhoto({ id: 'asset-1', creationTime }).takenAt).toBeNull();
  });
});

describe('photoKind', () => {
  test('sem subtype é foto', () => {
    expect(photoKind(undefined)).toBe('photo');
  });

  test('screenshot ganha prioridade sobre outros subtypes', () => {
    expect(photoKind(['hdr', 'screenshot'])).toBe('screenshot');
  });
});
