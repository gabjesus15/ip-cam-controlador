import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY, SHADOWS } from '../theme';
import StatusBadge from './StatusBadge';

export const CameraCard = ({ camera, variant = 'list', onPress, onLongPress, isVisible = true }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  // Get brand icon
  const getBrandIcon = () => {
    switch (camera.type) {
      case 'hikvision':
        return 'shield-alt';
      case 'dahua':
        return 'lock';
      case 'tplink':
        return 'wifi';
      case 'reolink':
        return 'link';
      case 'onvif':
        return 'broadcast-tower';
      default:
        return 'video';
    }
  };

  if (variant === 'grid') {
    return (
      <Animated.View style={[styles.gridContainer, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.gridTouch}
        >
          {/* Thumbnail Container */}
          <View style={styles.thumbnailContainer}>
            {camera.status === 'online' && camera.snapshotUrl && isVisible ? (
              <Image
                source={{ uri: `${camera.snapshotUrl}?t=${Date.now()}` }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <FontAwesome5 name={getBrandIcon()} size={32} color={COLORS.textSecondary} />
              </View>
            )}
            
            {/* Absolute Position Status Badge */}
            <View style={styles.gridBadgeContainer}>
              <StatusBadge status={camera.status} />
            </View>
          </View>

          {/* Camera Details */}
          <View style={styles.gridInfo}>
            <Text style={styles.gridName} numberOfLines={1}>
              {camera.name}
            </Text>
            <Text style={styles.gridIp}>
              {camera.ip}:{camera.port}
            </Text>
            
            <View style={styles.badgeRow}>
              {camera.onvif && (
                <View style={styles.onvifBadge}>
                  <Text style={styles.onvifText}>ONVIF</Text>
                </View>
              )}
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>{camera.type.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Default: List Variant
  return (
    <Animated.View style={[styles.listContainer, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.listTouch}
      >
        {/* Left Status Dot Ring */}
        <View style={styles.listStatusContainer}>
          <View
            style={[
              styles.listStatusDot,
              {
                backgroundColor:
                  camera.status === 'online'
                    ? COLORS.online
                    : camera.status === 'offline'
                    ? COLORS.offline
                    : COLORS.warning,
              },
            ]}
          />
        </View>

        {/* Center Info */}
        <View style={styles.listInfo}>
          <Text style={styles.listName} numberOfLines={1}>
            {camera.name}
          </Text>
          <Text style={styles.listIp}>
            {camera.ip}:{camera.port}
          </Text>
          
          <View style={styles.badgeRow}>
            {camera.onvif && (
              <View style={styles.onvifBadge}>
                <Text style={styles.onvifText}>ONVIF</Text>
              </View>
            )}
            <View style={styles.brandBadge}>
              <Text style={styles.brandText}>{camera.type.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Right Arrow/Actions */}
        <View style={styles.listActions}>
          <FontAwesome5
            name="video"
            size={14}
            color={camera.status === 'online' ? COLORS.accent : COLORS.textMuted}
          />
          <FontAwesome5
            name="chevron-right"
            size={12}
            color={COLORS.textMuted}
            style={{ marginLeft: SPACING.sm }}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Grid Styles
  gridContainer: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  gridTouch: {
    width: '100%',
  },
  thumbnailContainer: {
    width: '100%',
    height: 115,
    backgroundColor: '#1b1b22',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  gridBadgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  gridInfo: {
    padding: SPACING.md,
  },
  gridName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  gridIp: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // List Styles
  listContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  listTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  listStatusContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listInfo: {
    flex: 1,
    paddingLeft: SPACING.md,
  },
  listName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  listIp: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.sm,
  },

  // Shared Badges
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  onvifBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusSm,
    marginRight: 6,
  },
  onvifText: {
    fontSize: 9,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  brandBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusSm,
  },
  brandText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});

export default CameraCard;
