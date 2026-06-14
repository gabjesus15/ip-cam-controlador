import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to generate IDs safely
const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useCameraStore = create(
  persist(
    (set, get) => ({
      cameras: [],
      loading: false,
      scanning: false,
      scanProgress: { scanned: 0, total: 0, found: 0, currentIp: '' },
      scanResults: [],

      // Actions
      addCamera: async (camera) => {
        const newCamera = {
          ...camera,
          id: generateId(),
          status: 'checking',
          thumbnail: null,
          addedAt: new Date().toISOString(),
        };

        set((state) => ({
          cameras: [...state.cameras, newCamera],
        }));

        // Trigger asynchronous healthcheck on addition
        get().checkCameraStatus(newCamera.id);
        return newCamera;
      },

      removeCamera: async (id) => {
        set((state) => ({
          cameras: state.cameras.filter((c) => c.id !== id),
        }));
      },

      updateCamera: async (id, updates) => {
        set((state) => ({
          cameras: state.cameras.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      checkCameraStatus: async (id) => {
        const camera = get().cameras.find((c) => c.id === id);
        if (!camera) return 'unknown';

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(camera.url, {
            method: 'HEAD',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const newStatus = response.ok ? 'online' : 'offline';
          
          if (camera.status !== newStatus) {
            get().updateCamera(id, { status: newStatus });
          }
          return newStatus;
        } catch {
          if (camera.status !== 'offline') {
            get().updateCamera(id, { status: 'offline' });
          }
          return 'offline';
        }
      },

      checkAllStatuses: async () => {
        const { cameras } = get();
        if (cameras.length === 0) return;

        set({ loading: true });
        
        // Check all statuses in parallel
        await Promise.allSettled(
          cameras.map((camera) => get().checkCameraStatus(camera.id))
        );

        set({ loading: false });
      },

      setScanning: (scanning) => set({ scanning }),
      setScanProgress: (progress) => set((state) => ({
        scanProgress: { ...state.scanProgress, ...progress }
      })),
      setScanResults: (results) => set({ scanResults: results }),
      clearScanProgress: () => set({
        scanProgress: { scanned: 0, total: 0, found: 0, currentIp: '' },
        scanResults: []
      }),
    }),
    {
      name: 'ipcam-cameras-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ cameras: state.cameras }), // Only persist cameras array
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Remove any cameras that have placeholder/demo URLs
          const PLACEHOLDER_PATTERNS = [
            'cctv-stream-placeholder.com',
            'example.com',
            'placeholder',
            'demo-camera',
          ];
          const cleanCameras = state.cameras.filter((camera) => {
            const url = (camera.url || '').toLowerCase();
            return !PLACEHOLDER_PATTERNS.some((p) => url.includes(p));
          });
          if (cleanCameras.length !== state.cameras.length) {
            state.cameras = cleanCameras;
          }
        }
      },
    }
  )
);

export default useCameraStore;
