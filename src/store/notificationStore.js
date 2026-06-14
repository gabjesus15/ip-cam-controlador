import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],

      // Actions
      addNotification: (title, body, type = 'info', cameraId = null) => {
        const newNotification = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          body,
          type, // 'info' | 'motion' | 'offline' | 'online'
          cameraId,
          timestamp: Date.now(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Cap at 100 historical logs
        }));
        
        return newNotification;
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      // Helpers (derived state)
      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'ipcam-notifications-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useNotificationStore;
