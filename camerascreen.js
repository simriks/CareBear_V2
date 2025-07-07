import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Gemini API setup
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamCount, setStreamCount] = useState(0);
  const intervalRef = useRef(null);

  // Voice-to-text states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Camera streaming functions
  const startStreaming = () => {
    if (!isStreaming && cameraRef.current && isReady) {
      setIsStreaming(true);
      console.log('Starting continuous image streaming...');
      
      intervalRef.current = setInterval(async () => {
        try {
          const photo = await cameraRef.current.takePictureAsync({ 
            base64: true,
            quality: 0.3,
            skipProcessing: true
          });
          
          setStreamCount(prev => prev + 1);
          
          // Send to server
          await fetch('http://192.168.2.117:8080/frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: `data:image/jpeg;base64,${photo.base64}`,
              timestamp: Date.now()
            }),
          });
          
        } catch (error) {
          console.error('Error in continuous streaming:', error);
        }
      }, 1000);
    }
  };

  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsStreaming(false);
      console.log('Stopped continuous streaming');
    }
  };

  // Voice-to-text functions
  const startRecording = async () => {
    setVoiceStatus('Starting recording...');
    setTranscript('');
    try {
      console.log('Requesting microphone permissions...');
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceStatus('Microphone permission required');
        Alert.alert('Permission Required', 'Microphone access is needed for voice commands');
        return;
      }

      console.log('Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Creating recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setVoiceStatus('🎤 Recording... speak now');
      console.log('Recording started');
    } catch (err) {
      setVoiceStatus(`Recording failed: ${err.message}`);
      console.error('Recording error:', err);
      Alert.alert('Recording Error', err.message);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setVoiceStatus('Processing audio...');
    try {
      if (!recording) {
        setVoiceStatus('No active recording to stop.');
        return;
      }
      
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        console.log('Audio file saved at:', uri);
        await processAudio(uri);
      } else {
        throw new Error('No audio file generated');
      }
    } catch (error) {
      setVoiceStatus(`Stop failed: ${error.message}`);
      console.error('Stop error:', error);
      Alert.alert('Stop Error', error.message);
    }
  };

  const processAudio = async (uri) => {
    setIsTranscribing(true);
    setVoiceStatus('🔄 Transcribing audio...');
    
    try {
      if (!uri) throw new Error('No audio file found');
      
      console.log('Reading audio file...');
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      if (!base64Audio) {
        throw new Error('Failed to read audio file');
      }
      
      const extension = uri.split('.').pop() || 'caf';
      const mimeType = 
        extension === 'wav' ? 'audio/wav' :
        extension === 'mp4' ? 'audio/mp4' :
        extension === 'm4a' ? 'audio/m4a' :
        'audio/x-caf';
      
      console.log('Sending to Gemini API...');
      await sendToGemini(base64Audio, mimeType);
    } catch (err) {
      setVoiceStatus(`Processing failed: ${err.message}`);
      console.error('Processing error:', err);
      Alert.alert('Processing Error', err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const sendToGemini = async (audioBase64, mimeType) => {
    try {
      console.log('Making API request to Gemini...');
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "The following audio is in English. Transcribe it to English text only. Do not translate. Return only the transcribed English speech, no comments or additional text."
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audioBase64
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      const transcriptText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (transcriptText) {
        setTranscript(transcriptText.trim());
        setVoiceStatus('✅ Transcription complete');
        console.log('Transcription successful:', transcriptText);
        
        // Show transcript in alert
        Alert.alert('Voice Transcript', transcriptText.trim(), [
          {
            text: 'OK',
            onPress: () => setVoiceStatus('')
          }
        ]);
      } else {
        throw new Error('No transcription found in response');
      }
    } catch (err) {
      const errorMessage = `Gemini API error: ${err.message}`;
      setVoiceStatus(errorMessage);
      console.error('Gemini error:', err);
      Alert.alert('Transcription Error', errorMessage);
    }
  };

  const handleFlipCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        ratio="16:9"
        onCameraReady={() => setIsReady(true)}
      >
        {/* Voice Status Display */}
        {voiceStatus !== '' && (
          <View style={styles.voiceStatusContainer}>
            <Text style={styles.voiceStatusText}>{voiceStatus}</Text>
          </View>
        )}

        {/* Streaming Status */}
        {isStreaming && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              🔴 STREAMING - Images sent: {streamCount}
            </Text>
          </View>
        )}

        {/* Main Camera Controls */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleFlipCamera}>
            <Text style={styles.buttonText}>Flip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, isStreaming ? styles.stopButton : styles.startButton]} 
            onPress={isStreaming ? stopStreaming : startStreaming}
            disabled={!isReady}
          >
            <Text style={styles.buttonText}>
              {!isReady ? 'Loading...' : isStreaming ? 'Stop Stream' : 'Start Stream'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Voice Controls */}
        <View style={styles.voiceButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.voiceButton, 
              isRecording ? styles.recordingButton : styles.micButton
            ]} 
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
          >
            <Text style={styles.buttonText}>
              {isTranscribing ? '⏳ Processing' : isRecording ? '🛑 Stop Recording' : '🎤 Voice Command'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transcript Display */}
        {transcript !== '' && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptText}>Last Command: {transcript}</Text>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
  },
  voiceButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 15,
    borderRadius: 50,
    marginHorizontal: 20,
  },
  voiceButton: {
    backgroundColor: 'rgba(255, 105, 180, 0.8)',
    padding: 15,
    borderRadius: 25,
    minWidth: 150,
  },
  micButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  recordingButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  startButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
    padding: 20,
  },
  stopButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.7)',
    padding: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#FF69B4',
    padding: 15,
    borderRadius: 10,
  },
  statusContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  voiceStatusContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  voiceStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,105,180,0.8)',
    padding: 8,
    borderRadius: 5,
  },
  transcriptContainer: {
    position: 'absolute',
    bottom: 160,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  transcriptText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});
