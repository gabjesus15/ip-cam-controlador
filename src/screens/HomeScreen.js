import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import useNotifications from '../hooks/useNotifications';

const { width } = Dimensions.get('window');

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
};

const HomeScreen = ({ navigation }) => {
  const { cameras, scanNetwork, scanONVIF } = useCameraStore();
  const microInteractions = useMicroInteractions();
  const notifications = useNotifications();
  
  const [scanning, setScanning] = useState(false);
  const [scanningONVIF, setScanningONVIF] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const abortControllerRef = React.useRef(null);
  const abortControllerONVIFRef = React.useRef(null);

  // Request notification permission on mount
  useEffect(() => {
    notifications.requestPermission();
  }, []);

  const handleScan = async () => {
    if (scanning) {
      abortControllerRef.current?.abort();
      setScanning(false);
      return;
    }
    
    microInteractions.vibrate();
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

  const handleScanONVIF = async () => {
    if (scanningONVIF) {
      abortControllerONVIFRef.current?.abort();
      setScanningONVIF(false);
      return;
    }
    
    microInteractions.vibrate();
    abortControllerONVIFRef.current = new AbortController();
    setScanningONVIF(true);
    
    try {
      const found = await scanONVIF('192.168.1', abortControllerONVIFRef.current.signal);
      if (found.length === 0) {
        Alert.alert('Búsqueda ONVIF completada', 'No se encontraron cámaras ONVIF.');
      } else {
        Alert.alert(
          'Cámaras ONVIF encontradas', 
          `Se encontraron ${found.length} cámaras ONVIF.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Agregar', onPress: () => navigation.navigate('AddCamera', { foundCameras: found }) }
          ]
        );
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('ONVIF scan cancelled');
      } else {
        Alert.alert('Error', 'No se pudo completar el escaneo ONVIF.');
      }
    } finally {
      setScanningONVIF(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    microInteractions.vibrate();
    microInteractions.rotate();
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getOnlineCount = () => cameras.filter(c => c.status === 'online').length;
  const getOfflineCount = () => cameras.filter(c => c.status === 'offline').length;

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Cámaras IP</Text>
          <Text style={styles.headerSubtitle}>{cameras.length} dispositivos</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Animated.View style={microInteractions.getRotateStyle()}>
              <FontAwesome5 name="sync-alt" size={18} color={COLORS.accent} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { position: 'relative' }]}
            onPress={() => setNotificationsVisible(!notificationsVisible)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="bell" size={18} color={COLORS.accent} />
            {notifications.unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notifications.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Panel */}
      {notificationsVisible && (
        <Animated.View style={[styles.notificationsPanel, microInteractions.getOpacityStyle()]}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.notificationsTitle}>Notificaciones</Text>
            <TouchableOpacity onPress={() => notifications.clearNotifications()}>
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
          {notifications.notifications.length === 0 ? (
            <Text style={styles.emptyNotifications}>No hay notificaciones</Text>
          ) : (
            notifications.notifications.slice(0, 5).map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => notifications.markAsRead(notification.id)}
              >
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationBody}>{notification.body}</Text>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Animated.View style={[styles.statCard, { backgroundColor: COLORS.accentLight }]}>
          <FontAwesome5 name="video" size={24} color={COLORS.accent} />
          <Text style={[styles.statNumber, { color: COLORS.accent }]}>{cameras.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Animated.View>
        
        <Animated.View style={[styles.statCard, { backgroundColor: COLORS.onlineLight }]}>
          <FontAwesome5 name="check-circle" size={24} color={COLORS.online} />
          <Text style={[styles.statNumber, { color: COLORS.online }]}>{getOnlineCount()}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </Animated.View>
        
        <Animated.View style={[styles.statCard, { backgroundColor: COLORS.offlineLight }]}>
          <FontAwesome5 name="times-circle" size={24} color={COLORS.offline} />
          <Text style={[styles.statNumber, { color: COLORS.offline }]}>{getOfflineCount()}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </Animated.View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('CameraGrid')}
          activeOpacity={0.7}
          onPressIn={microInteractions.pressIn}
          onPressOut={microInteractions.pressOut}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.accentLight }]}>
            <FontAwesome5 name="th" size={18} color={COLORS.accent} />
          </View>
          <Text style={styles.actionText}>Ver Grid</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleScan}
          activeOpacity={0.7}
          onPressIn={microInteractions.pressIn}
          onPressOut={microInteractions.pressOut}
        >
          <View style={[styles.actionIcon, { backgroundColor: scanning ? COLORS.offlineLight : COLORS.accentLight }]}>
            {scanning ? (
              <ActivityIndicator color={COLORS.offline} size="small" />
            ) : (
              <FontAwesome5 name="search" size={18} color={COLORS.accent} />
            )}
          </View>
          <Text style={styles.actionText}>
            {scanning ? 'Cancelar Escaneo' : 'Escanear Red'}
          </Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleScanONVIF}
          activeOpacity={0.7}
          onPressIn={microInteractions.pressIn}
          onPressOut={microInteractions.pressOut}
        >
          <View style={[styles.actionIcon, { backgroundColor: scanningONVIF ? COLORS.offlineLight : COLORS.accentLight }]}>
            {scanningONVIF ? (
              <ActivityIndicator color={COLORS.offline} size="small" />
            ) : (
              <FontAwesome5 name="broadcast-tower" size={18} color={COLORS.accent} />
            )}
          </View>
          <Text style={styles.actionText}>
            {scanningONVIF ? 'Cancelar ONVIF' : 'Escanear ONVIF'}
          </Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddCamera')}
          activeOpacity={0.7}
          onPressIn={microInteractions.pressIn}
          onPressOut={microInteractions.pressOut}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.accentLight }]}>
            <FontAwesome5 name="plus" size={18} color={COLORS.accent} />
          </View>
          <Text style={styles.actionText}>Agregar Cámara</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Camera List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dispositivos</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.sectionAction}>Actualizar</Text>
          </TouchableOpacity>
        </View>
        
        {cameras.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="video-slash" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No hay cámaras configuradas</Text>
            <Text style={styles.emptySubtext}>Agrega una cámara o escanea la red</Text>
          </View>
        ) : (
          cameras.map((camera, index) => (
            <TouchableOpacity 
              key={camera.id}
              style={styles.cameraItem}
              onPress={() => navigation.navigate('CameraSingle', { camera })}
              activeOpacity={0.7}
              onPressIn={microInteractions.pressIn}
              onPressOut={microInteractions.pressOut}
            >
              <View style={styles.cameraStatus}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: camera.status === 'online' ? COLORS.online : COLORS.offline }
                ]} />
                {camera.status === 'online' && (
                  <View style={styles.pulseRing} />
                )}
              </View>
              <View style={styles.cameraInfo}>
                <Text style={styles.cameraName}>{camera.name}</Text>
                <Text style={styles.cameraIp}>{camera.ip}:{camera.port}</Text>
                {camera.onvif && (
                  <View style={styles.onvifBadge}>
                    <Text style={styles.onvifText}>ONVIF</Text>
                  </View>
                )}
              </View>
              <View style={styles.cameraActions}>
                <FontAwesome5 
                  name="video" 
                  size={16} 
                  color={camera.status === 'online' ? COLORS.accent : COLORS.textSecondary} 
                />
                <FontAwesome5 
                  name="chevron-right" 
                  size={12} 
                  color={COLORS.textSecondary} 
                  style={{ marginLeft: 8 }}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Refreshing Indicator */}
      {refreshing && (
        <View style={styles.refreshingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.refreshingText}>Actualizando...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.offline,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationsPanel: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.accent,
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationUnread: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  notificationBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyNotifications: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  section: {
    padding: 24,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionAction: {
    fontSize: 13,
    color: COLORS.accent,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  cameraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  cameraStatus: {
    position: 'relative',
    width: 12,
    height: 12,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.online,
    opacity: 0.3,
    zIndex: 1,
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  cameraIp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  onvifBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  onvifText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cameraActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  refreshingText: {
    color: COLORS.text,
    marginTop: 12,
    fontSize: 14,
  },
});

export default HomeScreen;
