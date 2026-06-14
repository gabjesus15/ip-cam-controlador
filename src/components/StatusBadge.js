import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, SIZES, TYPOGRAPHY } from '../theme';

export const StatusBadge = ({ status }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation;
    if (status === 'online') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [status, pulseAnim]);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return COLORS.online;
      case 'offline':
        return COLORS.offline;
      case 'checking':
        return COLORS.warning;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'online':
        return COLORS.onlineLight;
      case 'offline':
        return COLORS.offlineLight;
      case 'checking':
        return COLORS.warningLight;
      default:
        return COLORS.border;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'EN LÍNEA';
      case 'offline':
        return 'DESCONECTADA';
      case 'checking':
        return 'VERIFICANDO';
      default:
        return 'DESCONOCIDO';
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getStatusBgColor() }]}>
      <View style={styles.dotContainer}>
        {status === 'online' && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: COLORS.online,
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.6],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
        )}
        <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
      </View>
      <Text style={[styles.text, { color: getStatusColor() }]}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 12,
    height: 12,
    marginRight: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  text: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.5,
  },
});

export default StatusBadge;
