import { render, screen } from '@testing-library/react-native';

import type { GalleryPhoto } from '@/gallery/gallery-photo';
import { memorySql } from '@/photo-index/memory-sql';
import { createPhotoIndex } from '@/photo-index/photo-index';
import MapScreen from '@/app/index';

jest.mock('expo-maps', () => {
  const { Text, View } = require('react-native');
  return {
    AppleMaps: {
      View: ({
        markers,
      }: {
        markers?: { id?: string; coordinates?: { latitude?: number; longitude?: number } }[];
      }) => (
        <View>
          {markers?.map((marker) => (
            <Text key={marker.id}>
              {`${marker.id}:${marker.coordinates?.latitude},${marker.coordinates?.longitude}`}
            </Text>
          ))}
        </View>
      ),
    },
  };
});

jest.mock('expo-media-library/legacy', () => ({
  requestPermissionsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
}));

jest.mock('@/photo-index/open-photo-index', () => ({
  openPhotoIndex: jest.fn(),
}));

jest.mock('@/gallery/read-gallery', () => ({
  readGallery: jest.fn(),
}));

const media = jest.requireMock('expo-media-library/legacy') as {
  requestPermissionsAsync: jest.Mock;
};

const indexModule = jest.requireMock('@/photo-index/open-photo-index') as {
  openPhotoIndex: jest.Mock;
};

const gallery = jest.requireMock('@/gallery/read-gallery') as {
  readGallery: jest.Mock;
};

function library(photos: GalleryPhoto[]) {
  gallery.readGallery.mockImplementation(async function* () {
    yield { photos };
  });
}

describe('<MapScreen />', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const index = createPhotoIndex(memorySql());
    await index.migrate();
    indexModule.openPhotoIndex.mockResolvedValue(index);
    media.requestPermissionsAsync.mockResolvedValue({ granted: true });
    library([]);
  });

  test('desenha a foto com GPS na coordenada exata', async () => {
    library([
      {
        assetId: 'gps',
        takenAt: 10,
        latitude: -30.03464789,
        longitude: -51.21765812,
        kind: 'photo',
      },
      {
        assetId: 'sem-gps',
        takenAt: 9,
        latitude: null,
        longitude: null,
        kind: 'photo',
      },
      {
        assetId: 'print',
        takenAt: 8,
        latitude: 1,
        longitude: 2,
        kind: 'screenshot',
      },
    ]);

    await render(<MapScreen />);

    expect(await screen.findByText('gps:-30.03464789,-51.21765812')).toBeOnTheScreen();
    expect(screen.getByText('1 foto')).toBeOnTheScreen();
    expect(screen.queryByText(/sem-gps/)).toBeNull();
    expect(screen.queryByText(/print:/)).toBeNull();
    expect(screen.getByText('Medir leitura da galeria')).toBeOnTheScreen();
  });

  test('sem permissão e sem fotos avisa em vez de abrir o mapa', async () => {
    media.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await render(<MapScreen />);

    expect(await screen.findByText('Sem permissão para ler a galeria.')).toBeOnTheScreen();
    expect(gallery.readGallery).not.toHaveBeenCalled();
  });

  test('galeria sem GPS avisa que não há o que mostrar', async () => {
    await render(<MapScreen />);

    expect(await screen.findByText('Nenhuma foto com GPS ainda.')).toBeOnTheScreen();
  });
});
