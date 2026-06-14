import { useEffect, useRef } from 'react';
import useCameraStore from '../store/cameraStore';
import useSettingsStore from '../store/settingsStore';
import useNotifications from './useNotifications';

/**
 * Hook to automatically monitor health status of all registered cameras periodically
 */
export const useCameraHealth = () => {
  const cameras = useCameraStore((state) => state.cameras);
  const checkCameraStatus = useCameraStore((state) => state.checkCameraStatus);
  const settings = useSettingsStore((state) => state.settings);
  const notifications = useNotifications();

  // Track previous statuses to detect transitions (online <-> offline)
  const prevStatusesRef = useRef({});

  useEffect(() => {
    // Initialize status tracking
    cameras.forEach((camera) => {
      if (prevStatusesRef.current[camera.id] === undefined) {
        prevStatusesRef.current[camera.id] = camera.status;
      }
    });
  }, [cameras]);

  const runHealthChecks = async () => {
    if (cameras.length === 0) return;

    for (const camera of cameras) {
      const oldStatus = prevStatusesRef.current[camera.id] || camera.status;
      
      // Check status
      const newStatus = await checkCameraStatus(camera.id);
      
      // Update ref
      prevStatusesRef.current[camera.id] = newStatus;

      // Handle transitions
      if (oldStatus !== newStatus && oldStatus !== 'checking' && oldStatus !== 'unknown') {
        if (newStatus === 'offline') {
          notifications.sendCameraOfflineAlert(camera.name, camera.id);
        } else if (newStatus === 'online') {
          notifications.sendCameraOnlineAlert(camera.name, camera.id);
        }
      }
    }
  };

  useEffect(() => {
    // Initial run
    runHealthChecks();

    // Setup interval healthcheck
    const intervalId = setInterval(runHealthChecks, settings.healthCheckInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [cameras.length, settings.healthCheckInterval]);

  return null;
};

export default useCameraHealth;
