import { render, screen } from '@testing-library/react-native';

import WorldScreen from '@/app/index';

describe('<WorldScreen />', () => {
  test('mostra o nome do app', async () => {
    await render(<WorldScreen />);

    expect(screen.getByText('Mapbook')).toBeOnTheScreen();
  });

  test('em desenvolvimento, mostra o atalho para medir a leitura da galeria', async () => {
    await render(<WorldScreen />);

    expect(screen.getByText('Medir leitura da galeria')).toBeOnTheScreen();
  });
});
