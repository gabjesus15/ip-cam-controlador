import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Animated,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import useCameraStore from '../utils/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  border: '#222',
  text: '#fff',
  textSecondary: '#888',
  accent: '#00d4ff',
  accentLight: '#00d4ff22',
  online: '#00ff88',
  offline: '#ff4444',
};

const AddCameraScreen = ({ route, navigation }) => {
  const { addCamera, scanNetwork } = useCameraStore();
  const microInteractions = useMicroInteractions();
  const { foundCameras } = route.params || {};
  
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8080');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState(foundCameras || []);
  const [selectedType, setSelectedType] = useState('generic');

  const cameraTypes = [
    { id: 'generic', name: 'Genérica', icon: 'video' },
    { id: 'onvif', name: 'ONVIF', icon: 'broadcast-tower' },
    { id: 'hikvision', name: 'Hikvision', icon: 'shield-alt' },
    { id: 'dahua', name: 'Dahua', icon: 'lock' },
  ];

  const handleAutoDetect = () => {
    if (ip && port) {
      const detectedUrl = `http://${ip}:${port}/video`;
      setUrl(detectedUrl);
      microInteractions.vibrate();
    }
  };

  const handleAdd = async () => {
    if (!name || !ip || !port) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
      microInteractions.shake();
      return;
    }

    setLoading(true);
    try {
      const cameraUrl = url || `http://${ip}:${port}/video`;
      await addCamera({
        name,
        ip,
        port,
        username,
        password,
        url: cameraUrl,
        type: selectedType,
        onvif: selectedType === 'onvif',
      });
      Alert.alert('Éxito', 'Cámara agregada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la cámara');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    microInteractions.vibrate();
    try {
      const found = await scanNetwork();
      setDiscovered(found);
      if (found.length === 0) {
        Alert.alert('Sin resultados', 'No se encontraron cámaras en la red');
      } else {
        microInteractions.pulse();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar el escaneo');
    } finally {
      setScanning(false);
    }
  };

  const selectDiscovered = (camera) => {
    setName(camera.name);
    setIp(camera.ip);
    setPort(camera.port);
    setUrl(camera.url);
    setSelectedType(camera.type || 'generic');
    setDiscovered([]);
    microInteractions.vibrate();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Camera Type Selector */}
      <View style={styles.typeSection}>
        <Text style={styles.sectionTitle}>Tipo de Cámara</Text>
        <View style={styles.typeContainer}>
          {cameraTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeButton,
                selectedType === type.id && styles.typeButtonActive,
              ]}
              onPress={() => {
                setSelectedType(type.id);
                microInteractions.vibrate();
              }}
              activeOpacity={0.7}
              onPressIn={microInteractions.pressIn}
              onPressOut={microInteractions.pressOut}
            >
              <FontAwesome5
                name={type.icon}
                size={18}
                color={selectedType === type.id ? COLORS.bg : COLORS.accent}
              />
              <Text
                style={[
                  styles.typeText,
                  selectedType === type.id && styles.typeTextActive,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Discovered Cameras */}
      {discovered.length > 0 && (
        <View style={styles.discoveredSection}>
          <Text style={styles.sectionTitle}>Cámaras Encontradas</Text>
          {discovered.map((camera) => (
            <TouchableOpacity
              key={camera.id}
              style={styles.discoveredItem}
              onPress={() => selectDiscovered(camera)}
              activeOpacity={0.7}
              onPressIn={microInteractions.pressIn}
              onPressOut={microInteractions.pressOut}
            >
              <View style={styles.discoveredIcon}>
                <FontAwesome5 name="video" size={18} color={COLORS.accent} />
              </View>
              <View style={styles.discoveredInfo}>
                <Text style={styles.discoveredName}>{camera.name}</Text>
                <Text style={styles.discoveredIp}>{camera.ip}:{camera.port}</Text>
                {camera.onvif && (
                  <View style={styles.onvifBadge}>
                    <Text style={styles.onvifText}>ONVIF</Text>
                  </View>
                )}
              </View>
              <FontAwesome5 name="check" size={14} color={COLORS.online} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Form */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre *</Text>
          <TextInput
            style={[styles.input, { color: '#fff' }]}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Cámara Principal"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 2, marginRight: 12 }]}>
            <Text style={styles.inputLabel}>Dirección IP *</Text>
            <TextInput
              style={[styles.input, { color: '#fff' }]}
              value={ip}
              onChangeText={setIp}
              placeholder="192.168.1.100"
              placeholderTextColor="#666"
              keyboardType="numeric"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Puerto *</Text>
            <TextInput
              style={[styles.input, { color: '#fff' }]}
              value={port}
              onChangeText={setPort}
              placeholder="8080"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.inputLabel}>Usuario</Text>
            <TextInput
              style={[styles.input, { color: '#fff' }]}
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={[styles.input, { color: '#fff' }]}
              value={password}
              onChangeText={setPassword}
              placeholder="******"
              placeholderTextColor="#666"
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.urlHeader}>
            <Text style={styles.inputLabel}>URL de Video</Text>
            <Switch
              value={autoDetect}
              onValueChange={setAutoDetect}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={autoDetect ? COLORS.text : COLORS.textSecondary}
            />
          </View>
          <TextInput
            style={[styles.input, { color: '#fff' }]}
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.100:8080/video"
            placeholderTextColor="#666"
            autoCapitalize="none"
            editable={!autoDetect}
          />
          {autoDetect && (
            <TouchableOpacity 
              style={styles.detectBtn} 
              onPress={handleAutoDetect}
              activeOpacity={0.7}
              onPressIn={microInteractions.pressIn}
              onPressOut={microInteractions.pressOut}
            >
              <FontAwesome5 name="magic" size={12} color={COLORS.accent} />
              <Text style={styles.detectBtnText}>Auto-detectar URL</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.scanBtn} 
          onPress={handleScan} 
          disabled={scanning}
          activeOpacity={0.7}
          onPressIn={microInteractions.pressIn}
          onPressOut={microInteractions.pressOut}
        >
          {scanning ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <>
              <FontAwesome5 name="search" size={14} color={COLORS.accent} />
              <Text style={styles.scanBtnText}>Escanear Red</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={handleAdd} 
          disabled={loading}
          activeOpacity={0.7}
          onPressIn={microInteractions.pressIn}
          onPressOut={microInteractions.pressOut}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <>
              <FontAwesome5 name="plus" size={16} color={COLORS.bg} />
              <Text style={styles.addBtnText}>Agregar Cámara</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  typeSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 100,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  typeButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  typeTextActive: {
    color: COLORS.bg,
  },
  discoveredSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  discoveredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
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
  discoveredIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  discoveredInfo: {
    flex: 1,
  },
  discoveredName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  discoveredIp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  onvifBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  onvifText: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  formSection: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#000',
    color: '#fff',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        color: '#fff',
      },
    }),
  },
  urlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  detectBtnText: {
    fontSize: 13,
    color: COLORS.accent,
    marginLeft: 8,
  },
  actions: {
    padding: 16,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bg,
    marginLeft: 8,
  },
});

export default AddCameraScreen;
