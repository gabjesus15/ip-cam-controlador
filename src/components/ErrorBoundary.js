import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY } from '../theme';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <FontAwesome5 name="exclamation-triangle" size={64} color={COLORS.offline} />
          <Text style={styles.title}>¡Oops! Algo salió mal</Text>
          <Text style={styles.subtitle}>
            La aplicación encontró un error inesperado en este componente.
          </Text>
          {this.state.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.xl,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.offline,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: SIZES.radiusRound,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
});

export default ErrorBoundary;
