import { Image } from 'expo-image';
import { AppleMaps } from 'expo-maps';
import { getAssetInfoAsync, requestPermissionsAsync } from 'expo-media-library/legacy';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { readGallery } from '@/gallery/read-gallery';
import { photoCountLabel, t } from '@/i18n/pt';
import { loadMapPhotos, type MapLoad } from '@/map/load-map-photos';
import { openPhotoIndex } from '@/photo-index/open-photo-index';

type ScreenState = { status: 'loading' } | { status: 'error' } | MapLoad;

type Preview = {
  assetId: string;
  uri: string | null;
};

export default function MapScreen() {
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadMapPhotos({
      requestPermission: async () => (await requestPermissionsAsync(false, ['photo'])).granted,
      openIndex: openPhotoIndex,
      read: (options) => readGallery(options),
    })
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function showPhoto(assetId: string | undefined) {
    if (!assetId) return;
    setPreview({ assetId, uri: null });
    try {
      const info = await getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: false });
      setPreview({ assetId, uri: info.localUri ?? info.uri });
    } catch {
      setPreview(null);
    }
  }

  return (
    <View style={styles.screen}>
      {state.status === 'ready' && Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={styles.map}
          cameraPosition={{
            coordinates: {
              latitude: state.camera.latitude,
              longitude: state.camera.longitude,
            },
            zoom: state.camera.zoom,
          }}
          markers={state.markers.map((marker) => ({
            id: marker.assetId,
            coordinates: { latitude: marker.latitude, longitude: marker.longitude },
          }))}
          onMarkerClick={(marker) => {
            void showPhoto(marker.id);
          }}
        />
      ) : (
        <View style={styles.message}>
          <Text>{messageFor(state)}</Text>
        </View>
      )}

      {state.status === 'ready' && (
        <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
          <Text style={styles.chip}>{photoCountLabel(state.markers.length)}</Text>
        </SafeAreaView>
      )}

      {preview?.uri && (
        <Image
          source={{ uri: preview.uri }}
          style={styles.preview}
          contentFit="cover"
          accessibilityLabel={preview.assetId}
        />
      )}

      {__DEV__ && (
        <SafeAreaView edges={['bottom']} style={styles.devLink} pointerEvents="box-none">
          <Link href="/dev/galeria" style={styles.chip}>
            {t('map.devGallery')}
          </Link>
        </SafeAreaView>
      )}
    </View>
  );
}

function messageFor(state: ScreenState): string {
  if (Platform.OS !== 'ios') return t('map.iosOnly');
  if (state.status === 'loading') return t('map.loading');
  if (state.status === 'denied') return t('map.denied');
  if (state.status === 'error') return t('map.error');
  return t('map.empty');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
  },
  devLink: {
    position: 'absolute',
    left: 16,
    bottom: 0,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  preview: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 72,
    height: 180,
    borderRadius: 12,
  },
});
