import { Platform } from 'react-native';
import { CAMERA_PROFILES, detectProfileFromResponse } from './cameraProfiles';

/**
 * Scan a single IP address on specific ports and endpoints to see if there is a camera.
 */
const probeIP = async (ip, port, timeout = 1000, signal) => {
  const commonPaths = [
    '/video',
    '/stream',
    '/live',
    '/snapshot.jpg',
    '/ISAPI/System/deviceInfo',
    '/cgi-bin/magicBox.cgi?action=getDeviceType',
  ];

  // Try the root path first
  const rootUrl = `http://${ip}:${port}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Wire abort signal if provided
    if (signal) {
      signal.addEventListener('abort', () => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }

    const response = await fetch(rootUrl, {
      method: 'GET', // Use GET to fetch headers and optionally small HTML body for fingerprinting
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok || response.status === 401) {
      // 401 Unauthorized is actually a good sign! It means something is there and requires login.
      const htmlBody = response.status !== 401 ? await response.text().catch(() => '') : '';
      const brand = detectProfileFromResponse(response.headers, htmlBody, rootUrl);
      const profile = CAMERA_PROFILES[brand];
      
      // Build a found camera object
      return {
        id: `discovered_${ip.replace(/\./g, '_')}_${port}`,
        name: `${profile.name} (${ip}:${port})`,
        ip,
        port: port.toString(),
        url: `http://${ip}:${port}${profile.streamPaths[0]}`,
        snapshotUrl: `http://${ip}:${port}${profile.snapshotPaths[0]}`,
        type: brand,
        status: 'online',
        username: profile.defaultUsername,
        password: profile.defaultPassword,
        brand,
      };
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      // Connection refused or network error. Port is closed, skip paths!
      return null;
    }
  }

  // If root failed, quickly try common stream paths
  for (const path of commonPaths) {
    if (signal?.aborted) return null;
    const url = `http://${ip}:${port}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      if (signal) {
        signal.addEventListener('abort', () => {
          controller.abort();
          clearTimeout(timeoutId);
        });
      }

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 401) {
        const brand = detectProfileFromResponse(response.headers, '', url);
        const profile = CAMERA_PROFILES[brand];
        return {
          id: `discovered_${ip.replace(/\./g, '_')}_${port}`,
          name: `${profile.name} (${ip}:${port})`,
          ip,
          port: port.toString(),
          url: url,
          snapshotUrl: `http://${ip}:${port}${profile.snapshotPaths[0]}`,
          type: brand,
          status: 'online',
          username: profile.defaultUsername,
          password: profile.defaultPassword,
          brand,
        };
      }
    } catch {
      // Ignore
    }
  }

  return null;
};

/**
 * Perform SOAP ONVIF Probe on an IP
 */
const probeONVIF = async (ip, port, timeout = 1000, signal) => {
  const onvifPaths = ['/onvif/device_service', '/device_service', '/onvif'];
  const probeMessage = `<?xml version="1.0" encoding="UTF-8"?>
    <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing">
      <s:Header>
        <a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
        <a:MessageID>urn:uuid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}</a:MessageID>
        <a:To s:mustUnderstand="1">urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
      </s:Header>
      <s:Body>
        <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
          <Types>tds:Device</Types>
        </Probe>
      </s:Body>
    </s:Envelope>`;

  for (const path of onvifPaths) {
    if (signal?.aborted) return null;
    const url = `http://${ip}:${port}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      if (signal) {
        signal.addEventListener('abort', () => {
          controller.abort();
          clearTimeout(timeoutId);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
        },
        body: probeMessage,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 400 || response.status === 401) {
        const text = await response.text().catch(() => '');
        if (text.includes('ONVIF') || text.includes('Device') || text.includes('wsdl') || text.includes('schema')) {
          return {
            id: `onvif_${ip.replace(/\./g, '_')}_${port}`,
            name: `Cámara ONVIF (${ip}:${port})`,
            ip,
            port: port.toString(),
            url: `http://${ip}:${port}${path}`,
            snapshotUrl: `http://${ip}:${port}/onvif-http/snapshot?stream=0`,
            type: 'onvif',
            status: 'online',
            username: 'admin',
            password: '',
            onvif: true,
            brand: 'onvif',
          };
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
};

/**
 * Scan a full subnet for IP cameras (using parallel batching)
 */
