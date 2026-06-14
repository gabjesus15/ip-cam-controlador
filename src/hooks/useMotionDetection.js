import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for motion detection using frame comparison
 * @param {string} videoUrl - URL of the video stream
 * @param {number} sensitivity - Motion sensitivity (0-100, default 30)
 * @returns {Object} Motion detection state and controls
 */
export const useMotionDetection = (videoUrl, sensitivity = 30) => {
  const [motionDetected, setMotionDetected] = useState(false);
  const [motionHistory, setMotionHistory] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const lastFrameRef = useRef(null);
  const thresholdRef = useRef(sensitivity);

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

  useEffect(() => {
    if (!isActive || !videoUrl) return;

    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');

    let animationId;
    let lastMotionTime = 0;

    const detectMotion = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationId = requestAnimationFrame(detectMotion);
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const currentData = currentFrame.data;

      if (lastFrameRef.current) {
        const lastData = lastFrameRef.current.data;
        let diffScore = 0;
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
          diffScore += pixelDiff;
        }

        const changePercent = (pixelsChanged / (totalPixels / sampleRate)) * 100;
        const normalizedScore = Math.min(changePercent, 100);
        const threshold = thresholdRef.current;

        if (normalizedScore > threshold) {
          const now = Date.now();
          if (now - lastMotionTime > 2000) { // Debounce: 2 seconds
            lastMotionTime = now;
            setMotionDetected(true);
            setMotionHistory(prev => [
              ...prev.slice(-49),
              {
                timestamp: now,
                intensity: Math.round(normalizedScore),
                id: `motion_${now}`,
              }
            ]);

            // Reset motion detected after 3 seconds
            setTimeout(() => setMotionDetected(false), 3000);
          }
        }
      }

      lastFrameRef.current = currentFrame;
      animationId = requestAnimationFrame(detectMotion);
    };

    video.play().then(() => {
      detectMotion();
    }).catch(err => {
      console.error('Motion detection video error:', err);
    });

    return () => {
      cancelAnimationFrame(animationId);
      video.pause();
      video.src = '';
    };
  }, [isActive, videoUrl]);

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
