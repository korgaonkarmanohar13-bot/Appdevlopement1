import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <View style={styles.Button}>
      <Button title="click me"
      onPress={()=>alert('Clicked!')}
      color="#3c21e1"
      />
      </View>
      <StatusBar style="auto" />
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1eedfc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  Button:{
    width:'180px',
    margin:'18px',
  },
});
