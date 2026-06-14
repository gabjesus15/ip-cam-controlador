import { useCallback } from 'react';
import { Platform, Alert, Vibration } from 'react-native';
import * as FileSystem from 'expo-file-system';
import useNotificationStore from '../store/notificationStore';
import useSettingsStore from '../store/settingsStore';

/**
 * Hook for cross-platform notifications. Integrates with Zustand global notificationStore.
 */
export const useNotifications = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const settings = useSettingsStore((state) => state.settings);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
      }
      try {
        const result = await window.Notification.requestPermission();
        return result === 'granted';
      } catch (err) {
        console.error('Error requesting notification permission:', err);
        return false;
      }
    }
    // Mobile permissions are handled by native OS / Expo push setup if needed
    return true;
  }, []);

  const sendNotification = useCallback((title, body, type = 'info', cameraId = null) => {
    // 1. Save globally in Zustand store (our database log)
    addNotification(title, body, type, cameraId);

    // 2. Play tactile feedback
    Vibration.vibrate(200);

    // 3. Platform-specific alert delivery
    if (Platform.OS === 'web') {
      if ('Notification' in window && window.Notification.permission === 'granted') {
        try {
          new window.Notification(title, {
            body,
            icon: '/favicon.ico',
          });
        } catch (err) {
          console.error('Error delivering web notification:', err);
        }
      }
    } else {
      // Mobile alert overlay
      Alert.alert(title, body, [{ text: 'Entendido', style: 'default' }]);
    }
  }, [addNotification]);

  // Pre-configured alerts
  const sendMotionAlert = useCallback(async (cameraName, cameraId, snapshotUrl = null) => {
    sendNotification(
      `🔴 Movimiento Detectado`,
      `Se detectó movimiento en la cámara: "${cameraName}"`,
      'motion',
      cameraId
    );

    // Trigger Cloud Webhook if enabled
    if (settings.enableCloudSync && settings.cloudWebhookUrl) {
      try {
        let base64Snapshot = '';
        if (snapshotUrl) {
          try {
            if (Platform.OS === 'web') {
              const response = await fetch(snapshotUrl);
              if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                base64Snapshot = await new Promise((resolve) => {
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              }
            } else {
              const tempUri = `${FileSystem.cacheDirectory}temp_motion_${Date.now()}.jpg`;
              await FileSystem.downloadAsync(snapshotUrl, tempUri);
              const base64Data = await FileSystem.readAsStringAsync(tempUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              base64Snapshot = `data:image/jpeg;base64,${base64Data}`;
              await FileSystem.deleteAsync(tempUri, { idempotent: true });
            }
          } catch (fetchErr) {
            console.warn('Failed to fetch snapshot for cloud sync webhook:', fetchErr);
          }
        }

        const payload = {
          event: 'motion_detected',
          cameraName,
          cameraId,
          timestamp: Date.now(),
          snapshot: base64Snapshot || null,
        };

        fetch(settings.cloudWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }).catch((err) => console.warn('Error sending webhook POST request:', err));

      } catch (err) {
        console.warn('Cloud webhook sync failed:', err);
      }
    }
  }, [sendNotification, settings.enableCloudSync, settings.cloudWebhookUrl]);

  const sendCameraOfflineAlert = useCallback((cameraName, cameraId) => {
    sendNotification(
      `⚠️ Cámara Desconectada`,
      `La cámara "${cameraName}" se encuentra offline.`,
      'offline',
      cameraId
    );
  }, [sendNotification]);

  const sendCameraOnlineAlert = useCallback((cameraName, cameraId) => {
    sendNotification(
      `✅ Cámara en Línea`,
      `La cámara "${cameraName}" vuelve a estar disponible.`,
      'online',
      cameraId
    );
  }, [sendNotification]);

  return {
    requestPermission,
    sendNotification,
    sendMotionAlert,
    sendCameraOfflineAlert,
    sendCameraOnlineAlert,
  };
};

export default useNotifications;
