import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMERAS_KEY = '@ipcam_cameras';

// Default demo cameras for testing
const DEMO_CAMERAS = [
  {
    id: '1',
    name: 'Cámara Principal',
    ip: '192.168.1.100',
    port: '8080',
    username: 'admin',
    password: '',
    url: 'http://192.168.1.100:8080/video',
    type: 'demo',
    status: 'online',
    thumbnail: null,
  },
  {
    id: '2',
    name: 'Cámara Jardín',
    ip: '192.168.1.101',
    port: '8080',
    username: 'admin',
    password: '',
    url: 'http://192.168.1.101:8080/video',
    type: 'demo',
    status: 'online',
    thumbnail: null,
  },
];

export const useCameraStore = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const data = await AsyncStorage.getItem(CAMERAS_KEY);
      if (data) {
        setCameras(JSON.parse(data));
      } else {
        // First time, use demo cameras
        setCameras(DEMO_CAMERAS);
        await AsyncStorage.setItem(CAMERAS_KEY, JSON.stringify(DEMO_CAMERAS));
      }
    } catch (error) {
      console.error('Error loading cameras:', error);
      setCameras(DEMO_CAMERAS);
    } finally {
      setLoading(false);
    }
  };

  const saveCameras = async (newCameras) => {
    try {
      await AsyncStorage.setItem(CAMERAS_KEY, JSON.stringify(newCameras));
      setCameras(newCameras);
    } catch (error) {
      console.error('Error saving cameras:', error);
    }
  };

  const addCamera = async (camera) => {
    const newCamera = {
      ...camera,
      id: Date.now().toString(),
      status: 'unknown',
      thumbnail: null,
    };
    const updated = [...cameras, newCamera];
    await saveCameras(updated);
    return newCamera;
  };

  const removeCamera = async (id) => {
    const updated = cameras.filter(c => c.id !== id);
    await saveCameras(updated);
  };

  const updateCamera = async (id, updates) => {
    const updated = cameras.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    await saveCameras(updated);
  };

  const checkCameraStatus = async (camera) => {
    try {
      // Simple check - try to fetch the URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(camera.url, { 
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      return response.ok ? 'online' : 'offline';
    } catch {
      return 'offline';
    }
  };

  const scanNetwork = async (subnet = '192.168.1', signal) => {
    const commonPorts = ['80', '8080', '554'];
    const commonPaths = ['/video', '/stream', '/live'];
    const found = [];

    // Scan first 10 IPs with shorter timeout
    for (let i = 1; i <= 10; i++) {
      if (signal?.aborted) break;
      
      const ip = `${subnet}.${i}`;
      
      for (const port of commonPorts) {
        if (signal?.aborted) break;
        
        for (const path of commonPaths) {
          if (signal?.aborted) break;
          
          const url = `http://${ip}:${port}${path}`;
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 800);
            
            const response = await fetch(url, { 
              method: 'HEAD',
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              found.push({
                id: `found_${Date.now()}_${i}`,
                name: `Cámara Encontrada ${ip}:${port}`,
                ip,
                port,
                url,
                type: 'discovered',
                status: 'online',
                username: 'admin',
                password: '',
              });
            }
          } catch {
            // Continue scanning
          }
        }
      }
    }

    return found;
  };

  return {
    cameras,
    loading,
    addCamera,
    removeCamera,
    updateCamera,
    checkCameraStatus,
    scanNetwork,
    refresh: loadCameras,
  };
};

export default useCameraStore;
