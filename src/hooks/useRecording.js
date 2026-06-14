import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Local storage directory for mobile recordings
const RECORDINGS_DIR = Platform.OS !== 'web' ? `${FileSystem.documentDirectory}recordings/` : '';
const INDEX_FILE = Platform.OS !== 'web' ? `${RECORDINGS_DIR}recordings_index.json` : '';

/**
 * Hook for recording video streams (Web MediaRecorder vs Mobile Snapshot sequence simulation with disk persistence)
 * @param {string} cameraId - Unique ID of the camera
 * @param {string} snapshotUrl - URL of the video snapshot / stream
 * @returns {Object} Recording state and controls
 */
export const useRecording = (cameraId, snapshotUrl) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState([]);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const activeRecIdRef = useRef(null);
  const frameCounterRef = useRef(0);
  
  // Refs to prevent stale closures in callbacks
  const isRecordingRef = useRef(false);
  const recordingTimeRef = useRef(0);
  const snapshotUrlRef = useRef(snapshotUrl);
  const cameraIdRef = useRef(cameraId);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    recordingTimeRef.current = recordingTime;
  }, [recordingTime]);

  useEffect(() => {
    snapshotUrlRef.current = snapshotUrl;
  }, [snapshotUrl]);

  useEffect(() => {
    cameraIdRef.current = cameraId;
  }, [cameraId]);

  // Load recordings on mount or when cameraId changes
  useEffect(() => {
    const loadRecordings = async () => {
      if (Platform.OS === 'web') {
        try {
          const val = localStorage.getItem('ipcam_web_recordings');
          if (val) {
            const allRecs = JSON.parse(val);
            // On web, blob URLs from previous sessions are invalid, but we filter/keep metadata
            setRecordings(allRecs.filter((r) => r.cameraId === cameraIdRef.current));
          }
        } catch (e) {
          console.warn('Error loading recordings from localStorage:', e);
        }
      } else {
        try {
          // Ensure directory exists
          const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
          }

          const indexInfo = await FileSystem.getInfoAsync(INDEX_FILE);
          if (indexInfo.exists) {
            const content = await FileSystem.readAsStringAsync(INDEX_FILE);
            const allRecs = JSON.parse(content);
            setRecordings(allRecs.filter((r) => r.cameraId === cameraIdRef.current));
          }
        } catch (e) {
          console.warn('Error loading recordings from disk:', e);
        }
      }
    };
    
    loadRecordings();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cameraId]);

  // Helper for starting Web simulation (used as fallback or mobile-like)
  const startRecordingSimulation = useCallback(() => {
    setIsRecording(true);
    chunksRef.current = [];
    setRecordingTime(0);
    const recId = `rec_${Date.now()}`;
    activeRecIdRef.current = recId;

    timerRef.current = setInterval(async () => {
      setRecordingTime((prev) => {
        const nextTime = prev + 1;
        recordingTimeRef.current = nextTime;
        return nextTime;
      });

      // Simulate capturing frames in memory on web
      if (snapshotUrlRef.current) {
        chunksRef.current.push(snapshotUrlRef.current);
      }
    }, 1000);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    
    setRecordingTime(0);
    chunksRef.current = [];

    if (Platform.OS === 'web') {
      try {
        const video = document.createElement('video');
        video.src = snapshotUrlRef.current;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        await video.play();
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        const stream = canvas.captureStream(25); // 25 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
        });
        
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const newRecording = {
            id: `rec_${Date.now()}`,
            cameraId: cameraIdRef.current,
            url,
            duration: recordingTimeRef.current,
            timestamp: new Date().toISOString(),
            size: blob.size,
            format: 'WebM Video',
          };
          
          setRecordings((prev) => {
            const updated = [newRecording, ...prev];
            // Persist metadata to web localStorage (URLs will be temporary, but list is preserved)
            try {
              const val = localStorage.getItem('ipcam_web_recordings');
              const allRecs = val ? JSON.parse(val) : [];
              allRecs.unshift(newRecording);
              localStorage.setItem('ipcam_web_recordings', JSON.stringify(allRecs));
            } catch (e) {
              console.warn('Error saving to localStorage:', e);
            }
            return updated;
          });
        };
        
        mediaRecorder.start(1000);
        setIsRecording(true);
        
        // Frame rendering loop
        const drawFrame = () => {
          if (!isRecordingRef.current) return;
          if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          requestAnimationFrame(drawFrame);
        };
        
        drawFrame();

        // Start duration timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const nextTime = prev + 1;
            recordingTimeRef.current = nextTime;
            return nextTime;
          });
        }, 1000);

      } catch (err) {
        console.warn('Web MediaRecorder failed, falling back to simulation:', err);
        startRecordingSimulation();
      }
    } else {
      // Mobile - Local file-system based recording
      setIsRecording(true);
      const recId = `rec_${Date.now()}`;
      activeRecIdRef.current = recId;
      frameCounterRef.current = 0;
      
      // Ensure directory exists
      try {
        const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
        }
      } catch (e) {
        console.warn('Error creating directory:', e);
      }

      timerRef.current = setInterval(async () => {
        setRecordingTime((prev) => {
          const nextTime = prev + 1;
          recordingTimeRef.current = nextTime;
          return nextTime;
        });
        
        try {
          if (snapshotUrlRef.current) {
            const frameIndex = frameCounterRef.current++;
            const frameUri = `${RECORDINGS_DIR}${recId}_${frameIndex}.jpg`;
            
            // Download remote frame to local file
            await FileSystem.downloadAsync(snapshotUrlRef.current, frameUri);
            chunksRef.current.push(frameUri);
          }
        } catch (err) {
          console.warn('Failed to record frame on mobile:', err);
        }
      }, 1000);
    }
  }, [cameraId, startRecordingSimulation]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = recordingTimeRef.current;
    const recId = activeRecIdRef.current || `rec_${Date.now()}`;

    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('Failed to stop Web MediaRecorder:', err);
          // Fallback simulation stop
          const frames = [...chunksRef.current];
          const newRecording = {
            id: recId,
            cameraId: cameraIdRef.current,
            url: frames[frames.length - 1] || snapshotUrlRef.current,
            duration,
            timestamp: new Date().toISOString(),
            size: frames.length * 45000,
            format: 'JPEG Sequence',
            frames,
          };
          setRecordings((prev) => [newRecording, ...prev]);
        }
      } else {
        // Web simulation stop
        const frames = [...chunksRef.current];
        const newRecording = {
          id: recId,
          cameraId: cameraIdRef.current,
          url: frames[frames.length - 1] || snapshotUrlRef.current,
          duration,
          timestamp: new Date().toISOString(),
          size: frames.length * 45000,
          format: 'JPEG Sequence',
          frames,
        };
        setRecordings((prev) => [newRecording, ...prev]);
      }
    } else {
      // Mobile - finalize local storage recording
      const frames = [...chunksRef.current];
      const fileSize = frames.length * 45000; // Average of 45KB per JPEG snapshot
      
      const newRecording = {
        id: recId,
        cameraId: cameraIdRef.current,
        url: frames.length > 0 ? frames[frames.length - 1] : snapshotUrlRef.current,
        duration,
        timestamp: new Date().toISOString(),
        size: fileSize,
        format: 'JPEG Sequence',
        frames,
        thumbnail: frames.length > 0 ? frames[frames.length - 1] : snapshotUrlRef.current,
      };

      try {
        let allRecs = [];
        const indexInfo = await FileSystem.getInfoAsync(INDEX_FILE);
        if (indexInfo.exists) {
          const content = await FileSystem.readAsStringAsync(INDEX_FILE);
          allRecs = JSON.parse(content);
        }
        
        allRecs.unshift(newRecording);
        await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(allRecs));
        
        setRecordings((prev) => [newRecording, ...prev]);
      } catch (err) {
        console.warn('Error saving metadata to Index file:', err);
        setRecordings((prev) => [newRecording, ...prev]);
      }
    }

    setIsRecording(false);
  }, [cameraId]);

  const deleteRecording = useCallback(async (id) => {
    if (Platform.OS === 'web') {
      setRecordings((prev) => {
        const target = prev.find((r) => r.id === id);
        if (target && target.url && target.url.startsWith('blob:')) {
          URL.revokeObjectURL(target.url);
        }
        const updated = prev.filter((r) => r.id !== id);
        
        try {
          const val = localStorage.getItem('ipcam_web_recordings');
          if (val) {
            const allRecs = JSON.parse(val);
            const filteredRecs = allRecs.filter((r) => r.id !== id);
            localStorage.setItem('ipcam_web_recordings', JSON.stringify(filteredRecs));
          }
        } catch (e) {
          console.warn('Error saving to localStorage after delete:', e);
        }
        return updated;
      });
    } else {
      try {
        const indexInfo = await FileSystem.getInfoAsync(INDEX_FILE);
        if (indexInfo.exists) {
          const content = await FileSystem.readAsStringAsync(INDEX_FILE);
          const allRecs = JSON.parse(content);
          
          const targetRec = allRecs.find((r) => r.id === id);
          if (targetRec && targetRec.frames) {
            // Delete all frame files from the device storage
            for (const frameUri of targetRec.frames) {
              const fileInfo = await FileSystem.getInfoAsync(frameUri);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(frameUri, { idempotent: true });
              }
            }
          }
          
          const updatedRecs = allRecs.filter((r) => r.id !== id);
          await FileSystem.writeAsStringAsync(INDEX_FILE, JSON.stringify(updatedRecs));
          
          setRecordings(updatedRecs.filter((r) => r.cameraId === cameraIdRef.current));
        }
      } catch (err) {
        console.warn('Error deleting recording files from mobile disk:', err);
      }
    }
  }, []);

  // Share recording natively on mobile, or trigger browser download on web
  const shareRecording = useCallback(async (recordingItem) => {
    if (!recordingItem) return;

    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = recordingItem.url;
        link.download = `recording_${recordingItem.id}.${recordingItem.format.includes('Video') ? 'webm' : 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.warn('Failed to download recording on web:', e);
      }
    } else {
      try {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (!isSharingAvailable) {
          alert('Sharing is not available on this platform');
          return;
        }

        // We share the last frame/thumbnail JPEG file natively
        const shareUri = recordingItem.thumbnail || (recordingItem.frames && recordingItem.frames.length > 0 ? recordingItem.frames[recordingItem.frames.length - 1] : null);
        if (shareUri) {
          const fileInfo = await FileSystem.getInfoAsync(shareUri);
          if (fileInfo.exists) {
            await Sharing.shareAsync(shareUri, {
              dialogTitle: `Compartir Grabación ${new Date(recordingItem.timestamp).toLocaleDateString()}`,
              mimeType: 'image/jpeg',
            });
          } else {
            alert('El archivo de grabación no existe en el disco.');
          }
        } else {
          alert('No hay archivos disponibles para compartir.');
        }
      } catch (err) {
        console.warn('Error sharing native file:', err);
      }
    }
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordingTime,
    formatTime,
    recordings,
    startRecording,
    stopRecording,
    deleteRecording,
    shareRecording,
  };
};

export default useRecording;
