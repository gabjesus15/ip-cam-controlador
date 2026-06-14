export const CAMERA_PROFILES = {
  generic: {
    name: 'Cámara Genérica',
    defaultPort: '8080',
    defaultUsername: 'admin',
    defaultPassword: '',
    streamPaths: [
      '/video',
      '/stream',
      '/live',
      '/mjpeg',
      '/video.mjpg',
      '/cgi-bin/faststream.jpg?stream=half&fps=15&auth=...',
    ],
    snapshotPaths: [
      '/snapshot.jpg',
      '/snap.jpg',
      '/image.jpg',
      '/onvif-http/snapshot?stream=0',
    ],
    ptz: {
      supported: false,
    },
  },
  onvif: {
    name: 'Cámara ONVIF Estándar',
    defaultPort: '80',
    defaultUsername: 'admin',
    defaultPassword: '',
    streamPaths: [
      '/onvif/device_service',
      '/device_service',
    ],
    snapshotPaths: [
      '/onvif-http/snapshot?stream=0',
      '/snapshot.jpg',
    ],
    ptz: {
      supported: true,
      commands: {
        up: '/onvif/ptz?cmd=up',
        down: '/onvif/ptz?cmd=down',
        left: '/onvif/ptz?cmd=left',
        right: '/onvif/ptz?cmd=right',
        zoomIn: '/onvif/ptz?cmd=zoomin',
        zoomOut: '/onvif/ptz?cmd=zoomout',
      },
    },
  },
  hikvision: {
    name: 'Hikvision',
    defaultPort: '80',
    defaultUsername: 'admin',
    defaultPassword: '12345password',
    streamPaths: [
      '/ISAPI/Streaming/channels/101/httpPreview', // MJPEG stream
      '/Streaming/Channels/1/httpPreview',
      '/Streaming/Channels/101',
    ],
    snapshotPaths: [
      '/ISAPI/Streaming/channels/101/picture',
      '/Streaming/Channels/1/picture',
    ],
    ptz: {
      supported: true,
      commands: {
        // HTTP commands using Hikvision's ISAPI (xml format or query params)
        up: '/ISAPI/PTZCtrl/channels/1/continuous?PTZData=<PTZData><pan>0</pan><tilt>60</tilt></PTZData>',
        down: '/ISAPI/PTZCtrl/channels/1/continuous?PTZData=<PTZData><pan>0</pan><tilt>-60</tilt></PTZData>',
        left: '/ISAPI/PTZCtrl/channels/1/continuous?PTZData=<PTZData><pan>-60</pan><tilt>0</tilt></PTZData>',
        right: '/ISAPI/PTZCtrl/channels/1/continuous?PTZData=<PTZData><pan>60</pan><tilt>0</tilt></PTZData>',
        zoomIn: '/ISAPI/PTZCtrl/channels/1/continuous?PTZData=<PTZData><zoom>60</zoom></PTZData>',
        zoomOut: '/ISAPI/PTZCtrl/channels/1/continuous?PTZData=<PTZData><zoom>-60</zoom></PTZData>',
      },
    },
  },
  dahua: {
    name: 'Dahua',
    defaultPort: '80',
    defaultUsername: 'admin',
    defaultPassword: 'admin',
    streamPaths: [
      '/cgi-bin/mjpg/video.cgi?channel=1&subtype=0',
      '/cgi-bin/video.cgi?subtype=1',
    ],
    snapshotPaths: [
      '/cgi-bin/snapshot.cgi?channel=1',
    ],
    ptz: {
      supported: true,
      commands: {
        up: '/cgi-bin/ptz.cgi?action=start&code=Up&arg1=0&arg2=8&arg3=0',
        down: '/cgi-bin/ptz.cgi?action=start&code=Down&arg1=0&arg2=8&arg3=0',
        left: '/cgi-bin/ptz.cgi?action=start&code=Left&arg1=0&arg2=8&arg3=0',
        right: '/cgi-bin/ptz.cgi?action=start&code=Right&arg1=0&arg2=8&arg3=0',
        zoomIn: '/cgi-bin/ptz.cgi?action=start&code=ZoomWide&arg1=0&arg2=8&arg3=0',
        zoomOut: '/cgi-bin/ptz.cgi?action=start&code=ZoomTele&arg1=0&arg2=8&arg3=0',
      },
    },
  },
  tplink: {
    name: 'TP-Link Tapo',
    defaultPort: '554', // RTSP by default, HTTP is usually 80 or 8080
    defaultUsername: 'admin',
    defaultPassword: '',
    streamPaths: [
      '/stream1', // RTSP path
      '/stream2',
    ],
    snapshotPaths: [
      '/snapshot',
    ],
    ptz: {
      supported: true,
      commands: {
        up: '/cgi-bin/ptz?dir=up',
        down: '/cgi-bin/ptz?dir=down',
        left: '/cgi-bin/ptz?dir=left',
        right: '/cgi-bin/ptz?dir=right',
        zoomIn: '/cgi-bin/ptz?zoom=in',
        zoomOut: '/cgi-bin/ptz?zoom=out',
      },
    },
  },
  reolink: {
    name: 'Reolink',
    defaultPort: '80',
    defaultUsername: 'admin',
    defaultPassword: '',
    streamPaths: [
      '/h264Preview_01_main',
      '/h264Preview_01_sub',
    ],
    snapshotPaths: [
      '/cgi-bin/api.cgi?cmd=Snap&channel=0',
    ],
    ptz: {
      supported: true,
      commands: {
        up: '/cgi-bin/api.cgi?cmd=PtzCtrl&op=TiltUp&speed=8',
        down: '/cgi-bin/api.cgi?cmd=PtzCtrl&op=TiltDown&speed=8',
        left: '/cgi-bin/api.cgi?cmd=PtzCtrl&op=PanLeft&speed=8',
        right: '/cgi-bin/api.cgi?cmd=PtzCtrl&op=PanRight&speed=8',
        zoomIn: '/cgi-bin/api.cgi?cmd=PtzCtrl&op=ZoomIn&speed=8',
        zoomOut: '/cgi-bin/api.cgi?cmd=PtzCtrl&op=ZoomOut&speed=8',
      },
    },
  },
  foscam: {
    name: 'Foscam',
    defaultPort: '88',
    defaultUsername: 'admin',
    defaultPassword: '',
    streamPaths: [
      '/video.mjpg',
      '/cgi-bin/CGIProxy.fcgi?cmd=snapPicture',
    ],
    snapshotPaths: [
      '/cgi-bin/CGIProxy.fcgi?cmd=snapPicture',
    ],
    ptz: {
      supported: true,
      commands: {
        up: '/cgi-bin/CGIProxy.fcgi?cmd=ptzMoveUp',
        down: '/cgi-bin/CGIProxy.fcgi?cmd=ptzMoveDown',
        left: '/cgi-bin/CGIProxy.fcgi?cmd=ptzMoveLeft',
        right: '/cgi-bin/CGIProxy.fcgi?cmd=ptzMoveRight',
        zoomIn: '/cgi-bin/CGIProxy.fcgi?cmd=zoomIn',
        zoomOut: '/cgi-bin/CGIProxy.fcgi?cmd=zoomOut',
      },
    },
  },
};

