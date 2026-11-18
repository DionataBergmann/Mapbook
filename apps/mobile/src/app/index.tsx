import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function WorldScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapbook</Text>
      {__DEV__ && <Link href="/dev/galeria">Medir leitura da galeria</Link>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
});
