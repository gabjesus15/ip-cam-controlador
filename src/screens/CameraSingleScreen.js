import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  border: '#222',
  text: '#fff',
  textSecondary: '#888',
  accent: '#00d4ff',
  online: '#00ff88',
  offline: '#ff4444',
};

const CameraSingleScreen = ({ route, navigation }) => {
  const { camera: initialCamera } = route.params;
  const { cameras, updateCamera, removeCamera } = useCameraStore();
  const [camera, setCamera] = useState(initialCamera);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(camera.name);
  const [editUrl, setEditUrl] = useState(camera.url);

  useEffect(() => {
    const updated = cameras.find(c => c.id === camera.id);
    if (updated) setCamera(updated);
  }, [cameras]);

  const handleUpdate = async () => {
    await updateCamera(camera.id, { name: editName, url: editUrl });
    setEditModal(false);
    Alert.alert('Éxito', 'Cámara actualizada');
  };

  const handleRemove = () => {
    Alert.alert(
      'Eliminar Cámara',
      `¿Deseas eliminar "${camera.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: () => {
            removeCamera(camera.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{camera.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setEditModal(true)} style={styles.headerBtn}>
            <FontAwesome5 name="edit" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRemove} style={styles.headerBtn}>
            <FontAwesome5 name="trash" size={16} color={COLORS.offline} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Area */}
      <TouchableOpacity 
        style={[styles.videoContainer, fullscreen && styles.videoFullscreen]} 
        onPress={() => setFullscreen(!fullscreen)}
        activeOpacity={1}
      >
        <View style={styles.videoPlaceholder}>
          <FontAwesome5 name="video" size={48} color={COLORS.border} />
          <Text style={styles.videoPlaceholderText}>Vista de Cámara</Text>
          <Text style={styles.videoUrl}>{camera.url}</Text>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          )}
        </View>
        <View style={styles.infoOverlay}>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              { backgroundColor: camera.status === 'online' ? COLORS.online : COLORS.offline }
            ]} />
            <Text style={styles.statusText}>
              {camera.status === 'online' ? 'EN LÍNEA' : 'SIN CONEXIÓN'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <FontAwesome5 name="network-wired" size={14} color={COLORS.textSecondary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>IP</Text>
              <Text style={styles.detailValue}>{camera.ip}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <FontAwesome5 name="plug" size={14} color={COLORS.textSecondary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Puerto</Text>
              <Text style={styles.detailValue}>{camera.port}</Text>
            </View>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <FontAwesome5 name="user" size={14} color={COLORS.textSecondary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Usuario</Text>
              <Text style={styles.detailValue}>{camera.username || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <FontAwesome5 name="lock" size={14} color={COLORS.textSecondary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Contraseña</Text>
              <Text style={styles.detailValue}>{camera.password ? '******' : 'N/A'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn}>
          <FontAwesome5 name="arrows-alt" size={18} color={COLORS.text} />
          <Text style={styles.controlLabel}>Mover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <FontAwesome5 name="expand" size={18} color={COLORS.text} />
          <Text style={styles.controlLabel}>Zoom</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <FontAwesome5 name="camera" size={18} color={COLORS.text} />
          <Text style={styles.controlLabel}>Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <FontAwesome5 name="circle" size={18} color={COLORS.offline} />
          <Text style={styles.controlLabel}>Grabar</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Cámara</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre de la cámara"
                placeholderTextColor={COLORS.textSecondary}
                color={COLORS.text}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL</Text>
              <TextInput
                style={styles.input}
                value={editUrl}
                onChangeText={setEditUrl}
                placeholder="http://192.168.1.100:8080/video"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                color={COLORS.text}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setEditModal(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleUpdate}>
                <Text style={[styles.modalBtnText, styles.modalBtnSaveText]}>Guardar</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  videoContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
  },
  videoFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    borderRadius: 0,
    zIndex: 100,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  videoUrl: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailText: {
    marginLeft: 10,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingBottom: 24,
  },
  controlBtn: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.bg,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  modalBtnCancel: {
    backgroundColor: COLORS.border,
  },
  modalBtnSave: {
    backgroundColor: COLORS.accent,
    marginRight: 0,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalBtnSaveText: {
    color: COLORS.bg,
  },
});

export default CameraSingleScreen;
