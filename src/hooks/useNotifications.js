import { useState, useCallback, useRef } from 'react';

/**
 * Hook for push notifications and local notifications
 * @returns {Object} Notification state and controls
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState('default');
  const notificationIdRef = useRef(0);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const sendNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window)) return;

    const id = ++notificationIdRef.current;
    const notification = {
      id,
      title,
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      timestamp: Date.now(),
      read: false,
      data: options.data || {},
    };

    setNotifications(prev => [notification, ...prev]);

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: options.body,
          icon: options.icon,
          tag: options.tag || `notification_${id}`,
          requireInteraction: options.requireInteraction || false,
          ...options,
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  }, []);

  const sendMotionAlert = useCallback((cameraName, cameraId) => {
    sendNotification(`🔴 Movimiento detectado`, {
      body: `Se detectó movimiento en: ${cameraName}`,
      icon: '/favicon.ico',
      tag: `motion_${cameraId}`,
      data: {
        type: 'motion',
        cameraId,
        cameraName,
      },
      requireInteraction: true,
    });
  }, [sendNotification]);

  const sendCameraOfflineAlert = useCallback((cameraName, cameraId) => {
    sendNotification(`⚠️ Cámara offline`, {
      body: `${cameraName} se ha desconectado`,
      icon: '/favicon.ico',
      tag: `offline_${cameraId}`,
      data: {
        type: 'offline',
        cameraId,
        cameraName,
      },
    });
  }, [sendNotification]);

  const sendCameraOnlineAlert = useCallback((cameraName, cameraId) => {
    sendNotification(`✅ Cámara online`, {
      body: `${cameraName} está disponible nuevamente`,
      icon: '/favicon.ico',
      tag: `online_${cameraId}`,
      data: {
        type: 'online',
        cameraId,
        cameraName,
      },
    });
  }, [sendNotification]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    sendNotification,
    sendMotionAlert,
    sendCameraOfflineAlert,
    sendCameraOnlineAlert,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    deleteNotification,
  };
};

export default useNotifications;
