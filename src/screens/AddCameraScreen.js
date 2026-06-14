import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY, SHADOWS } from '../theme';
import useCameraStore from '../store/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import { CAMERA_PROFILES, getPathsForProfile } from '../services/cameraProfiles';

export const AddCameraScreen = ({ navigation }) => {
  // Global State
  const addCamera = useCameraStore((state) => state.addCamera);
  const cameras = useCameraStore((state) => state.cameras);

  // Hooks
  const microInteractions = useMicroInteractions();

  // Form Fields State
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('80');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [selectedType, setSelectedType] = useState('generic');

  // Test Connection State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'failed' | null
  const [saving, setSaving] = useState(false);

  // Auto detect URL on IP, Port, Type changes
  useEffect(() => {
    if (ip) {
      const paths = getPathsForProfile(selectedType, ip, port || '80');
      // Set the first stream path as default url
      if (paths.streamUrls && paths.streamUrls.length > 0) {
        setUrl(paths.streamUrls[0]);
      }
    } else {
      setUrl('');
    }
  }, [ip, port, selectedType]);

  const validateInputs = () => {
    // 1. Check required fields
    if (!name.trim()) {
      Alert.alert('Faltan campos', 'Por favor ingresa un nombre para identificar la cámara.');
      return false;
    }
    if (!ip.trim()) {
      Alert.alert('Faltan campos', 'Por favor ingresa el Host o dirección IP de la cámara.');
      return false;
    }

    // 2. Validate IP / Domain address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!ipRegex.test(ip) && !domainRegex.test(ip) && ip !== 'localhost') {
      Alert.alert('IP Inválida', 'Por favor ingresa una dirección IPv4 o nombre de host válido.');
      return false;
    }

    // 3. Validate Port
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert('Puerto Inválido', 'El puerto debe ser un número entero entre 1 y 65535.');
      return false;
    }

    // 4. Validate URL
    if (!url.trim()) {
      Alert.alert('Faltan campos', 'Por favor ingresa la URL del stream de video.');
      return false;
    }

    // 5. Check duplicate IP:Port
    if (cameras.some((c) => c.ip === ip && c.port === port)) {
      Alert.alert('Cámara Duplicada', 'Ya existe una cámara configurada con esta misma dirección IP y puerto.');
      return false;
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!ip || !port || !url) {
      Alert.alert('Faltan datos', 'Completa la IP, el puerto y la URL del stream para realizar el test.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    microInteractions.vibrate();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 401) {
        setTestResult('success');
      } else {
        setTestResult('failed');
      }
    } catch {
      setTestResult('failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      microInteractions.shake();
      return;
    }

    setSaving(true);
    microInteractions.vibrate();

    try {
      const paths = getPathsForProfile(selectedType, ip, port);
      const snapshotUrl = paths.snapshotUrls && paths.snapshotUrls.length > 0 ? paths.snapshotUrls[0] : url;

      await addCamera({
        name: name.trim(),
        ip: ip.trim(),
        port: port.trim(),
        username: username.trim(),
        password,
        url: url.trim(),
        snapshotUrl: snapshotUrl.trim(),
        type: selectedType,
        onvif: selectedType === 'onvif',
      });

      Alert.alert('Cámara Agregada', 'La cámara se ha guardado exitosamente en tus dispositivos.', [
        { text: 'Aceptar', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la cámara. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          
          {/* Brand/Profile Type Selector */}
          <Text style={styles.sectionTitle}>Perfil de la Cámara</Text>
          <View style={styles.brandSelectorRow}>
            {Object.keys(CAMERA_PROFILES).map((brandKey) => {
              const brand = CAMERA_PROFILES[brandKey];
              const isActive = selectedType === brandKey;
              return (
                <TouchableOpacity
                  key={brandKey}
                  style={[styles.brandCard, isActive && styles.brandCardActive]}
                  onPress={() => {
                    microInteractions.vibrate();
                    setSelectedType(brandKey);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.brandCardText, isActive && styles.brandCardTextActive]}>
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form Fields */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Configuración de Red</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre Identificador *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Cámara Cochera, Entrada Principal..."
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 2, marginRight: SPACING.sm }]}>
              <Text style={styles.label}>Dirección IP / Host *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 192.168.1.100"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={ip}
                onChangeText={setIp}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Puerto *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 80, 8080"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={port}
                onChangeText={setPort}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: SPACING.sm }]}>
              <Text style={styles.label}>Usuario (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="admin"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Contraseña (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>URL RTSP o HTTP MJPEG (Autocompletado)</Text>
            <TextInput
              style={[styles.input, styles.urlInput]}
              placeholder="Ej. http://192.168.1.100:8080/video"
              placeholderTextColor={COLORS.textMuted}
              value={url}
              onChangeText={setUrl}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Test connection row */}
          <View style={styles.testRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={testing}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <>
                  <FontAwesome5 name="signal" size={12} color={COLORS.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.testBtnText}>Probar Conectividad</Text>
                </>
              )}
            </TouchableOpacity>

            {testResult === 'success' && (
              <View style={styles.testSuccessBadge}>
                <FontAwesome5 name="check-circle" size={12} color={COLORS.online} style={{ marginRight: 4 }} />
                <Text style={styles.testSuccessText}>Conexión Exitosa</Text>
              </View>
            )}

            {testResult === 'failed' && (
              <View style={styles.testFailedBadge}>
                <FontAwesome5 name="times-circle" size={12} color={COLORS.offline} style={{ marginRight: 4 }} />
                <Text style={styles.testFailedText}>Sin Conexión</Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar Dispositivo</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
  brandSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  brandCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  brandCardActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  brandCardText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  brandCardTextActive: {
    color: COLORS.accent,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SPACING.md,
    height: 46,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  urlInput: {
    height: 60,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    textAlignVertical: 'top',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: SIZES.radiusRound,
  },
  testBtnText: {
    color: COLORS.accent,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  testSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  testSuccessText: {
    color: COLORS.online,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  testFailedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  testFailedText: {
    color: COLORS.offline,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    height: 50,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});

export default AddCameraScreen;
