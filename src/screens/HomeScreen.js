import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1a1a1a',
  border: '#222',
  text: '#fff',
  textSecondary: '#888',
  accent: '#00d4ff',
  online: '#00ff88',
  offline: '#ff4444',
};

const HomeScreen = ({ navigation }) => {
  const { cameras, scanNetwork } = useCameraStore();
  const [scanning, setScanning] = useState(false);
  const abortControllerRef = React.useRef(null);

  const handleScan = async () => {
    if (scanning) {
      // Cancel scan
      abortControllerRef.current?.abort();
      setScanning(false);
      return;
    }
    
    abortControllerRef.current = new AbortController();
    setScanning(true);
    try {
      const found = await scanNetwork('192.168.1', abortControllerRef.current.signal);
      if (found.length === 0) {
        Alert.alert('Búsqueda completada', 'No se encontraron cámaras en la red.');
      } else {
        Alert.alert(
          'Cámaras encontradas', 
          `Se encontraron ${found.length} cámaras.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Agregar', onPress: () => navigation.navigate('AddCamera', { foundCameras: found }) }
          ]
        );
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Scan cancelled');
      } else {
        Alert.alert('Error', 'No se pudo completar el escaneo.');
      }
    } finally {
      setScanning(false);
    }
  };

  const getOnlineCount = () => cameras.filter(c => c.status === 'online').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cámaras IP</Text>
        <Text style={styles.headerSubtitle}>{cameras.length} dispositivos</Text>
      </View>

      {/* Stats - Minimal */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{cameras.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: COLORS.online }]}>{getOnlineCount()}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: COLORS.offline }]}>{cameras.length - getOnlineCount()}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>

      {/* Actions - Minimal */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('CameraGrid')}
        >
          <FontAwesome5 name="th" size={20} color={COLORS.accent} />
          <Text style={styles.actionText}>Ver Grid</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleScan}
        >
          {scanning ? (
            <FontAwesome5 name="times" size={20} color="#ff4444" />
          ) : (
            <FontAwesome5 name="search" size={20} color={COLORS.accent} />
          )}
          <Text style={styles.actionText}>
            {scanning ? 'Cancelar Escaneo' : 'Escanear Red'}
          </Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddCamera')}
        >
          <FontAwesome5 name="plus" size={20} color={COLORS.accent} />
          <Text style={styles.actionText}>Agregar Cámara</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Camera List - Minimal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dispositivos</Text>
        {cameras.length === 0 ? (
          <Text style={styles.emptyText}>No hay cámaras configuradas</Text>
        ) : (
          cameras.map((camera) => (
            <TouchableOpacity 
              key={camera.id}
              style={styles.cameraItem}
              onPress={() => navigation.navigate('CameraSingle', { camera })}
            >
              <View style={[
                styles.statusDot, 
                { backgroundColor: camera.status === 'online' ? COLORS.online : COLORS.offline }
              ]} />
              <View style={styles.cameraInfo}>
                <Text style={styles.cameraName}>{camera.name}</Text>
                <Text style={styles.cameraIp}>{camera.ip}:{camera.port}</Text>
              </View>
              <FontAwesome5 
                name="video" 
                size={14} 
                color={camera.status === 'online' ? COLORS.accent : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.text,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 16,
  },
  section: {
    padding: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
  cameraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  cameraIp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default HomeScreen;
