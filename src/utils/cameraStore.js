import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMERAS_KEY = '@ipcam_cameras';

// Default empty cameras array - no demo cameras
const DEMO_CAMERAS = [];

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

  const scanONVIF = async (subnet = '192.168.1', signal) => {
    const onvifPorts = ['80', '8080', '8000', '8081'];
    const onvifPaths = ['/onvif/device_service', '/onvif', '/device_service'];
    const found = [];

    // ONVIF probe message
    const probeMessage = `<?xml version="1.0" encoding="UTF-8"?>
      <Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">
        <Body>
          <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery"/>
        </Body>
      </Envelope>`;

    // Scan for ONVIF cameras
    for (let i = 1; i <= 20; i++) {
      if (signal?.aborted) break;
      
      const ip = `${subnet}.${i}`;
      
      for (const port of onvifPorts) {
        if (signal?.aborted) break;
        
        for (const path of onvifPaths) {
          if (signal?.aborted) break;
          
          const url = `http://${ip}:${port}${path}`;
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            
            // Try to probe ONVIF endpoint
            const response = await fetch(url, { 
              method: 'POST',
              headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
              },
              body: probeMessage,
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok || response.status === 400) {
              // If we get any response, it might be ONVIF
              const text = await response.text();
              if (text.includes('ONVIF') || text.includes('Device') || text.includes('wsdl')) {
                found.push({
                  id: `onvif_${Date.now()}_${i}`,
                  name: `ONVIF Cámara ${ip}:${port}`,
                  ip,
                  port,
                  url: `http://${ip}:${port}${path}`,
                  type: 'onvif',
                  status: 'online',
                  username: 'admin',
                  password: '',
                  onvif: true,
                });
              }
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
    scanONVIF,
    refresh: loadCameras,
  };
};

export default useCameraStore;
