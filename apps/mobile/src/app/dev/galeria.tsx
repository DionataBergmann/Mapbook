import { requestPermissionsAsync } from 'expo-media-library/legacy';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GalleryPhoto } from '@/gallery/gallery-photo';
import { readGallery } from '@/gallery/read-gallery';
import {
  countPhotos,
  msPerThousand,
  readVerdict,
  type KindCount,
  type ReadMeasurement,
} from '@/gallery/read-measurement';
import { openPhotoIndex } from '@/photo-index/open-photo-index';
import {
  syncPhotoIndex,
  type PhotoRole,
  type RoleCounts,
  type SyncReport,
} from '@/photo-index/photo-index';

const FIRST_MINUTE_PHOTOS = 2_000;

export default function GalleryReadScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <GalleryReadBenchmark />;
}

type RunState =
  | { status: 'idle' }
  | { status: 'denied' }
  | { status: 'running'; read: number; totalCount: number }
  | {
      status: 'done';
      measurement: ReadMeasurement;
      totalCount: number;
      access: string;
      limit: number | null;
    };

const ROLE_ROWS: [PhotoRole, string][] = [
  ['map', 'No mapa'],
  ['classify', 'Para classificar'],
  ['screenshot', 'Prints de tela'],
];

type IndexState =
  | { status: 'idle' }
  | { status: 'denied' }
  | { status: 'running' }
  | { status: 'error'; message: string }
  | ({ status: 'done'; counts: RoleCounts } & SyncReport);

function GalleryReadBenchmark() {
  const [run, setRun] = useState<RunState>({ status: 'idle' });
  const [indexRun, setIndexRun] = useState<IndexState>({ status: 'idle' });

  async function measure(limit?: number) {
    const permission = await requestPermissionsAsync(false, ['photo']);
    if (!permission.granted) {
      setRun({ status: 'denied' });
      return;
    }

    const photos: GalleryPhoto[] = [];
    let totalCount = 0;
    let firstPageMs = 0;
    const start = performance.now();

    for await (const page of readGallery({ limit })) {
      if (photos.length === 0) firstPageMs = performance.now() - start;
      photos.push(...page.photos);
      totalCount = page.totalCount;
      setRun({ status: 'running', read: photos.length, totalCount });
    }

    const measurement = {
      ...countPhotos(photos),
      firstPageMs,
      elapsedMs: performance.now() - start,
    };
    const result = {
      measurement,
      totalCount,
      access: permission.accessPrivileges ?? 'desconhecido',
      limit: limit ?? null,
    };
    console.log(
      '[leitura-galeria]',
      JSON.stringify({ ...result, verdict: readVerdict(measurement) }),
    );
    setRun({ status: 'done', ...result });
  }

  async function indexGallery() {
    const permission = await requestPermissionsAsync(false, ['photo']);
    if (!permission.granted) {
      setIndexRun({ status: 'denied' });
      return;
    }

    setIndexRun({ status: 'running' });
    try {
      const index = await openPhotoIndex();
      const result = await syncPhotoIndex(index, (options) => readGallery(options));
      setIndexRun({ status: 'done', ...result, counts: await index.counts() });
    } catch (error) {
      setIndexRun({
        status: 'error',
        message: error instanceof Error ? error.message : 'Falhou ao indexar a galeria.',
      });
    }
  }

  const busy = run.status === 'running' || indexRun.status === 'running';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Leitura da galeria',
          headerTransparent: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.actions}>
          <Button
            title="Ler 2.000 fotos"
            disabled={busy}
            onPress={() => measure(FIRST_MINUTE_PHOTOS)}
          />
          <Button title="Ler a galeria inteira" disabled={busy} onPress={() => measure()} />
          <Button title="Indexar galeria" disabled={busy} onPress={() => indexGallery()} />
        </View>

        {run.status === 'denied' && <Text>Sem permissão para ler a galeria.</Text>}
        {run.status === 'running' && (
          <Text>
            Lendo {run.read} de {run.totalCount}…
          </Text>
        )}
        {run.status === 'done' && <MeasurementReport {...run} />}
        {indexRun.status === 'denied' && <Text>Sem permissão para ler a galeria.</Text>}
        {indexRun.status === 'running' && <Text>Indexando…</Text>}
        {indexRun.status === 'error' && <Text>{indexRun.message}</Text>}
        {indexRun.status === 'done' && <IndexReport {...indexRun} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function kindLabel(count: KindCount) {
  if (count.photos === 0) return '0';
  const share = (count.withLocation / count.photos) * 100;
  return `${count.photos} · ${count.withLocation} com local (${share.toFixed(1)}%)`;
}

function MeasurementReport({
  measurement,
  totalCount,
  access,
  limit,
}: Extract<RunState, { status: 'done' }>) {
  const perThousand = msPerThousand(measurement);
  const withLocationShare =
    measurement.photos === 0 ? 0 : (measurement.withLocation / measurement.photos) * 100;

  const rows: [string, string][] = [
    ['Leitura', limit === null ? 'galeria inteira' : `até ${limit} fotos`],
    ['Acesso', access],
    ['Fotos na galeria', String(totalCount)],
    ['Fotos lidas', String(measurement.photos)],
    ['Com data', String(measurement.withDate)],
    ['Com local', `${measurement.withLocation} (${withLocationShare.toFixed(1)}%)`],
    ['Fotos (não print)', kindLabel(measurement.byKind.photo)],
    ['Prints de tela', kindLabel(measurement.byKind.screenshot)],
    ['Primeira página', `${(measurement.firstPageMs / 1_000).toFixed(2)} s`],
    ['Tempo total', `${(measurement.elapsedMs / 1_000).toFixed(2)} s`],
    ['Por mil fotos', perThousand === null ? '—' : `${(perThousand / 1_000).toFixed(2)} s`],
    ['Veredito', readVerdict(measurement) ?? '—'],
  ];

  return (
    <View style={styles.report}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} selectable>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function IndexReport({ upserted, createdAfter, counts }: Extract<IndexState, { status: 'done' }>) {
  const rows: [string, string][] = [
    ['Leitura', createdAfter === null ? 'completa' : 'só fotos novas'],
    ['Fotos lidas', String(upserted)],
    ...ROLE_ROWS.map(([role, label]): [string, string] => [label, String(counts[role])]),
  ];

  return (
    <View style={styles.report}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value} selectable>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  actions: {
    gap: 8,
  },
  report: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontWeight: '600',
    flexShrink: 0,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
});
