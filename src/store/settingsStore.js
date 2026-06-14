import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSettingsStore = create(
  persist(
    (set) => ({
      settings: {
        defaultSubnet: '192.168.1',
        scanTimeout: 1000,
        healthCheckInterval: 30000,
        motionSensitivity: 30,
        enablePushAlerts: true,
        maxScanConcurrency: 15,
        enableCloudSync: false,
        cloudWebhookUrl: '',
      },

      // Actions
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetSettings: () => {
        set({
          settings: {
            defaultSubnet: '192.168.1',
            scanTimeout: 1000,
            healthCheckInterval: 30000,
            motionSensitivity: 30,
            enablePushAlerts: true,
            maxScanConcurrency: 15,
            enableCloudSync: false,
            cloudWebhookUrl: '',
          },
        });
      },
    }),
    {
      name: 'ipcam-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
