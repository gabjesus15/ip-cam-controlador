import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import useMotionDetection from '../hooks/useMotionDetection';
import useRecording from '../hooks/useRecording';
import useNotifications from '../hooks/useNotifications';

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1a1a1a',
  border: '#222',
  text: '#fff',
  textSecondary: '#888',
  accent: '#00d4ff',
  accentLight: '#00d4ff22',
  online: '#00ff88',
  onlineLight: '#00ff8822',
  offline: '#ff4444',
  offlineLight: '#ff444422',
  warning: '#ffaa00',
  warningLight: '#ffaa0022',
};

const CameraSingleScreen = ({ route, navigation }) => {
  const { camera: initialCamera } = route.params;
  const { cameras, updateCamera, removeCamera } = useCameraStore();
  const microInteractions = useMicroInteractions();
  const notifications = useNotifications();
  
  const [camera, setCamera] = useState(initialCamera);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [recordingsModalVisible, setRecordingsModalVisible] = useState(false);
  const [motionLogVisible, setMotionLogVisible] = useState(false);
  const [editForm, setEditForm] = useState({ ...initialCamera });
  const [status, setStatus] = useState('checking');

  const motionDetection = useMotionDetection(camera.url, 30);
  const recording = useRecording(camera.url);
  const controlsTimeoutRef = useRef(null);
  const videoRef = useRef(null);

  // Update camera data when it changes in store
  useEffect(() => {
    const currentCamera = cameras.find(c => c.id === camera.id);
    if (currentCamera) {
      setCamera(currentCamera);
    }
  }, [cameras]);

  // Check camera status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(camera.url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        const newStatus = response.ok ? 'online' : 'offline';
        setStatus(newStatus);
        
        if (newStatus !== camera.status) {
          updateCamera(camera.id, { status: newStatus });
          
          if (newStatus === 'offline') {
            notifications.sendCameraOfflineAlert(camera.name, camera.id);
          } else {
            notifications.sendCameraOnlineAlert(camera.name, camera.id);
          }
        }
      } catch {
        setStatus('offline');
        if (camera.status !== 'offline') {
          updateCamera(camera.id, { status: 'offline' });
          notifications.sendCameraOfflineAlert(camera.name, camera.id);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [camera.id, camera.url, camera.status]);

  // Motion detection notifications
  useEffect(() => {
    if (motionDetection.motionDetected) {
      notifications.sendMotionAlert(camera.name, camera.id);
    }
  }, [motionDetection.motionDetected]);

  // Hide controls after inactivity
  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const handlePress = () => {
    setShowControls(true);
    microInteractions.vibrate();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    microInteractions.vibrate();
  };

  const handleRecord = () => {
    if (recording.isRecording) {
      recording.stopRecording();
      Alert.alert('Grabación guardada', `Duración: ${recording.formatTime(recording.recordingTime)}`);
    } else {
      recording.startRecording();
      microInteractions.vibrate();
    }
  };

  const handleMotionToggle = () => {
    if (motionDetection.isActive) {
      motionDetection.stopDetection();
      Alert.alert('Detección de movimiento', 'Detección detenida');
    } else {
      motionDetection.startDetection();
      Alert.alert('Detección de movimiento', 'Detección iniciada');
    }
    microInteractions.vibrate();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar cámara',
      `¿Estás seguro de que quieres eliminar "${camera.name}"?`,
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

  const handleSaveEdit = async () => {
    try {
      await updateCamera(camera.id, editForm);
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Cámara actualizada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la cámara');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <TouchableOpacity 
        style={styles.videoContainer} 
        onPress={handlePress}
        activeOpacity={1}
      >
        <View style={styles.videoPlaceholder}>
          <FontAwesome5 name="video" size={64} color={COLORS.textSecondary} />
          <Text style={styles.videoPlaceholderText}>
            {isPlaying ? 'Reproduciendo...' : 'Pausado'}
          </Text>
          {recording.isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                REC {formatTime(recording.recordingTime)}
              </Text>
            </View>
          )}
          {motionDetection.isActive && (
            <View style={[styles.motionIndicator, motionDetection.motionDetected && styles.motionDetected]}>
              <FontAwesome5 name="running" size={16} color={motionDetection.motionDetected ? COLORS.warning : COLORS.textSecondary} />
              <Text style={[styles.motionText, motionDetection.motionDetected && styles.motionDetectedText]}>
                {motionDetection.motionDetected ? '¡Movimiento!' : 'Monitoreando'}
              </Text>
            </View>
          )}
        </View>

        {/* Controls Overlay */}
        {showControls && (
          <Animated.View style={styles.controlsOverlay}>
            {/* Top Controls */}
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="chevron-left" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <View style={styles.statusBadge}>
                <View style={[styles.statusIndicator, { backgroundColor: status === 'online' ? COLORS.online : COLORS.offline }]} />
                <Text style={styles.statusText}>{status === 'online' ? 'ONLINE' : 'OFFLINE'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.settingsButton} 
                onPress={() => setEditModalVisible(true)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="cog" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Center Play Button */}
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={handlePlayPause}
              activeOpacity={0.7}
            >
              <FontAwesome5 name={isPlaying ? 'pause' : 'play'} size={32} color={COLORS.text} />
            </TouchableOpacity>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity 
                style={[styles.controlButton, recording.isRecording && styles.controlButtonActive]}
                onPress={handleRecord}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="circle" size={20} color={recording.isRecording ? COLORS.offline : COLORS.text} />
                <Text style={styles.controlButtonText}>
                  {recording.isRecording ? 'Detener' : 'Grabar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, motionDetection.isActive && styles.controlButtonActive]}
                onPress={handleMotionToggle}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="running" size={20} color={motionDetection.isActive ? COLORS.warning : COLORS.text} />
                <Text style={styles.controlButtonText}>
                  {motionDetection.isActive ? 'Detener' : 'Movimiento'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setRecordingsModalVisible(true)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="film" size={20} color={COLORS.text} />
                <Text style={styles.controlButtonText}>
                  {recording.recordings.length}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setMotionLogVisible(true)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="history" size={20} color={COLORS.text} />
                <Text style={styles.controlButtonText}>
                  {motionDetection.motionHistory.length}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Camera Info */}
      <ScrollView style={styles.infoContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{camera.name}</Text>
          <View style={styles.infoRow}>
            <FontAwesome5 name="network-wired" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{camera.ip}:{camera.port}</Text>
          </View>
          {camera.url && (
            <View style={styles.infoRow}>
              <FontAwesome5 name="link" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{camera.url}</Text>
            </View>
          )}
          {camera.username && (
            <View style={styles.infoRow}>
              <FontAwesome5 name="user" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{camera.username}</Text>
            </View>
          )}
          {camera.onvif && (
            <View style={styles.onvifBadge}>
              <Text style={styles.onvifText}>ONVIF</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="edit" size={18} color={COLORS.accent} />
            <Text style={styles.quickActionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: COLORS.offlineLight }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="trash" size={18} color={COLORS.offline} />
            <Text style={[styles.quickActionText, { color: COLORS.offline }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Cámara</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholderTextColor={COLORS.textSecondary}
                  color={COLORS.text}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IP</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.ip}
                  onChangeText={(text) => setEditForm({ ...editForm, ip: text })}
                  placeholderTextColor={COLORS.textSecondary}
                  color={COLORS.text}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Puerto</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.port}
                  onChangeText={(text) => setEditForm({ ...editForm, port: text })}
                  placeholderTextColor={COLORS.textSecondary}
                  color={COLORS.text}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.url}
                  onChangeText={(text) => setEditForm({ ...editForm, url: text })}
                  placeholderTextColor={COLORS.textSecondary}
                  color={COLORS.text}
                />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Recordings Modal */}
      <Modal
        visible={recordingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRecordingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grabaciones</Text>
              <TouchableOpacity onPress={() => setRecordingsModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {recording.recordings.length === 0 ? (
                <Text style={styles.emptyText}>No hay grabaciones</Text>
              ) : (
                recording.recordings.map((rec) => (
                  <View key={rec.id} style={styles.recordingItem}>
                    <View style={styles.recordingInfo}>
                      <Text style={styles.recordingDate}>
                        {new Date(rec.timestamp).toLocaleString()}
                      </Text>
                      <Text style={styles.recordingDuration}>
                        {formatTime(rec.duration)} - {(rec.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => recording.deleteRecording(rec.id)}>
                      <FontAwesome5 name="trash" size={16} color={COLORS.offline} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Motion Log Modal */}
      <Modal
        visible={motionLogVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMotionLogVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historial de Movimiento</Text>
              <TouchableOpacity onPress={() => setMotionLogVisible(false)}>
                <FontAwesome5 name="times" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {motionDetection.motionHistory.length === 0 ? (
                <Text style={styles.emptyText}>No hay eventos de movimiento</Text>
              ) : (
                motionDetection.motionHistory.map((event) => (
                  <View key={event.id} style={styles.motionEvent}>
                    <View style={[styles.motionIntensity, { width: `${event.intensity}%` }]} />
                    <View style={styles.motionEventInfo}>
                      <Text style={styles.motionEventTime}>
                        {new Date(event.timestamp).toLocaleString()}
                      </Text>
                      <Text style={styles.motionEventIntensity}>
                        Intensidad: {event.intensity}%
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  videoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  videoPlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 16,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  motionIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  motionDetected: {
    backgroundColor: 'rgba(255, 170, 0, 0.8)',
  },
  motionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  motionDetectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: 16,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minWidth: 70,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.5)',
  },
  controlButtonText: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 4,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  onvifBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  onvifText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.bg,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingDate: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  recordingDuration: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  motionEvent: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  motionIntensity: {
    height: 4,
    backgroundColor: COLORS.warning,
    borderRadius: 2,
    marginBottom: 8,
  },
  motionEventInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  motionEventTime: {
    color: COLORS.text,
    fontSize: 13,
  },
  motionEventIntensity: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CameraSingleScreen;
