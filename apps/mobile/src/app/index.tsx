import { Image, useImage, type ImageRef } from 'expo-image';
import { AppleMaps } from 'expo-maps';
import { getAssetInfoAsync, requestPermissionsAsync } from 'expo-media-library/legacy';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { readGallery } from '@/gallery/read-gallery';
import { photoCountLabel, photoPositionLabel, t } from '@/i18n/pt';
import { loadMapPhotos, type MapLoad } from '@/map/load-map-photos';
import { groupPlaces, type MapPlace } from '@/map/map-markers';
import { openPhotoIndex } from '@/photo-index/open-photo-index';

type ScreenState = { status: 'loading' } | { status: 'error' } | MapLoad;

const THUMBNAIL = 96;
const URI_BATCH = 6;

export default function MapScreen() {
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [uris, setUris] = useState<Record<string, string>>({});
  const [icons, setIcons] = useState<Record<string, ImageRef>>({});
  const [place, setPlace] = useState<MapPlace | null>(null);
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();

  const places = state.status === 'ready' ? groupPlaces(state.markers) : [];

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

  useEffect(() => {
    if (state.status !== 'ready') return;
    let cancelled = false;
    const ids = groupPlaces(state.markers).map((item) => item.id);

    void (async () => {
      for (let index = 0; index < ids.length && !cancelled; index += URI_BATCH) {
        const batch = await Promise.all(
          ids.slice(index, index + URI_BATCH).map(async (id) => [id, await assetUri(id)] as const),
        );
        if (cancelled) return;
        setUris((current) => {
          const next = { ...current };
          for (const [id, uri] of batch) {
            if (uri) next[id] = uri;
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

  const rememberIcon = useCallback((id: string, icon: ImageRef) => {
    setIcons((current) => (current[id] === icon ? current : { ...current, [id]: icon }));
  }, []);

  async function openPlace(next: MapPlace) {
    setPlace(next);
    setPage(0);
    const batch = await Promise.all(
      next.photos.map(async (photo) => [photo.assetId, await assetUri(photo.assetId)] as const),
    );
    setUris((current) => {
      const updated = { ...current };
      for (const [id, uri] of batch) {
        if (uri) updated[id] = uri;
      }
      return updated;
    });
  }

  function onGalleryScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const viewport = event.nativeEvent.layoutMeasurement.width;
    if (viewport === 0) return;
    setPage(Math.round(event.nativeEvent.contentOffset.x / viewport));
  }

  const annotations = places.flatMap((item) => {
    const icon = icons[item.id];
    if (!icon) return [];
    return [
      {
        id: item.id,
        coordinates: { latitude: item.latitude, longitude: item.longitude },
        icon,
        anchor: { x: 0.5, y: 0.5 },
        text: item.photos.length > 1 ? String(item.photos.length) : undefined,
      },
    ];
  });

  return (
    <View style={styles.screen}>
      {places.map((item) =>
        uris[item.id] ? (
          <CoverImage key={item.id} id={item.id} uri={uris[item.id]} onReady={rememberIcon} />
        ) : null,
      )}

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
          annotations={annotations}
          onAnnotationClick={(annotation) => {
            const selected = places.find((item) => item.id === annotation.id);
            if (selected) void openPlace(selected);
          }}
          onMapClick={() => setPlace(null)}
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

      {place && (
        <View style={styles.gallery}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>
              {place.photos.length > 1
                ? photoPositionLabel(page + 1, place.photos.length)
                : photoCountLabel(1)}
            </Text>
            <Pressable onPress={() => setPlace(null)}>
              <Text style={styles.chip}>{t('map.close')}</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onGalleryScroll}
          >
            {place.photos.map((photo) => (
              <Image
                key={photo.assetId}
                accessibilityLabel={photo.assetId}
                source={uris[photo.assetId] ? { uri: uris[photo.assetId] } : undefined}
                style={{ width, height: 240 }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        </View>
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

function CoverImage({
  id,
  uri,
  onReady,
}: {
  id: string;
  uri: string;
  onReady: (id: string, icon: ImageRef) => void;
}) {
  const icon = useImage(uri, { maxWidth: THUMBNAIL, maxHeight: THUMBNAIL });

  useEffect(() => {
    if (icon) onReady(id, icon);
  }, [icon, id, onReady]);

  return null;
}

async function assetUri(assetId: string): Promise<string | null> {
  try {
    const info = await getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: false });
    return info.localUri ?? info.uri ?? null;
  } catch {
    return null;
  }
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
  gallery: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    backgroundColor: '#111',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  galleryTitle: {
    color: '#fff',
    fontWeight: '600',
  },
});
