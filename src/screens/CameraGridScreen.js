import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  border: '#222',
  text: '#fff',
  textSecondary: '#888',
  accent: '#00d4ff',
  accentLight: '#00d4ff22',
  online: '#00ff88',
  onlineLight: '#00ff8822',
  offline: '#ff4444',
  offlineLight: '#ff444422',
};

const CameraGridScreen = ({ navigation }) => {
  const { cameras } = useCameraStore();
  const microInteractions = useMicroInteractions();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    microInteractions.vibrate();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Todas las Cámaras</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="sync-alt" size={18} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <ScrollView 
        style={styles.gridContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      >
        {cameras.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="video-slash" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No hay cámaras</Text>
            <Text style={styles.emptySubtext}>Agrega una cámara para verla aquí</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {cameras.map((camera) => (
              <TouchableOpacity
                key={camera.id}
                style={[
                  styles.gridItem,
                  isLargeScreen && styles.gridItemLarge,
                ]}
                onPress={() => navigation.navigate('CameraSingle', { camera })}
                activeOpacity={0.7}
                onPressIn={microInteractions.pressIn}
                onPressOut={microInteractions.pressOut}
              >
                {/* Thumbnail Placeholder */}
                <View style={styles.thumbnail}>
                  <FontAwesome5 name="video" size={32} color={COLORS.textSecondary} />
                  <View style={[
                    styles.statusOverlay,
                    { backgroundColor: camera.status === 'online' ? COLORS.onlineLight : COLORS.offlineLight },
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: camera.status === 'online' ? COLORS.online : COLORS.offline },
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: camera.status === 'online' ? COLORS.online : COLORS.offline },
                    ]}>
                      {camera.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {camera.name}
                  </Text>
                  <Text style={styles.itemIp} numberOfLines={1}>
                    {camera.ip}:{camera.port}
                  </Text>
                  {camera.onvif && (
                    <View style={styles.onvifBadge}>
                      <Text style={styles.onvifText}>ONVIF</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCamera')}
        activeOpacity={0.7}
        onPressIn={microInteractions.pressIn}
        onPressOut={microInteractions.pressOut}
      >
        <FontAwesome5 name="plus" size={24} color={COLORS.bg} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  gridItemLarge: {
    width: (width - 64) / 3,
  },
  thumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
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
    fontWeight: '700',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemIp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  onvifBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  onvifText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 212, 255, 0.4)',
      },
      default: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
});

export default CameraGridScreen;
