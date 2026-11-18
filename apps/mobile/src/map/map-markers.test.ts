import { cameraForMarkers, toMapMarkers } from './map-markers';

describe('toMapMarkers', () => {
  test('mantém a coordenada exata e deixa de fora foto sem GPS e print', () => {
    expect(
      toMapMarkers([
        { assetId: 'gps', latitude: -30.03464789, longitude: -51.21765812, role: 'map' },
        { assetId: 'sem-gps', latitude: null, longitude: null, role: 'classify' },
        { assetId: 'print', latitude: 1.23456789, longitude: 2.34567891, role: 'screenshot' },
        { assetId: 'incompleta', latitude: 10, longitude: null, role: 'map' },
      ]),
    ).toEqual([{ assetId: 'gps', latitude: -30.03464789, longitude: -51.21765812 }]);
  });
});

describe('cameraForMarkers', () => {
  test('sem pinos não escolhe câmera', () => {
    expect(cameraForMarkers([])).toBeNull();
  });

  test('uma foto fica centrada na coordenada dela', () => {
    expect(
      cameraForMarkers([{ assetId: 'foto', latitude: -30.03464789, longitude: -51.21765812 }]),
    ).toEqual({
      latitude: -30.03464789,
      longitude: -51.21765812,
      zoom: 14,
    });
  });

  test('duas fotos ficam no centro exato entre elas e dentro do enquadramento', () => {
    const camera = cameraForMarkers([
      { assetId: 'sul', latitude: -30, longitude: -114 },
      { assetId: 'norte', latitude: 50, longitude: -50 },
    ]);

    expect(camera).toMatchObject({ latitude: 10, longitude: -82 });
    const visibleSpan = 360 / 2 ** camera!.zoom;
    expect(visibleSpan).toBeGreaterThanOrEqual(80);
    expect(visibleSpan).toBeGreaterThanOrEqual(64);
    expect(camera!.zoom).toBeGreaterThan(1);
    expect(camera!.zoom).toBeLessThan(14);
  });
});
