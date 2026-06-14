import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Hook for motion detection using frame comparison (web) or file-size heuristic (mobile)
 * @param {string} snapshotUrl - URL to fetch snapshots
 * @param {number} sensitivity - Motion sensitivity (0-100, default 30)
 * @returns {Object} Motion detection state and controls
 */
export const useMotionDetection = (snapshotUrl, sensitivity = 30) => {
  const [motionDetected, setMotionDetected] = useState(false);
  const [motionHistory, setMotionHistory] = useState([]);
  const [isActive, setIsActive] = useState(false);
  
  const thresholdRef = useRef(sensitivity);
  const lastSizeRef = useRef(0);
  const lastTimeRef = useRef(0);

  // Update sensitivity threshold dynamically
  useEffect(() => {
    thresholdRef.current = sensitivity;
  }, [sensitivity]);

  const startDetection = useCallback(() => {
    setIsActive(true);
  }, []);

  const stopDetection = useCallback(() => {
    setIsActive(false);
    setMotionDetected(false);
  }, []);

  const clearHistory = useCallback(() => {
    setMotionHistory([]);
  }, []);

  // Web implementation (Canvas & Pixel comparison)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isActive || !snapshotUrl) return;

    const video = document.createElement('video');
    video.src = snapshotUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    let animationId;
    let lastFrame = null;
    let lastMotionTime = 0;

    const detectMotionWeb = () => {
      if (video.readyState < 2) {
        animationId = requestAnimationFrame(detectMotionWeb);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const currentData = currentFrame.data;

      if (lastFrame) {
        const lastData = lastFrame.data;
        let pixelsChanged = 0;
        const totalPixels = canvas.width * canvas.height;
        const sampleRate = 4; // Check every 4th pixel for performance

        for (let i = 0; i < totalPixels; i += sampleRate) {
          const idx = i * 4;
          const rDiff = Math.abs(currentData[idx] - lastData[idx]);
          const gDiff = Math.abs(currentData[idx + 1] - lastData[idx + 1]);
          const bDiff = Math.abs(currentData[idx + 2] - lastData[idx + 2]);

          const pixelDiff = (rDiff + gDiff + bDiff) / 3;
          if (pixelDiff > 25) {
            pixelsChanged++;
          }
        }

        const changePercent = (pixelsChanged / (totalPixels / sampleRate)) * 100;
        const threshold = thresholdRef.current;

        if (changePercent > threshold) {
          const now = Date.now();
          if (now - lastMotionTime > 3000) { // Debounce: 3 seconds
            lastMotionTime = now;
            setMotionDetected(true);
            setMotionHistory((prev) => [
              ...prev.slice(-49), // Keep last 49 + 1 new = 50 max
              {
                id: `motion_${now}`,
                timestamp: now,
                intensity: Math.round(changePercent),
              },
            ]);
            setTimeout(() => setMotionDetected(false), 3000);
          }
        }
      }

      lastFrame = currentFrame;
      animationId = requestAnimationFrame(detectMotionWeb);
    };

    video.play()
      .then(() => {
        detectMotionWeb();
      })
      .catch((err) => {
        console.warn('Web motion video playback issue:', err);
      });

    return () => {
      cancelAnimationFrame(animationId);
      video.pause();
      video.src = '';
    };
  }, [isActive, snapshotUrl]);

  // Mobile implementation (Content-Length / File Size Checksum Heuristic)
  useEffect(() => {
    if (Platform.OS === 'web' || !isActive || !snapshotUrl) return;

    let intervalId;
    let lastMotionTime = 0;

    const checkMotionMobile = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(snapshotUrl, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) return;

        // Try getting Content-Length from header first (very fast)
        let size = parseInt(response.headers.get('content-length') || '0', 10);
        
        // If header is missing (common with chunked transfers), we read blob size
        if (size === 0) {
          const blob = await response.blob();
          size = blob.size;
        }

        if (lastSizeRef.current > 0 && size > 0) {
          const diff = Math.abs(size - lastSizeRef.current);
          const percentChange = (diff / lastSizeRef.current) * 100;
          
          // Sensitivity scales: high sensitivity (low threshold input) triggers on smaller changes
          // sensitivity of 30 means threshold is about 3% change in JPG payload size.
          const threshold = Math.max(1, (100 - thresholdRef.current) / 10);

          if (percentChange > threshold) {
            const now = Date.now();
            if (now - lastMotionTime > 4000) { // Debounce: 4 seconds
              lastMotionTime = now;
              setMotionDetected(true);
              setMotionHistory((prev) => [
                ...prev.slice(-49),
                {
                  id: `motion_${now}`,
                  timestamp: now,
                  intensity: Math.round(percentChange * 10), // Scale intensity for display
                },
              ]);
              setTimeout(() => setMotionDetected(false), 3000);
            }
          }
        }

        lastSizeRef.current = size;
      } catch {
        // Ignore network errors during active monitoring
      }
    };

    // Run check every 2.5 seconds
    checkMotionMobile();
    intervalId = setInterval(checkMotionMobile, 2500);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, snapshotUrl]);

  return {
    motionDetected,
    motionHistory,
    isActive,
    startDetection,
    stopDetection,
    clearHistory,
    sensitivity: thresholdRef.current,
  };
};

export default useMotionDetection;