export const scanSubnet = async (subnet = '192.168.1', options = {}, onProgress) => {
  const defaultPorts = ['80', '8080', '8081', '88', '554', '8000', '37777', '34567'];
  const ports = options.ports || defaultPorts;
  const timeout = options.timeout || 1000;
  const maxConcurrency = options.maxConcurrency || 15;
  const signal = options.signal;

  const foundCameras = [];
  const startIp = 1;
  const endIp = 254;
  const totalIps = endIp - startIp + 1;
  
  let scannedCount = 0;

  // Split IP list into chunks for concurrency control
  const ips = [];
  for (let i = startIp; i <= endIp; i++) {
    ips.push(`${subnet}.${i}`);
  }

  // Helper to run tasks in parallel with a concurrency limit
  const runInConcurrencyLimit = async (limit, array, taskFn) => {
    const results = [];
    const executing = [];
    
    for (const item of array) {
      if (signal?.aborted) break;
      
      const p = Promise.resolve().then(() => taskFn(item));
      results.push(p);
      
      if (limit <= array.length) {
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }
    return Promise.all(results);
  };

  await runInConcurrencyLimit(maxConcurrency, ips, async (ip) => {
    if (signal?.aborted) return;

    // Report progress to caller
    scannedCount++;
    if (onProgress) {
      onProgress({
        scanned: scannedCount,
        total: totalIps,
        found: foundCameras.length,
        currentIp: ip,
      });
    }

    // Fast ping all selected ports in parallel to check if any are open
    const pingPromises = ports.map(async (port) => {
      try {
        const pingController = new AbortController();
        const pingTimeout = setTimeout(() => pingController.abort(), 350); // 350ms timeout
        
        await fetch(`http://${ip}:${port}`, { method: 'HEAD', signal: pingController.signal });
        clearTimeout(pingTimeout);
        return { port, ok: true };
      } catch (err) {
        // On Web, standard fetch throws a TypeError due to CORS even if the port is open.
        // Therefore, on Web, if the error is not an AbortError (timeout), we treat it as open.
        // On Mobile/Native, we do not have CORS issues, so any error means the port is closed.
        if (Platform.OS === 'web') {
          if (err.name !== 'AbortError') {
            return { port, ok: true };
          }
        }
        return { port, ok: false };
      }
    });

    const pingResults = await Promise.all(pingPromises);
    const openPorts = pingResults.filter((r) => r.ok).map((r) => r.port);

    if (openPorts.length === 0) return; // Skip offline hosts

    // Probe the online host ONLY on the open ports
    for (const port of openPorts) {
      if (signal?.aborted) break;

      // 1. Try standard probe
      const result = await probeIP(ip, port, timeout, signal);
      if (result) {
        // Prevent duplicates
        if (!foundCameras.some((c) => c.ip === ip && c.port === port.toString())) {
          foundCameras.push(result);
          if (onProgress) {
            onProgress({
              scanned: scannedCount,
              total: totalIps,
              found: foundCameras.length,
              currentIp: ip,
            });
          }
        }
        break; // Found on this port, skip other ports for this IP
      }

      // 2. Try ONVIF probe if it failed
      const onvifResult = await probeONVIF(ip, port, timeout, signal);
      if (onvifResult) {
        if (!foundCameras.some((c) => c.ip === ip && c.port === port.toString())) {
          foundCameras.push(onvifResult);
          if (onProgress) {
            onProgress({
              scanned: scannedCount,
              total: totalIps,
              found: foundCameras.length,
              currentIp: ip,
            });
          }
        }
        break;
      }
    }
  });

  return foundCameras;
};

/**
 * Scan for UDP cameras (A9 / V720 / X5 Beken devices) using MSG_LAN_SEARCH broadcast on port 32108.
 * Requires native UDP socket support — only works in a compiled native app (not Web or Expo Go).
 */
export const scanUDPDiscovery = async (timeout = 3000, onFound) => {
  // Guard #1: Web platform never has native UDP sockets — reject immediately and cleanly
  if (Platform.OS === 'web') {
    throw new Error('UDP_LIBRARY_NOT_AVAILABLE');
  }

  // Guard #2: Attempt to load the native react-native-udp module
  let dgram;
  try {
    const udpModule = require('react-native-udp');
    // Handle both direct export and .default export patterns
    if (udpModule && typeof udpModule.createSocket === 'function') {
      dgram = udpModule;
    } else if (udpModule && udpModule.default && typeof udpModule.default.createSocket === 'function') {
      dgram = udpModule.default;
    } else {
      throw new Error('UDP_LIBRARY_NOT_AVAILABLE');
    }
  } catch (e) {
    throw new Error('UDP_LIBRARY_NOT_AVAILABLE');
  }

  return new Promise((resolve, reject) => {
    const foundCameras = [];
    let socket;
    let isFinished = false;

    // Guard #3: Wrap createSocket itself in a try/catch
    try {
      socket = dgram.createSocket({ type: 'udp4' });
    } catch (e) {
      reject(new Error('UDP_LIBRARY_NOT_AVAILABLE'));
      return;
    }

    const cleanup = () => {
      isFinished = true;
      try {
        socket.close();
      } catch (e) {}
    };

    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });

    socket.on('message', (msg, rinfo) => {
      if (isFinished) return;
      const ip = rinfo.address;

      if (foundCameras.some((c) => c.ip === ip)) return;

      const newCam = {
        id: `discovered_udp_${ip.replace(/\./g, '_')}`,
        name: `Cámara A9/V720 (${ip})`,
        ip,
        port: '32108',
        url: `http://${ip}:8080/stream`, // Default proxy path placeholder
        snapshotUrl: `http://${ip}:8080/snapshot.jpg`,
        type: 'mjpeg',
        status: 'online',
        username: 'admin',
        password: '',
        brand: 'Beken/A9',
        udpDiscovery: true,
      };

      foundCameras.push(newCam);
      if (onFound) {
        onFound(newCam);
      }
    });

    try {
      socket.bind(0);
      socket.once('listening', () => {
        try {
          socket.setBroadcast(true);
          // MSG_LAN_SEARCH PPPP packet [0xF1, 0x30, 0x00, 0x00]
          const message = new Uint8Array([0xF1, 0x30, 0x00, 0x00]);
          socket.send(message, 0, message.length, 32108, '255.255.255.255', (err) => {
            if (err) {
              cleanup();
              reject(err);
            }
          });
        } catch (e) {
          cleanup();
          reject(e);
        }
      });

      // Stop listening after the timeout period
      setTimeout(() => {
        cleanup();
        resolve(foundCameras);
      }, timeout);

    } catch (e) {
      cleanup();
      reject(e);
    }
  });
};

export default {
  scanSubnet,
  scanUDPDiscovery,
};
