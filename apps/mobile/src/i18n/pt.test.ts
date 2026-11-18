import { photoCountLabel, photoPositionLabel, t } from './pt';

describe('pt', () => {
  test('devolve o texto em português pela chave', () => {
    expect(t('map.empty')).toBe('Nenhuma foto com GPS ainda.');
  });

  test('conta fotos no singular e no plural', () => {
    expect(photoCountLabel(1)).toBe('1 foto');
    expect(photoCountLabel(186)).toBe('186 fotos');
  });

  test('mostra a posição na galeria do ponto', () => {
    expect(photoPositionLabel(2, 8)).toBe('2 de 8');
  });
});
