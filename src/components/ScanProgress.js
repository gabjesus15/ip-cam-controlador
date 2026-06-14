import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, SIZES, TYPOGRAPHY } from '../theme';

export const ScanProgress = ({ progress, scanning }) => {
  const { scanned, total, found, currentIp } = progress;
  const widthAnim = useRef(new Animated.Value(0)).current;

  // Calculate percentage
  const percentage = total > 0 ? Math.round((scanned / total) * 100) : 0;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 250,
      useNativeDriver: false, // width animation requires false for layout updates
    }).start();
  }, [percentage, widthAnim]);

  if (!scanning) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscando cámaras...</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>

      {/* Progress Bar Container */}
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          Escanenado IP: {currentIp || 'Esperando...'}
        </Text>
        <Text style={styles.foundText}>
          {found} {found === 1 ? 'encontrada' : 'encontradas'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  percentage: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.accent,
  },
  barContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  foundText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.online,
  },
});

export default ScanProgress;
