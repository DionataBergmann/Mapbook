import { render, screen } from '@testing-library/react-native';

import WorldScreen from '@/app/index';

describe('<WorldScreen />', () => {
  test('mostra o nome do app', async () => {
    await render(<WorldScreen />);

    expect(screen.getByText('Mapbook')).toBeOnTheScreen();
  });
});