// Helper to guess profile from headers or response body
export const detectProfileFromResponse = (headers, htmlBody, url) => {
  const serverHeader = headers.get('Server') || '';
  const authHeader = headers.get('WWW-Authenticate') || '';
  
  const serverLower = serverHeader.toLowerCase();
  const authLower = authHeader.toLowerCase();
  const htmlLower = htmlBody ? htmlBody.toLowerCase() : '';
  const urlLower = url.toLowerCase();

  if (serverLower.includes('hikvision') || authLower.includes('hikvision') || urlLower.includes('isapi') || htmlLower.includes('hikvision')) {
    return 'hikvision';
  }
  if (serverLower.includes('dahua') || authLower.includes('dahua') || urlLower.includes('cgi-bin/magicbox') || htmlLower.includes('dahua')) {
    return 'dahua';
  }
  if (urlLower.includes('tapo') || htmlLower.includes('tapo') || serverLower.includes('tapo')) {
    return 'tplink';
  }
  if (serverLower.includes('reolink') || urlLower.includes('reolinkPreview') || htmlLower.includes('reolink')) {
    return 'reolink';
  }
  if (serverLower.includes('foscam') || urlLower.includes('cgi-bin/cgiproxy')) {
    return 'foscam';
  }
  if (htmlLower.includes('onvif') || urlLower.includes('onvif')) {
    return 'onvif';
  }
  
  return 'generic';
};

// Generates the potential video stream URL and snapshot URL for a profile
export const getPathsForProfile = (profileKey, ip, port) => {
  const profile = CAMERA_PROFILES[profileKey] || CAMERA_PROFILES.generic;
  return {
    streamUrls: profile.streamPaths.map(path => `http://${ip}:${port}${path}`),
    snapshotUrls: profile.snapshotPaths.map(path => `http://${ip}:${port}${path}`),
  };
};

export default CAMERA_PROFILES;
