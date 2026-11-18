import { requestPermissionsAsync } from 'expo-media-library/legacy';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GalleryPhoto } from '@/gallery/gallery-photo';
import { readGallery } from '@/gallery/read-gallery';
import {
  countPhotos,
  msPerThousand,
  readVerdict,
  type ReadMeasurement,
} from '@/gallery/read-measurement';

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

function GalleryReadBenchmark() {
  const [run, setRun] = useState<RunState>({ status: 'idle' });

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

  const running = run.status === 'running';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Leitura da galeria' }} />
      <View style={styles.actions}>
        <Button
          title="Ler 2.000 fotos"
          disabled={running}
          onPress={() => measure(FIRST_MINUTE_PHOTOS)}
        />
        <Button title="Ler a galeria inteira" disabled={running} onPress={() => measure()} />
      </View>

      {run.status === 'denied' && <Text>Sem permissão para ler a galeria.</Text>}
      {run.status === 'running' && (
        <Text>
          Lendo {run.read} de {run.totalCount}…
        </Text>
      )}
      {run.status === 'done' && <MeasurementReport {...run} />}
    </ScrollView>
  );
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
          <Text selectable>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  label: {
    fontWeight: '600',
  },
});
