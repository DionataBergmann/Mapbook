export const pt = {
  'map.loading': 'Lendo as fotos com GPS…',
  'map.empty': 'Nenhuma foto com GPS ainda.',
  'map.denied': 'Sem permissão para ler a galeria.',
  'map.error': 'Não foi possível abrir o mapa.',
  'map.iosOnly': 'O mapa está disponível no iPhone.',
  'map.devGallery': 'Medir leitura da galeria',
} as const;

export type MessageKey = keyof typeof pt;

export function t(key: MessageKey): string {
  return pt[key];
}

export function photoCountLabel(count: number): string {
  return count === 1 ? '1 foto' : `${count} fotos`;
}
