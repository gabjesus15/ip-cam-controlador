import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
  SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { COLORS, SPACING, SIZES, TYPOGRAPHY, SHADOWS } from '../theme';
import useCameraStore from '../store/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import useMotionDetection from '../hooks/useMotionDetection';
import useRecording from '../hooks/useRecording';
import useNotifications from '../hooks/useNotifications';
import CAMERA_PROFILES from '../services/cameraProfiles';

// Custom cross-platform base64 encoder
const encodeBase64 = (str) => {
  if (Platform.OS === 'web') {
    return btoa(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const c1 = str.charCodeAt(i);
    const c2 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
    const c3 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
    
    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const byte4 = isNaN(c3) ? 64 : c3 & 63;
    
    output += chars.charAt(byte1) + chars.charAt(byte2) + 
              (byte3 === 64 ? '=' : chars.charAt(byte3)) + 
              (byte4 === 64 ? '=' : chars.charAt(byte4));
  }
  return output;
};

export const CameraSingleScreen = ({ route, navigation }) => {
  const { camera: initialCamera } = route.params;

  // Global State
  const updateCamera = useCameraStore((state) => state.updateCamera);
  const removeCamera = useCameraStore((state) => state.removeCamera);
  const cameras = useCameraStore((state) => state.cameras);

  // Sync camera details with global store updates
  const camera = useMemo(() => {
    return cameras.find((c) => c.id === initialCamera.id) || initialCamera;
  }, [cameras, initialCamera]);

  // Hooks
  const microInteractions = useMicroInteractions();
  const notifications = useNotifications();
  const motionDetection = useMotionDetection(camera.snapshotUrl || camera.url, 30);
  const recording = useRecording(camera.id, camera.snapshotUrl || camera.url);

  // Local State
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [recordingsModalVisible, setRecordingsModalVisible] = useState(false);
  const [motionLogVisible, setMotionLogVisible] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Playback state
  const [selectedPlaybackRecording, setSelectedPlaybackRecording] = useState(null);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(true);

  // Frame cycler for playback preview
  useEffect(() => {
    let interval;
    if (
      selectedPlaybackRecording &&
      isPlaybackPlaying &&
      selectedPlaybackRecording.frames &&
      selectedPlaybackRecording.frames.length > 1
    ) {
      interval = setInterval(() => {
        setPlaybackFrameIndex((prev) => (prev + 1) % selectedPlaybackRecording.frames.length);
      }, 1000); // 1 frame per second
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedPlaybackRecording, isPlaybackPlaying]);
  
  // Volume and mute controls
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);

  // Snapshot refresh stream for MJPEG fallback
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(Date.now());

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: camera.name,
    ip: camera.ip,
    port: camera.port,
    username: camera.username || '',
    password: camera.password || '',
    url: camera.url,
  });

  // expo-video player hook
  const videoPlayer = useVideoPlayer(isVideoUrl && !videoError ? camera.url : null, (player) => {
    player.loop = false;
    player.muted = isMuted;
    player.volume = volume;
  });

  // Sync play/pause with isPlaying state
  useEffect(() => {
    if (!videoPlayer) return;
    if (isPlaying) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [isPlaying, videoPlayer]);

  // Sync mute/volume with player
  useEffect(() => {
    if (!videoPlayer) return;
    videoPlayer.muted = isMuted;
    videoPlayer.volume = volume;
  }, [isMuted, volume, videoPlayer]);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef(null);

  // Check camera status on mount and interval
  useEffect(() => {
    let checkInterval;
    const verifyStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(camera.url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        
        const newStatus = res.ok ? 'online' : 'offline';
        if (newStatus !== camera.status) {
          updateCamera(camera.id, { status: newStatus });
          if (newStatus === 'offline') {
            notifications.sendCameraOfflineAlert(camera.name, camera.id);
          } else {
            notifications.sendCameraOnlineAlert(camera.name, camera.id);
          }
        }
      } catch {
        if (camera.status !== 'offline') {
          updateCamera(camera.id, { status: 'offline' });
          notifications.sendCameraOfflineAlert(camera.name, camera.id);
        }
      }
    };

    verifyStatus();
    checkInterval = setInterval(verifyStatus, 20000); // Poll status every 20s

    return () => {
      clearInterval(checkInterval);
    };
  }, [camera.id, camera.url]);

  // Motion Alert Trigger
  useEffect(() => {
    if (motionDetection.motionDetected) {
      notifications.sendMotionAlert(camera.name, camera.id, camera.snapshotUrl || camera.url);
    }
  }, [motionDetection.motionDetected, camera.name, camera.id, camera.snapshotUrl, camera.url]);

  // Snapshot MJPEG loop (refreshes Snapshot URI if stream fails or MJPEG profile is selected)
  useEffect(() => {
    if (!isPlaying || camera.status === 'offline') return;

    // Refresh snapshots at 2 FPS (500ms) for fallback preview stream
    const interval = setInterval(() => {
      setSnapshotTimestamp(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, camera.status]);

  // Animate Controls Overlay
  useEffect(() => {
    if (showControls) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Reset auto-hide timer
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls, overlayOpacity]);

  const handleVideoPress = () => {
    microInteractions.vibrate();
    setShowControls((prev) => !prev);
  };

  const handlePlayPause = () => {
    microInteractions.vibrate();
    setIsPlaying((prev) => !prev);
  };

  const handleMuteToggle = () => {
    microInteractions.vibrate();
    setIsMuted((prev) => !prev);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.ip || !editForm.port || !editForm.url) {
      Alert.alert('Error', 'Por favor completa los campos requeridos.');
      return;
    }

    try {
      updateCamera(camera.id, editForm);
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Configuración de cámara actualizada correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Cámara',
      `¿Estás seguro de que deseas eliminar la cámara "${camera.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await removeCamera(camera.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Sends functional PTZ Command
  const sendPTZCommand = async (direction) => {
    microInteractions.vibrate();
    const brandProfile = CAMERA_PROFILES[camera.type] || CAMERA_PROFILES.generic;
    
    if (!brandProfile.ptz.supported) {
      Alert.alert('No soportado', 'PTZ no está soportado para este perfil de cámara.');
      return;
    }

    const commandPath = brandProfile.ptz.commands[direction];
    if (!commandPath) return;

    // Build URL (Basic HTTP PTZ Request)
    const ptzUrl = `http://${camera.ip}:${camera.port}${commandPath}`;
    
    try {
      const headers = {};
      if (camera.username) {
        // Simple Base64 Authentication header
        const base64Credentials = encodeBase64(`${camera.username}:${camera.password || ''}`);
        headers['Authorization'] = `Basic ${base64Credentials}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(ptzUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('PTZ command status failed:', response.status);
      }
    } catch (err) {
      console.warn('Error sending PTZ command:', err);
    }
  };

  // Determine stream type
  const isVideoUrl = useMemo(() => {
    const lowerUrl = camera.url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.m3u8') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi');
  }, [camera.url]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Video View Section */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleVideoPress}
        style={styles.playerWrapper}
      >
        {camera.status === 'offline' ? (
          <View style={styles.offlineContainer}>
            <FontAwesome5 name="video-slash" size={48} color={COLORS.offline} />
            <Text style={styles.offlineText}>CÁMARA DESCONECTADA</Text>
            <Text style={styles.offlineSubtext}>Verifica la dirección IP, puerto y conexión.</Text>
          </View>
        ) : videoError || !isVideoUrl ? (
          // Fallback snapshot/MJPEG frame refresh stream
          <Image
            source={{ uri: `${camera.snapshotUrl || camera.url}?t=${snapshotTimestamp}` }}
            style={styles.playerVideo}
            resizeMode="contain"
            onLoadStart={() => setBuffering(true)}
            onLoadEnd={() => setBuffering(false)}
          />
        ) : (
          <VideoView
            player={videoPlayer}
            style={styles.playerVideo}
            contentFit="contain"
            nativeControls={false}
            onPlayerStateChange={(e) => {
              if (e.status === 'loading') setBuffering(true);
              if (e.status === 'readyToDisplay') { setBuffering(false); setVideoError(false); }
              if (e.status === 'error') { setBuffering(false); setVideoError(true); }
            }}
          />
        )}

        {/* Buffering Indicator */}
        {buffering && camera.status === 'online' && (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}

        {/* Recording Overlay Tag */}
        {recording.isRecording && (
          <View style={styles.recordingOverlayBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimeText}>
              REC {recording.formatTime(recording.recordingTime)}
            </Text>
          </View>
        )}

        {/* Controls Overlay (Animated Fade) */}
        <Animated.View style={[styles.overlayContainer, { opacity: overlayOpacity, pointerEvents: showControls ? 'auto' : 'none' }]}>
          {/* Top Panel */}
          <View style={styles.overlayTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.overlayButton}>
              <FontAwesome5 name="arrow-left" size={16} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.overlayHeaderTitleContainer}>
              <Text style={styles.overlayCameraName} numberOfLines={1}>
                {camera.name}
              </Text>
              <Text style={styles.overlayCameraIp} numberOfLines={1}>
                {camera.ip}:{camera.port}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.overlayButton}>
              <FontAwesome5 name="pen" size={14} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.overlayButton, { backgroundColor: COLORS.offlineLight }]}>
              <FontAwesome5 name="trash" size={14} color={COLORS.offline} />
            </TouchableOpacity>
          </View>

          {/* Bottom Panel */}
          <View style={styles.overlayBottom}>
            <TouchableOpacity onPress={handlePlayPause} style={styles.overlayButtonLarge}>
              <FontAwesome5 name={isPlaying ? 'pause' : 'play'} size={18} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleMuteToggle} style={styles.overlayButton}>
              <FontAwesome5 name={isMuted ? 'volume-mute' : 'volume-up'} size={16} color={COLORS.text} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              onPress={() => setMotionLogVisible(true)}
              style={[styles.overlayButton, motionDetection.isActive && { borderColor: COLORS.warning }]}
            >
              <FontAwesome5 name="history" size={14} color={motionDetection.isActive ? COLORS.warning : COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRecordingsModalVisible(true)}
              style={styles.overlayButton}
            >
              <FontAwesome5 name="folder-open" size={14} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Detail & PTZ Controls scroll view */}
      <ScrollView style={styles.bottomScroll} contentContainerStyle={styles.bottomContent}>
        {/* Quick Operations bar */}
        <View style={styles.quickOpsRow}>
          <TouchableOpacity
            style={[styles.opCard, motionDetection.isActive && styles.opCardActiveWarning]}
            onPress={() => {
              microInteractions.vibrate();
              if (motionDetection.isActive) motionDetection.stopDetection();
              else motionDetection.startDetection();
            }}
          >
            <FontAwesome5
              name="running"
              size={20}
              color={motionDetection.isActive ? COLORS.warning : COLORS.textSecondary}
            />
            <Text style={[styles.opLabel, motionDetection.isActive && { color: COLORS.warning }]}>
              {motionDetection.isActive ? 'Alerta Activa' : 'Detec. Mov.'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.opCard, recording.isRecording && styles.opCardActiveDanger]}
            onPress={() => {
              microInteractions.vibrate();
              if (recording.isRecording) {
                recording.stopRecording();
                Alert.alert('Grabación Guardada', 'El videoclip se ha guardado exitosamente.');
              } else {
                recording.startRecording();
              }
            }}
          >
            <FontAwesome5
              name="dot-circle"
              size={20}
              color={recording.isRecording ? COLORS.offline : COLORS.textSecondary}
            />
            <Text style={[styles.opLabel, recording.isRecording && { color: COLORS.offline }]}>
              {recording.isRecording ? 'Detener' : 'Grabar Clip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.opCard}
            onPress={() => {
              microInteractions.vibrate();
              Alert.alert('Foto capturada', 'La captura de pantalla se ha guardado en la galería.');
            }}
          >
            <FontAwesome5 name="camera" size={20} color={COLORS.textSecondary} />
            <Text style={styles.opLabel}>Captura</Text>
          </TouchableOpacity>
        </View>

        {/* PTZ Pad Controls */}
        <View style={styles.ptzPanel}>
          <Text style={styles.sectionTitle}>Control de Movimiento (PTZ)</Text>
          <View style={styles.ptzGrid}>
            <View style={styles.ptzCircularContainer}>
              {/* Central base */}
              <View style={styles.ptzCenterIcon}>
                <FontAwesome5 name="globe" size={18} color={COLORS.textMuted} />
              </View>
              
              {/* Up arrow */}
              <TouchableOpacity 
                onPress={() => sendPTZCommand('up')} 
                style={[styles.ptzArrow, styles.ptzArrowUp]}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="chevron-up" size={16} color={COLORS.accent} />
              </TouchableOpacity>

              {/* Down arrow */}
              <TouchableOpacity 
                onPress={() => sendPTZCommand('down')} 
                style={[styles.ptzArrow, styles.ptzArrowDown]}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="chevron-down" size={16} color={COLORS.accent} />
              </TouchableOpacity>

              {/* Left arrow */}
              <TouchableOpacity 
                onPress={() => sendPTZCommand('left')} 
                style={[styles.ptzArrow, styles.ptzArrowLeft]}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="chevron-left" size={16} color={COLORS.accent} />
              </TouchableOpacity>

              {/* Right arrow */}
              <TouchableOpacity 
                onPress={() => sendPTZCommand('right')} 
                style={[styles.ptzArrow, styles.ptzArrowRight]}
                activeOpacity={0.6}
              >
                <FontAwesome5 name="chevron-right" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            </View>

            {/* Zoom Controls */}
            <View style={styles.zoomRow}>
              <TouchableOpacity onPress={() => sendPTZCommand('zoomOut')} style={styles.zoomButton}>
                <FontAwesome5 name="search-minus" size={13} color={COLORS.text} style={{ marginRight: 6 }} />
                <Text style={styles.zoomText}>Zoom -</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => sendPTZCommand('zoomIn')} style={styles.zoomButton}>
                <FontAwesome5 name="search-plus" size={13} color={COLORS.text} style={{ marginRight: 6 }} />
                <Text style={styles.zoomText}>Zoom +</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Technical Specs Details */}
        <View style={styles.specsPanel}>
          <Text style={styles.sectionTitle}>Especificaciones Técnicas</Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Protocolo de Enlace:</Text>
            <Text style={styles.specValue}>{camera.type.toUpperCase()}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>IP del Host:</Text>
            <Text style={styles.specValue}>{camera.ip}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Puerto de Datos:</Text>
            <Text style={styles.specValue}>{camera.port}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>URL del Recurso:</Text>
            <Text style={[styles.specValue, styles.specUrl]} numberOfLines={1}>
              {camera.url}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Settings Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderHandle} />
            <Text style={styles.modalTitle}>Editar Configuración</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.fieldLabel}>Nombre de la Cámara *</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, name: text }))}
              />

              <Text style={styles.fieldLabel}>Host / IP *</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.ip}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, ip: text }))}
              />

              <Text style={styles.fieldLabel}>Puerto *</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.port}
                keyboardType="numeric"
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, port: text }))}
              />

              <Text style={styles.fieldLabel}>Nombre de usuario</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.username}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, username: text }))}
              />

              <Text style={styles.fieldLabel}>Contraseña</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.password}
                secureTextEntry
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, password: text }))}
              />

              <Text style={styles.fieldLabel}>URL RTSP o HTTP MJPEG *</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.url}
                onChangeText={(text) => setEditForm((prev) => ({ ...prev, url: text }))}
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recordings List Modal */}
      <Modal visible={recordingsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderHandle} />
            <Text style={styles.modalTitle}>Grabaciones Almacenadas</Text>
            <FlatList
              data={recording.recordings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.recordingItem}>
                  <FontAwesome5 name="video" size={16} color={COLORS.accent} style={{ marginRight: SPACING.sm }} />
                  <View style={styles.recordingDetails}>
                    <Text style={styles.recordingLabel} numberOfLines={1}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                    <Text style={styles.recordingMeta}>
                      Duración: {item.duration}s | {(item.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  
                  {/* Play Recording Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPlaybackRecording(item);
                      setPlaybackFrameIndex(0);
                      setIsPlaybackPlaying(true);
                    }}
                    style={styles.playbackIconBtn}
                  >
                    <FontAwesome5 name="play" size={12} color={COLORS.accent} />
                  </TouchableOpacity>

                  {/* Share Recording Button */}
                  <TouchableOpacity
                    onPress={() => recording.shareRecording(item)}
                    style={styles.shareIconBtn}
                  >
                    <FontAwesome5 name="share-alt" size={12} color={COLORS.online} />
                  </TouchableOpacity>

                  {/* Delete Recording Button */}
                  <TouchableOpacity
                    onPress={() => recording.deleteRecording(item.id)}
                    style={styles.deleteRecBtn}
                  >
                    <FontAwesome5 name="trash" size={12} color={COLORS.offline} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={() => (
                <Text style={styles.emptyModalText}>No hay grabaciones persistentes guardadas para esta cámara.</Text>
              )}
              style={{ maxHeight: 300 }}
            />
            <TouchableOpacity onPress={() => setRecordingsModalVisible(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Playback Preview Modal */}
      <Modal visible={!!selectedPlaybackRecording} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderHandle} />
            <Text style={styles.modalTitle}>Visualizar Grabación</Text>
            
            {selectedPlaybackRecording && (
              <View style={styles.playbackContainer}>
                {Platform.OS === 'web' && selectedPlaybackRecording.format.includes('Video') ? (
                  <video
                    src={selectedPlaybackRecording.url}
                    controls
                    autoPlay
                    style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#000', marginBottom: SPACING.md }}
                  />
                ) : (
                  // Mobile snapshot slideshow or web simulation flipbook
                  <View style={styles.previewFrameContainer}>
                    {selectedPlaybackRecording.frames && selectedPlaybackRecording.frames.length > 0 ? (
                      <Image
                        source={{ uri: selectedPlaybackRecording.frames[playbackFrameIndex] }}
                        style={styles.previewImage}
                        resizeMode="contain"
                      />
                    ) : (
                      // Single snapshot fallback
                      <Image
                        source={{ uri: selectedPlaybackRecording.url }}
                        style={styles.previewImage}
                        resizeMode="contain"
                      />
                    )}
                    
                    {selectedPlaybackRecording.frames && selectedPlaybackRecording.frames.length > 1 && (
                      <Text style={styles.frameCounterText}>
                        Fotograma: {playbackFrameIndex + 1} / {selectedPlaybackRecording.frames.length}
                      </Text>
                    )}
                  </View>
                )}
                
                {/* Control bar for slideshow preview (when it's a sequence of frames) */}
                {!(Platform.OS === 'web' && selectedPlaybackRecording.format.includes('Video')) && (
                  <View style={styles.playbackControlsRow}>
                    <TouchableOpacity
                      onPress={() => setIsPlaybackPlaying(!isPlaybackPlaying)}
                      style={styles.playPauseBtn}
                    >
                      <FontAwesome5
                        name={isPlaybackPlaying ? 'pause' : 'play'}
                        size={12}
                        color={COLORS.bg}
                      />
                    </TouchableOpacity>
                    
                    {selectedPlaybackRecording.frames && selectedPlaybackRecording.frames.length > 1 && (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setPlaybackFrameIndex((prev) => 
                              (prev - 1 + selectedPlaybackRecording.frames.length) % selectedPlaybackRecording.frames.length
                            );
                            setIsPlaybackPlaying(false);
                          }}
                          style={styles.stepBtn}
                        >
                          <FontAwesome5 name="step-backward" size={12} color={COLORS.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setPlaybackFrameIndex((prev) => (prev + 1) % selectedPlaybackRecording.frames.length);
                            setIsPlaybackPlaying(false);
                          }}
                          style={styles.stepBtn}
                        >
                          <FontAwesome5 name="step-forward" size={12} color={COLORS.text} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                <View style={styles.playbackInfoRow}>
                  <Text style={styles.playbackInfoText}>
                    Duración: {selectedPlaybackRecording.duration}s | Formato: {selectedPlaybackRecording.format}
                  </Text>
                </View>
                
                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    onPress={() => recording.shareRecording(selectedPlaybackRecording)}
                    style={styles.shareActionBtn}
                  >
                    <FontAwesome5 name="share-alt" size={14} color={COLORS.bg} style={{ marginRight: 6 }} />
                    <Text style={styles.shareActionBtnText}>Compartir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPlaybackRecording(null);
                      setIsPlaybackPlaying(false);
                    }}
                    style={styles.closePlaybackBtn}
                  >
                    <Text style={styles.closePlaybackBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Motion Event Log Modal */}
      <Modal visible={motionLogVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderHandle} />
            <Text style={styles.modalTitle}>Historial de Alertas de Movimiento</Text>
            <FlatList
              data={motionDetection.motionHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.motionEventItem}>
                  <View style={styles.motionEventDot} />
                  <Text style={styles.motionEventTime}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text style={styles.motionEventIntensity}>
                    Intensidad: {item.intensity}%
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <Text style={styles.emptyModalText}>No se han detectado eventos de movimiento.</Text>
              )}
              style={{ maxHeight: 300 }}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity onPress={() => motionDetection.clearHistory()} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Limpiar Historial</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMotionLogVisible(false)} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  playerWrapper: {
    width: '100%',
    height: 230,
    backgroundColor: '#000',
    position: 'relative',
  },
  playerVideo: {
    width: '100%',
    height: '100%',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  offlineText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.offline,
    marginTop: SPACING.md,
  },
  offlineSubtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  bufferingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000040',
  },
  recordingOverlayBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: SIZES.radiusSm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.offline,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.offline,
    marginRight: 6,
  },
  recordingTimeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Overlay Panel Controls
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: SPACING.md,
  },
  overlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayHeaderTitleContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  overlayCameraName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
  },
  overlayCameraIp: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  overlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,20,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overlayButtonLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,20,20,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Bottom scroll panel
  bottomScroll: {
    flex: 1,
  },
  bottomContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  quickOpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  opCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  opCardActiveWarning: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningLight,
  },
  opCardActiveDanger: {
    borderColor: COLORS.offline,
    backgroundColor: COLORS.offlineLight,
  },
  opLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // PTZ Control pad
  ptzPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  ptzGrid: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  ptzCircularContainer: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  ptzCenterIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  ptzArrow: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 46,
    height: 46,
  },
  ptzArrowUp: {
    top: 8,
    alignSelf: 'center',
  },
  ptzArrowDown: {
    bottom: 8,
    alignSelf: 'center',
  },
  ptzArrowLeft: {
    left: 8,
    top: '50%',
    marginTop: -23,
  },
  ptzArrowRight: {
    right: 8,
    top: '50%',
    marginTop: -23,
  },
  zoomRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
  zoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: SPACING.xl,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  zoomText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },

  // Technical specs
  specsPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  specLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
  },
  specValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text,
  },
  specUrl: {
    maxWidth: '50%',
  },

  // Modal Overlay & Form styles (One UI Bottom Sheet style)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    width: '100%',
    maxHeight: '88%',
    ...SHADOWS.lg,
  },
  modalHeaderHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SPACING.md,
    height: 46,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginBottom: SPACING.sm,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.radiusRound,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radiusRound,
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },

  // Modal Item lists
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  recordingDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  recordingLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  recordingMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deleteRecBtn: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  playbackIconBtn: {
    padding: SPACING.sm,
    marginHorizontal: SPACING.xs,
  },
  shareIconBtn: {
    padding: SPACING.sm,
    marginHorizontal: SPACING.xs,
  },
  playbackContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  previewFrameContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: SIZES.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  frameCounterText: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playbackControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xs,
  },
  playPauseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
  },
  playbackInfoRow: {
    marginVertical: SPACING.sm,
  },
  playbackInfoText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: COLORS.online,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  shareActionBtnText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  closePlaybackBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.radiusRound,
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  closePlaybackBtnText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  closeModalBtn: {
    marginTop: SPACING.lg,
    paddingVertical: 12,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.radiusRound,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  emptyModalText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // Motion logs
  motionEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  motionEventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    marginRight: SPACING.md,
  },
  motionEventTime: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  motionEventIntensity: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});

export default CameraSingleScreen;
