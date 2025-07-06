import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gemini API setup
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || 'AIzaSyCoahza-DqIq2Qq1wLpSlXg3nEwhVhw3GA';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export default function TextToSpeech() {
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Voice-to-text states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Hello! I\'m here to help you. Press the button to talk to me.');

  // Memory storage for conversations and reminders
  const [conversationMemory, setConversationMemory] = useState([]);

  // Load memory from storage when app starts
  React.useEffect(() => {
    loadMemoryFromStorage();
  }, []);

  const loadMemoryFromStorage = async () => {
    try {
      const savedMemory = await AsyncStorage.getItem('conversationMemory');
      if (savedMemory) {
        setConversationMemory(JSON.parse(savedMemory));
      }
    } catch (error) {
      console.log('Error loading memory:', error);
    }
  };

  const saveMemoryToStorage = async (newMemory) => {
    try {
      await AsyncStorage.setItem('conversationMemory', JSON.stringify(newMemory));
    } catch (error) {
      console.log('Error saving memory:', error);
    }
  };

  // Function to clean text for speech (remove markdown and special characters)
  const cleanTextForSpeech = (text) => {
    return text
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '\$1') // Convert links to just text
      .replace(/`([^`]+)`/g, '\$1') // Remove code markers
      .replace(/\n+/g, ' ') // Replace line breaks with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  };

  // Text-to-speech function
  // Text-to-speech function with varied caring expressions
const speak = (textToSpeak) => {
  const cleanedText = cleanTextForSpeech(textToSpeak);
  
  if (cleanedText.trim() === '') {
    Alert.alert('Nothing to say', 'I don\'t have anything to tell you right now.');
    return;
  }

  setIsSpeaking(true);
  setVoiceStatus('Speaking to you...');
  
  // Slightly faster speech rate - still comfortable for seniors but not too slow
  Speech.speak(cleanedText, {
    rate: 1.1, // Changed from 0.8 to 0.9 for slightly faster speech
    pitch: 1.0,
    onDone: () => {
      setIsSpeaking(false);
      setVoiceStatus('I\'m here if you need me. Just press the button to talk.');
    },
    onError: (error) => {
      setIsSpeaking(false);
      setVoiceStatus('Sorry, I had trouble speaking. Please try again.');
    },
  });
};

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
    setVoiceStatus('I\'m here if you need me. Just press the button to talk.');
  };

  // Create senior-friendly prompt with memory
  const createSeniorFriendlyPrompt = (userInput) => {
    const memoryContext = conversationMemory.length > 0 
      ? `\n\nWhat I remember about our previous conversations:\n${conversationMemory.slice(-5).join('\n')}`
      : '';

    return `You are a caring, patient, and friendly companion for a senior citizen. Your name is CareBear. You should:

1. Speak in a warm, conversational tone like a trusted friend or family member
2. Use simple, clear language that's easy to understand
3. Be patient and encouraging
4. Remember important information they share (medications, appointments, family, health concerns)
5. Offer gentle reminders and support
6. Keep responses relatively short and focused
7. Show genuine care and interest in their wellbeing
8. Never sound robotic or clinical

The person said: "${userInput}"

${memoryContext}

