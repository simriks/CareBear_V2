import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Request camera permissions if not granted
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleFlipCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const takePicture = async () => {
  if (cameraRef.current && isReady) {
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      console.log('Photo taken:', photo);

      // SEND image to web server:
      await fetch('http://10.196.202.170:8080/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${photo.base64}`,
          timestamp: Date.now()
        }),
      });

    } catch (error) {
      console.error('Error taking picture:', error);
    }
  }
};


  // Handle permission states
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
            style={[styles.button, styles.captureButton]} 
            onPress={takePicture}
            disabled={!isReady}
          >
            <Text style={styles.buttonText}>{isReady ? 'Capture' : 'Loading...'}</Text>
          </TouchableOpacity>
        </View>
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
  captureButton: {
    backgroundColor: 'rgba(255, 105, 180, 0.7)',
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
});