import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamCount, setStreamCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const startStreaming = () => {
    if (!isStreaming && cameraRef.current && isReady) {
      setIsStreaming(true);
      console.log('Starting continuous image streaming...');
      
      // Capture and send images every 1 second
      intervalRef.current = setInterval(async () => {
        try {
          const photo = await cameraRef.current.takePictureAsync({ 
            base64: true,
            quality: 0.3, // Reduced quality for faster transfer
            skipProcessing: true // Skip image processing for speed
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
      }, 1000); // Send every 1 second
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

  const handleFlipCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text>Checking permissions...</Text>
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
        
        {isStreaming && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              🔴 STREAMING - Images sent: {streamCount}
            </Text>
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
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 15,
    borderRadius: 50,
    marginHorizontal: 20,
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
});