Please respond as CareBear, their caring companion. If they mention medications, appointments, or other important information, acknowledge it and let them know you'll remember it. Keep your response natural and caring, like talking to a dear friend.`;
  };

  // Function to get a generative response from Gemini
  const getGeminiResponse = async (prompt) => {
    setVoiceStatus('Let me think about that...');
    setIsLoading(true);
    
    try {
      const fullPrompt = createSeniorFriendlyPrompt(prompt);
      
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`I'm having trouble connecting right now. Please try again in a moment.`);
      }

      const data = await response.json();
      const geminiAnswer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (geminiAnswer) {
        const cleanAnswer = geminiAnswer.trim();
        setText(cleanAnswer);
        
        // Update memory with both user input and response
        const newMemory = [
          ...conversationMemory,
          `User said: ${prompt}`,
          `I responded: ${cleanAnswer}`
        ];
        
        // Keep only last 10 conversation exchanges
        const trimmedMemory = newMemory.slice(-10);
        setConversationMemory(trimmedMemory);
        await saveMemoryToStorage(trimmedMemory);
        
        speak(cleanAnswer);
      } else {
        throw new Error('I didn\'t understand that. Could you please try again?');
      }
    } catch (err) {
      const errorMessage = 'I\'m having some trouble right now. Please try talking to me again.';
      setVoiceStatus(errorMessage);
      setText(errorMessage);
      speak(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice-to-text functions
  const startRecording = async () => {
    setVoiceStatus('Getting ready to listen...');
    setTranscript('');
    
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceStatus('I need permission to hear you. Please allow microphone access.');
        return;
      }
      
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setVoiceStatus('I\'m listening... please speak clearly');
    } catch (err) {
      setVoiceStatus('I had trouble starting to listen. Please try again.');
      Alert.alert('Recording Issue', 'I had trouble starting to listen. Please try again.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setVoiceStatus('Let me understand what you said...');
    
    try {
      if (!recording) return;
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        await processAudio(uri);
      }
    } catch (error) {
      setVoiceStatus('I had trouble processing what you said. Please try again.');
      Alert.alert('Processing Issue', 'I had trouble understanding you. Please try speaking again.');
    }
  };

  const processAudio = async (uri) => {
    setIsLoading(true);
    setVoiceStatus('Understanding what you said...');
    
    try {
      const base64Audio = await FileSystem.readAsStringAsync(uri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      const extension = uri.split('.').pop() || 'caf';
      const mimeType = 
        extension === 'wav' ? 'audio/wav' :
        extension === 'mp4' ? 'audio/mp4' :
        extension === 'm4a' ? 'audio/m4a' :
        'audio/x-caf';
      
      await sendToGeminiForTranscription(base64Audio, mimeType);
    } catch (err) {
      setVoiceStatus('I had trouble understanding you. Please try speaking again.');
      Alert.alert('Understanding Issue', 'I had trouble understanding you. Please try speaking again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendToGeminiForTranscription = async (audioBase64, mimeType) => {
    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Please transcribe this audio clearly. Return only the spoken words without any formatting or symbols." },
              { inlineData: { mimeType: mimeType, data: audioBase64 } }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('transcription-failed');
      }

      const data = await response.json();
      const transcriptText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (transcriptText) {
        const cleanTranscript = transcriptText.trim();
        setTranscript(cleanTranscript);
        console.log('User said:', cleanTranscript);
        
        // Get response from Gemini
        await getGeminiResponse(cleanTranscript);
      } else {
        throw new Error('no-transcription');
      }
    } catch (err) {
      setVoiceStatus('I couldn\'t quite hear you. Please try speaking a bit louder.');
      Alert.alert('Hearing Issue', 'I couldn\'t quite hear you. Please try speaking a bit louder and clearer.');
    }
  };

  // Function to clear memory if needed
  const clearMemory = async () => {
    Alert.alert(
      'Clear Memory',
      'Are you sure you want me to forget our previous conversations?',
      [
        { text: 'No, keep my information', style: 'cancel' },
        { 
          text: 'Yes, start fresh', 
          onPress: async () => {
            setConversationMemory([]);
            await AsyncStorage.removeItem('conversationMemory');
            Alert.alert('Memory Cleared', 'I\'ve cleared my memory. We can start fresh!');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🐻 CareBear - Your Caring Companion 🐻</Text>
      
      {/* Status Display */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{voiceStatus}</Text>
        {isLoading && <ActivityIndicator size="small" color="#c2185b" style={{ marginLeft: 10 }} />}
      </View>

      {/* Main Voice Control */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.voiceButton, isRecording ? styles.recordingButton : styles.startButton]} 
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isSpeaking}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '⏳ Please wait...' : 
             isRecording ? '🛑 I\'m listening - tap to stop' : 
             '🎤 Press to talk to me'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversation Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Conversation</Text>
        
        {transcript && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>You said:</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
        
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>CareBear says:</Text>
          <Text style={styles.responseText}>
            {text || "I'm here and ready to chat with you. Just press the button above to start talking!"}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.speakButton]} 
            onPress={() => speak(text)}
            disabled={isSpeaking || !text}
          >
            <Text style={styles.buttonText}>
              {isSpeaking ? '🔊 Speaking...' : '🔊 Repeat what I said'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.stopButton]} 
            onPress={stopSpeaking}
            disabled={!isSpeaking}
          >
            <Text style={styles.buttonText}>⏹️ Stop talking</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Memory Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memory</Text>
        <Text style={styles.memoryText}>
          I remember {conversationMemory.length / 2} things from our conversations
        </Text>
        <TouchableOpacity 
          style={[styles.button, styles.memoryButton]} 
          onPress={clearMemory}
        >
          <Text style={styles.buttonText}>🧠 Clear my memory</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.button, styles.cameraButton]} 
          onPress={() => navigation.navigate('CameraScreen')}
        >
          <Text style={styles.buttonText}>📷 Go to Camera</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f0e9',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#c2185b',
    marginTop: 40,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#5d4037',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#ffeaea',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d7b29d',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#7a1c42',
    textAlign: 'center',
    fontWeight: '600',
  },
  voiceButton: {
    padding: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  transcriptContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  transcriptLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d47a1',
    marginBottom: 5,
  },
  transcriptText: {
    fontSize: 16,
    color: '#1565c0',
    lineHeight: 24,
  },
  responseContainer: {
    backgroundColor: '#f5e3d8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  responseLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5d4037',
    marginBottom: 5,
  },
  responseText: {
    fontSize: 16,
    color: '#5d4037',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  speakButton: {
    backgroundColor: '#2196F3',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  cameraButton: {
    backgroundColor: '#FF69B4',
  },
  memoryButton: {
    backgroundColor: '#9C27B0',
  },
  memoryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});