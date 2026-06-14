import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook to retrieve local network connection details, including IP and subnet
 */
export const useNetworkInfo = () => {
  const [networkState, setNetworkState] = useState({
    isConnected: false,
    type: 'unknown',
    ipAddress: null,
    subnet: '192.168.1', // Safe default fallback
    wifiName: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      let ip = null;
      let subnet = '192.168.1';
      let wifiName = null;

      if (state.isConnected && state.details) {
        ip = state.details.ipAddress || state.details.subnet || null;
        wifiName = state.details.ssid || null;

        if (ip) {
          // Extract subnet (e.g. "192.168.1.55" -> "192.168.1")
          const ipParts = ip.split('.');
          if (ipParts.length === 4) {
            subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
          }
        }
      }

      setNetworkState({
        isConnected: !!state.isConnected,
        type: state.type || 'unknown',
        ipAddress: ip,
        subnet,
        wifiName,
      });
    });

    // Check initially
    NetInfo.fetch().then((state) => {
      let ip = null;
      let subnet = '192.168.1';
      let wifiName = null;

      if (state.isConnected && state.details) {
        ip = state.details.ipAddress || state.details.subnet || null;
        wifiName = state.details.ssid || null;

        if (ip) {
          const ipParts = ip.split('.');
          if (ipParts.length === 4) {
            subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
          }
        }
      }

      setNetworkState({
        isConnected: !!state.isConnected,
        type: state.type || 'unknown',
        ipAddress: ip,
        subnet,
        wifiName,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
};

export default useNetworkInfo;
