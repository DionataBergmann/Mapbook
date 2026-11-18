import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function WorldScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Mapbook' }} />
      <Text style={styles.title}>Mapbook</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
});
