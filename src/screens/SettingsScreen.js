import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY, SHADOWS } from '../theme';
import useSettingsStore from '../store/settingsStore';
import useMicroInteractions from '../hooks/useMicroInteractions';

export const SettingsScreen = () => {
  // Global Store
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  // Hooks
  const microInteractions = useMicroInteractions();

  // Local form states
  const [subnet, setSubnet] = useState(settings.defaultSubnet);
  const [timeout, setTimeoutVal] = useState(settings.scanTimeout.toString());
  const [intervalVal, setIntervalVal] = useState((settings.healthCheckInterval / 1000).toString()); // seconds
  const [concurrency, setConcurrency] = useState(settings.maxScanConcurrency.toString());
  const [sensitivity, setSensitivity] = useState(settings.motionSensitivity.toString());
  const [alerts, setAlerts] = useState(settings.enablePushAlerts);
  const [enableCloudSync, setEnableCloudSync] = useState(settings.enableCloudSync);
  const [cloudWebhookUrl, setCloudWebhookUrl] = useState(settings.cloudWebhookUrl || '');

  const handleSave = () => {
    microInteractions.vibrate();

    // Validations
    const subnetRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (!subnetRegex.test(subnet)) {
      Alert.alert('Error de Validación', 'La subred debe tener el formato XXX.XXX.XXX.');
      return;
    }

    const t = parseInt(timeout, 10);
    if (isNaN(t) || t < 200 || t > 5000) {
      Alert.alert('Error de Validación', 'El Timeout de escaneo debe estar entre 200 y 5000 ms.');
      return;
    }

    const i = parseInt(intervalVal, 10);
    if (isNaN(i) || i < 5 || i > 300) {
      Alert.alert('Error de Validación', 'El intervalo de monitoreo debe estar entre 5 y 300 segundos.');
      return;
    }

    const c = parseInt(concurrency, 10);
    if (isNaN(c) || c < 1 || c > 50) {
      Alert.alert('Error de Validación', 'La concurrencia máxima de escaneo debe estar entre 1 y 50.');
      return;
    }

    const s = parseInt(sensitivity, 10);
    if (isNaN(s) || s < 1 || s > 100) {
      Alert.alert('Error de Validación', 'La sensibilidad de movimiento debe estar entre 1 y 100.');
      return;
    }

    if (enableCloudSync) {
      const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
      if (!urlRegex.test(cloudWebhookUrl)) {
        Alert.alert('Error de Validación', 'Debes introducir una URL de Webhook válida (ej. http:// o https://).');
        return;
      }
    }

    updateSettings({
      defaultSubnet: subnet,
      scanTimeout: t,
      healthCheckInterval: i * 1000,
      maxScanConcurrency: c,
      motionSensitivity: s,
      enablePushAlerts: alerts,
      enableCloudSync,
      cloudWebhookUrl,
    });

    Alert.alert('Ajustes Guardados', 'Las preferencias de la aplicación se han actualizado.');
  };

  const handleReset = () => {
    microInteractions.vibrate();
    Alert.alert(
      'Restablecer Ajustes',
      '¿Deseas restaurar todas las configuraciones a sus valores por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            // Reload local states
            setSubnet('192.168.1');
            setTimeoutVal('1000');
            setIntervalVal('30');
            setConcurrency('15');
            setSensitivity('30');
            setAlerts(true);
            setEnableCloudSync(false);
            setCloudWebhookUrl('');
            Alert.alert('Restablecido', 'Se han cargado los valores por defecto.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* Network scanning preferences */}
        <Text style={styles.sectionTitle}>Escaneo de Red</Text>
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subred por Defecto</Text>
            <TextInput
              style={styles.input}
              value={subnet}
              onChangeText={setSubnet}
              placeholder="Ej. 192.168.1"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Timeout de Escaneo (ms)</Text>
            <TextInput
              style={styles.input}
              value={timeout}
              onChangeText={setTimeoutVal}
              keyboardType="numeric"
              placeholder="Ej. 1000"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.helperText}>Tiempo de espera máximo en cada ping IP (200 - 5000ms).</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Hilos Concurrentes</Text>
            <TextInput
              style={styles.input}
              value={concurrency}
              onChangeText={setConcurrency}
              keyboardType="numeric"
              placeholder="Ej. 15"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.helperText}>IPs que se barren en paralelo al mismo tiempo (1 - 50).</Text>
          </View>
        </View>

        {/* Monitoring & Alerts */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Monitoreo y Alertas</Text>
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Intervalo de Healthcheck (segundos)</Text>
            <TextInput
              style={styles.input}
              value={intervalVal}
              onChangeText={setIntervalVal}
              keyboardType="numeric"
              placeholder="Ej. 30"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.helperText}>Frecuencia para verificar si las cámaras están online (5 - 300s).</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Sensibilidad de Movimiento (1 - 100)</Text>
            <TextInput
              style={styles.input}
              value={sensitivity}
              onChangeText={setSensitivity}
              keyboardType="numeric"
              placeholder="Ej. 30"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.helperText}>Un número más alto es más sensible a cambios menores.</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: SPACING.md }}>
              <Text style={styles.switchLabel}>Notificaciones en Pantalla</Text>
              <Text style={styles.helperText}>Mostrar alertas flotantes en eventos de movimiento u offline.</Text>
            </View>
            <Switch
              value={alerts}
              onValueChange={setAlerts}
              trackColor={{ false: COLORS.border, true: COLORS.accentSolid }}
              thumbColor={alerts ? COLORS.accent : COLORS.textSecondary}
            />
          </View>
        </View>

        {/* Cloud synchronization preferences */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Sincronización en la Nube</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: SPACING.md }}>
              <Text style={styles.switchLabel}>Respaldar Eventos en Nube</Text>
              <Text style={styles.helperText}>Enviar capturas automáticas a un Webhook al detectar movimiento.</Text>
            </View>
            <Switch
              value={enableCloudSync}
              onValueChange={setEnableCloudSync}
              trackColor={{ false: COLORS.border, true: COLORS.accentSolid }}
              thumbColor={enableCloudSync ? COLORS.accent : COLORS.textSecondary}
            />
          </View>

          {enableCloudSync && (
            <View style={[styles.formGroup, { marginTop: SPACING.md }]}>
              <Text style={styles.label}>URL del Webhook (Make / Zapier / IFTTT)</Text>
              <TextInput
                style={styles.input}
                value={cloudWebhookUrl}
                onChangeText={setCloudWebhookUrl}
                placeholder="https://hook.us1.make.com/..."
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                Se enviará una petición POST HTTP con JSON que incluye metadatos y la imagen de alerta en Base64.
              </Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Guardar Preferencias</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
          <Text style={styles.resetBtnText}>Restablecer Valores por Defecto</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusLg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SPACING.md,
    height: 46,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  helperText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    marginTop: SPACING.md,
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    height: 50,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  resetBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  resetBtnText: {
    color: COLORS.offline,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});

export default SettingsScreen;
