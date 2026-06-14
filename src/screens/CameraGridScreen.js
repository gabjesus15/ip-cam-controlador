import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';

const { width } = Dimensions.get('window');
const CAMERAS_PER_ROW = 2;
const GAP = 12;
const CAMERA_SIZE = (width - 48 - GAP) / CAMERAS_PER_ROW;

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

const CameraGridScreen = ({ navigation }) => {
  const { cameras, removeCamera, updateCamera, checkCameraStatus } = useCameraStore();
  const [refreshing, setRefreshing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState({});

  const handleRefresh = async () => {
    setRefreshing(true);
    const statusChecks = {};
    for (const camera of cameras) {
      statusChecks[camera.id] = true;
      setCheckingStatus({ ...checkingStatus, ...statusChecks });
      const status = await checkCameraStatus(camera);
      await updateCamera(camera.id, { status });
      statusChecks[camera.id] = false;
      setCheckingStatus({ ...checkingStatus, ...statusChecks });
    }
    setRefreshing(false);
  };

  const handleRemove = (camera) => {
    Alert.alert(
      'Eliminar Cámara',
      `¿Deseas eliminar "${camera.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeCamera(camera.id) }
      ]
    );
  };

  const renderCameraCard = (camera, index) => (
    <TouchableOpacity
      key={camera.id}
      style={[
        styles.cameraCard,
        index % 2 === 0 ? { marginRight: GAP } : null
      ]}
      onPress={() => navigation.navigate('CameraSingle', { camera })}
      onLongPress={() => handleRemove(camera)}
    >
      <View style={styles.cameraPreview}>
        <View style={styles.cameraPlaceholder}>
          <FontAwesome5 name="video" size={32} color={COLORS.border} />
          <Text style={styles.placeholderText}>Sin señal</Text>
        </View>
        {checkingStatus[camera.id] && (
          <View style={styles.checkingOverlay}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        )}
      </View>
      <View style={styles.cameraInfo}>
        <View style={styles.cameraHeader}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: camera.status === 'online' ? COLORS.online : COLORS.offline }
          ]} />
          <Text style={styles.cameraName} numberOfLines={1}>{camera.name}</Text>
        </View>
        <Text style={styles.cameraIp}>{camera.ip}:{camera.port}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
      >
        {cameras.map((camera, index) => renderCameraCard(camera, index))}
        {cameras.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome5 name="video-slash" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No hay cámaras</Text>
            <Text style={styles.emptySubtext}>Agrega una cámara para comenzar</Text>
          </View>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCamera')}>
        <FontAwesome5 name="plus" size={20} color={COLORS.bg} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  cameraCard: {
    width: CAMERA_SIZE,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: GAP,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cameraPreview: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE * 0.75,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  checkingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraInfo: {
    padding: 10,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  cameraName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  cameraIp: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    width: width - 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CameraGridScreen;
