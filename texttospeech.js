// textToSpeech.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

export default function TextToSpeech({ navigation }) {
  const [inputText, setInputText] = useState('Hello, this is a text to speech test.');

  const handleTextToSpeech = () => {
    Speech.speak(inputText, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Text to Speech</Text>

      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Enter text to speak..."
        multiline
      />

      <Button title="Speak Text" onPress={handleTextToSpeech} color="#FF69B4" />
      <Button title="Go to Camera" onPress={() => navigation.navigate('CameraScreen')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FAF0E6',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    minHeight: 100,
  },
});