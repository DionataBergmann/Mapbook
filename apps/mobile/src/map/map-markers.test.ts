import { cameraForMarkers, groupPlaces, toMapMarkers } from './map-markers';

describe('toMapMarkers', () => {
  test('mantém a coordenada exata e deixa de fora foto sem GPS e print', () => {
    expect(
      toMapMarkers([
        {
          assetId: 'gps',
          latitude: -30.03464789,
          longitude: -51.21765812,
          takenAt: 20,
          role: 'map',
        },
        { assetId: 'sem-gps', latitude: null, longitude: null, takenAt: 10, role: 'classify' },
        {
          assetId: 'print',
          latitude: 1.23456789,
          longitude: 2.34567891,
          takenAt: 5,
          role: 'screenshot',
        },
        { assetId: 'incompleta', latitude: 10, longitude: null, takenAt: 1, role: 'map' },
      ]),
    ).toEqual([{ assetId: 'gps', latitude: -30.03464789, longitude: -51.21765812, takenAt: 20 }]);
  });
});

describe('groupPlaces', () => {
  const meters = 111_320;

  test('fotos a poucos metros ficam juntas, com a mais recente no marcador', () => {
    const places = groupPlaces([
      { assetId: 'antiga', latitude: 0, longitude: 0, takenAt: 1 },
      { assetId: 'nova', latitude: 20 / meters, longitude: 0, takenAt: 2 },
    ]);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      id: 'nova',
      latitude: 20 / meters,
      longitude: 0,
    });
    expect(places[0].photos.map((photo) => photo.assetId)).toEqual(['nova', 'antiga']);
  });

  test('fotos distantes continuam em pontos separados', () => {
    const places = groupPlaces([
      { assetId: 'a', latitude: 0, longitude: 0, takenAt: 2 },
      { assetId: 'b', latitude: 1_000 / meters, longitude: 0, takenAt: 1 },
    ]);

    expect(places.map((place) => place.id)).toEqual(['a', 'b']);
    expect(places[0].photos).toHaveLength(1);
  });

  test('não junta uma sequência só porque cada par está perto', () => {
    const step = 30 / meters;
    const places = groupPlaces([
      { assetId: 'a', latitude: 0, longitude: 0, takenAt: 3 },
      { assetId: 'b', latitude: step, longitude: 0, takenAt: 2 },
      { assetId: 'c', latitude: step * 2, longitude: 0, takenAt: 1 },
    ]);

    expect(places.map((place) => place.id)).toEqual(['a', 'c']);
    expect(places[0].photos.map((photo) => photo.assetId)).toEqual(['a', 'b']);
  });
});

describe('cameraForMarkers', () => {
  test('sem pinos não escolhe câmera', () => {
    expect(cameraForMarkers([])).toBeNull();
  });

  test('uma foto fica centrada na coordenada dela', () => {
    expect(
      cameraForMarkers([
        { assetId: 'foto', latitude: -30.03464789, longitude: -51.21765812, takenAt: 1 },
      ]),
    ).toEqual({
      latitude: -30.03464789,
      longitude: -51.21765812,
      zoom: 14,
    });
  });

  test('duas fotos ficam no centro exato entre elas e dentro do enquadramento', () => {
    const camera = cameraForMarkers([
      { assetId: 'sul', latitude: -30, longitude: -114, takenAt: 1 },
      { assetId: 'norte', latitude: 50, longitude: -50, takenAt: 2 },
    ]);

    expect(camera).toMatchObject({ latitude: 10, longitude: -82 });
    const visibleSpan = 360 / 2 ** camera!.zoom;
    expect(visibleSpan).toBeGreaterThanOrEqual(80);
    expect(visibleSpan).toBeGreaterThanOrEqual(64);
    expect(camera!.zoom).toBeGreaterThan(1);
    expect(camera!.zoom).toBeLessThan(14);
  });
});
