import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Platform,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY, SHADOWS } from '../theme';
import useCameraStore from '../store/cameraStore';
import useNotificationStore from '../store/notificationStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import useNetworkInfo from '../hooks/useNetworkInfo';
import useCameraHealth from '../hooks/useCameraHealth';
import CameraCard from '../components/CameraCard';
import EmptyState from '../components/EmptyState';

export const HomeScreen = ({ navigation }) => {
  // Global Stores
  const cameras = useCameraStore((state) => state.cameras);
  const loading = useCameraStore((state) => state.loading);
  const checkAllStatuses = useCameraStore((state) => state.checkAllStatuses);
  
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const clearNotifications = useNotificationStore((state) => state.clearAll);
  const unreadCount = useNotificationStore((state) => state.getUnreadCount());

  // Hooks
  const microInteractions = useMicroInteractions();
  const network = useNetworkInfo();
  useCameraHealth(); // Start periodic healthcheck

  // Local State
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    microInteractions.vibrate();
    microInteractions.rotate();
    await checkAllStatuses();
    setRefreshing(false);
  };

  const getOnlineCount = () => cameras.filter((c) => c.status === 'online').length;
  const getOfflineCount = () => cameras.filter((c) => c.status === 'offline').length;

  const toggleNotifications = () => {
    microInteractions.vibrate();
    if (notificationsVisible) {
      microInteractions.fadeOut(200);
      setTimeout(() => setNotificationsVisible(false), 200);
    } else {
      setNotificationsVisible(true);
      microInteractions.fadeIn(300);
    }
  };

  // Render Header
  const renderHeader = () => (
    <View>
      {/* Top Info & Action Row */}
      <View style={styles.header}>
        <View style={styles.networkBadge}>
          <FontAwesome5
            name={network.type === 'wifi' ? 'wifi' : 'network-wired'}
            size={11}
            color={COLORS.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.networkText} numberOfLines={1}>
            {network.wifiName ? network.wifiName : 'Red Local'} ({network.subnet}.x)
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Animated.View style={microInteractions.getRotateStyle()}>
              <FontAwesome5 name="sync-alt" size={13} color={COLORS.textSecondary} />
            </Animated.View>
          </TouchableOpacity>
          
          {/* Settings Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="cog" size={13} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Notifications Trigger */}
          <TouchableOpacity
            style={[styles.iconButton, { position: 'relative' }]}
            onPress={toggleNotifications}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="bell" size={13} color={COLORS.textSecondary} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Large One UI Title Area */}
      <View style={styles.largeTitleArea}>
        <Text style={styles.largeTitle}>Controlador IP</Text>
        <Text style={styles.largeSubtitle}>
          {cameras.length === 0 
            ? 'No hay cámaras añadidas' 
            : `${getOnlineCount()} de ${cameras.length} dispositivos en línea`}
        </Text>
      </View>

      {/* Notifications Expandable Panel */}
      {notificationsVisible && (
        <Animated.View style={[styles.notificationsPanel, microInteractions.getOpacityStyle()]}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.notificationsTitle}>Alertas Recientes</Text>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearNotifications}>
                <Text style={styles.clearText}>Limpiar Historial</Text>
              </TouchableOpacity>
            )}
          </View>
          {notifications.length === 0 ? (
            <Text style={styles.emptyNotifications}>No hay alertas registradas</Text>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.8}
              >
                <View style={styles.notificationDotContainer}>
                  <View
                    style={[
                      styles.notificationDot,
                      {
                        backgroundColor:
                          notification.type === 'motion'
                            ? COLORS.offline
                            : notification.type === 'online'
                            ? COLORS.online
                            : COLORS.accent,
                      },
                    ]}
                  />
                </View>
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitleText}>{notification.title}</Text>
                  <Text style={styles.notificationBodyText}>{notification.body}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      )}

      {/* Camera Statistics Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <FontAwesome5 name="video" size={18} color={COLORS.accent} />
          <Text style={[styles.statNumber, { color: COLORS.text }]}>{cameras.length}</Text>
          <Text style={styles.statLabel}>Cámaras</Text>
        </View>

        <View style={styles.statCard}>
          <FontAwesome5 name="check-circle" size={18} color={COLORS.online} />
          <Text style={[styles.statNumber, { color: COLORS.online }]}>{getOnlineCount()}</Text>
          <Text style={styles.statLabel}>En línea</Text>
        </View>

        <View style={styles.statCard}>
          <FontAwesome5 name="times-circle" size={18} color={COLORS.offline} />
          <Text style={[styles.statNumber, { color: COLORS.offline }]}>{getOfflineCount()}</Text>
          <Text style={styles.statLabel}>Fuera de línea</Text>
        </View>
      </View>

      {/* Quick Actions Panel */}
      <View style={styles.actionsContainer}>
        {/* View Grid */}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionBorder]}
          onPress={() => navigation.navigate('CameraGrid')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.accentLight }]}>
            <FontAwesome5 name="th" size={14} color={COLORS.accent} />
          </View>
          <Text style={styles.actionText}>Vista Cuadrícula (Grid)</Text>
          <FontAwesome5 name="chevron-right" size={10} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Scan Network */}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionBorder]}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.onlineLight }]}>
            <FontAwesome5 name="search" size={14} color={COLORS.online} />
          </View>
          <Text style={styles.actionText}>Escanear Red Local</Text>
          <FontAwesome5 name="chevron-right" size={10} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Add Camera Manually */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddCamera')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.warningLight }]}>
            <FontAwesome5 name="plus" size={14} color={COLORS.warning} />
          </View>
          <Text style={styles.actionText}>Agregar Cámara Manual</Text>
          <FontAwesome5 name="chevron-right" size={10} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dispositivos Conectados</Text>
        {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginLeft: 8 }} />}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cameras}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CameraCard
            camera={item}
            variant="list"
            onPress={() => navigation.navigate('CameraSingle', { camera: item })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <EmptyState
            icon="video-slash"
            title="No hay cámaras configuradas"
            subtitle="Comienza agregando una cámara manualmente o escaneando los puertos en tu red local."
            actionText="Escanear Red Local"
            onAction={() => navigation.navigate('Scan')}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
            progressBackgroundColor={COLORS.surface}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusRound,
  },
  networkText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.offline,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  
  // One UI Title Area
  largeTitleArea: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  largeTitle: {
    fontSize: TYPOGRAPHY.sizes.title,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  largeSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Expandable notifications panel
  notificationsPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  notificationsTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  clearText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.offline,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  emptyNotifications: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationUnread: {
    backgroundColor: '#ffffff03',
  },
  notificationDotContainer: {
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notificationText: {
    flex: 1,
    paddingLeft: SPACING.sm,
  },
  notificationTitleText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text,
  },
  notificationBodyText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Stats Card
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Quick Actions
  actionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  actionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
  },
});

export default HomeScreen;
