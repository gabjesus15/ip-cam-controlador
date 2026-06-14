import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY, SHADOWS } from '../theme';
import useCameraStore from '../store/cameraStore';
import useSettingsStore from '../store/settingsStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import useNetworkInfo from '../hooks/useNetworkInfo';
import { scanSubnet, scanUDPDiscovery } from '../services/discoveryService';
import ScanProgress from '../components/ScanProgress';

const SCAN_PORTS = [
  { id: '80', name: 'HTTP Web (80)', selected: true },
  { id: '8080', name: 'Alt Web (8080)', selected: true },
  { id: '8081', name: 'Alt Web 2 (8081)', selected: false },
  { id: '88', name: 'Foscam/Other (88)', selected: true },
  { id: '554', name: 'RTSP Stream (554)', selected: true },
  { id: '8000', name: 'ONVIF/Hik (8000)', selected: true },
  { id: '37777', name: 'Dahua (37777)', selected: false },
];

export const ScanScreen = ({ navigation }) => {
  // Global State
  const addCamera = useCameraStore((state) => state.addCamera);
  const cameras = useCameraStore((state) => state.cameras);
  const settings = useSettingsStore((state) => state.settings);

  // Hooks
  const microInteractions = useMicroInteractions();
  const network = useNetworkInfo();

  // Local State
  const [subnet, setSubnet] = useState(settings.defaultSubnet);
  const [portsConfig, setPortsConfig] = useState(SCAN_PORTS);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 0, found: 0, currentIp: '' });
  const [discoveredCameras, setDiscoveredCameras] = useState([]);
  const [scanType, setScanType] = useState('tcp'); // 'tcp' | 'udp'

  const abortControllerRef = useRef(null);

  // Auto-fill subnet when network info updates
  useEffect(() => {
    if (network.subnet) {
      setSubnet(network.subnet);
    }
  }, [network.subnet]);

  const togglePortSelection = (portId) => {
    microInteractions.vibrate();
    setPortsConfig((prev) =>
      prev.map((port) =>
        port.id === portId ? { ...port, selected: !port.selected } : port
      )
    );
  };

  const handleStartScan = async () => {
    console.log('handleStartScan triggered. scanning:', scanning, 'scanType:', scanType);
    if (scanning) {
      console.log('Cancelling active scan...');
      abortControllerRef.current?.abort();
      setScanning(false);
      return;
    }

    microInteractions.vibrate();
    setScanning(true);
    setDiscoveredCameras([]);

    if (scanType === 'udp') {
      console.log('Starting UDP broadcast scan...');
      setScanProgress({ scanned: 0, total: 1, found: 0, currentIp: 'Broadcast 255.255.255.255' });
      try {
        const results = await scanUDPDiscovery(3000, (foundCam) => {
          console.log('UDP camera found:', foundCam.ip);
          setDiscoveredCameras((prev) => {
            if (prev.some((c) => c.ip === foundCam.ip)) return prev;
            return [...prev, foundCam];
          });
          setScanProgress((prev) => ({
            ...prev,
            found: prev.found + 1,
          }));
        });

        console.log('UDP scan finished. Results:', results.length);
        setScanning(false);

        if (results.length === 0) {
          Alert.alert(
            'Búsqueda UDP Finalizada',
            'No se respondieron peticiones de búsqueda UDP en el puerto 32108. Asegúrate de que las cámaras estén encendidas e integradas a la red local.'
          );
        } else {
          Alert.alert(
            'Cámaras Encontradas',
            `Se detectaron ${results.length} cámaras UDP Beken/A9 respondiendo en la red local.`
          );
        }
      } catch (err) {
        console.warn('UDP scan error:', err);
        setScanning(false);
        if (err.message === 'UDP_LIBRARY_NOT_AVAILABLE') {
          Alert.alert(
            'Escaneo UDP No Disponible',
            'El escaneo UDP nativo requiere compilar la aplicación como cliente de desarrollo (no es compatible con Expo Go básico o Web).\n\nPara usar tu cámara Beken/A9, inicia tu script Proxy local UDP-a-MJPEG en tu PC e introduce la IP de la PC manualmente en "Añadir Cámara".',
            [{ text: 'Entendido' }]
          );
        } else {
          Alert.alert('Error', 'Ocurrió un fallo al inicializar el socket UDP local.');
        }
      }
      return;
    }

    console.log('Validating TCP subnet scan params. Subnet:', subnet);
    // Verify subnet format (e.g. 192.168.1)
    const subnetRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (!subnetRegex.test(subnet)) {
      console.log('Invalid subnet format:', subnet);
      Alert.alert('Subred Inválida', 'La subred debe tener el formato XXX.XXX.XXX (ej. 192.168.1).');
      setScanning(false);
      return;
    }

    const selectedPorts = portsConfig.filter((p) => p.selected).map((p) => p.id);
    if (selectedPorts.length === 0) {
      console.log('No ports selected for TCP scan');
      Alert.alert('Sin Puertos', 'Por favor selecciona al menos un puerto para realizar el escaneo.');
      setScanning(false);
      return;
    }

    console.log('Starting TCP subnet scan. Subnet:', subnet, 'Ports:', selectedPorts);
    setScanProgress({ scanned: 0, total: 254, found: 0, currentIp: '' });
    abortControllerRef.current = new AbortController();

    try {
      const results = await scanSubnet(
        subnet,
        {
          ports: selectedPorts,
          timeout: settings.scanTimeout,
          maxConcurrency: settings.maxScanConcurrency,
          signal: abortControllerRef.current.signal,
        },
        (progress) => {
          setScanProgress(progress);
        }
      );

      console.log('TCP subnet scan complete. Found cameras:', results.length);
      setDiscoveredCameras(results);
      setScanning(false);

      if (results.length === 0) {
        Alert.alert('Escaneo Finalizado', 'No se encontraron dispositivos de video en la red.');
      } else {
        Alert.alert(
          'Escaneo Completado',
          `Se encontraron ${results.length} dispositivos en la subred ${subnet}.x.`
        );
      }
    } catch (err) {
      console.warn('TCP scan error:', err);
      if (err.name === 'AbortError' || abortControllerRef.current.signal.aborted) {
        console.log('TCP scan was aborted');
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al escanear la red.');
        setScanning(false);
      }
    }
  };

  const handleAddDiscovered = async (camera) => {
    microInteractions.vibrate();
    
    // Check duplicates
    if (cameras.some((c) => c.ip === camera.ip && c.port === camera.port)) {
      Alert.alert('Ya Existe', 'Esta cámara ya está guardada en tu lista de dispositivos.');
      return;
    }

    try {
      const added = await addCamera({
        name: camera.name,
        ip: camera.ip,
        port: camera.port,
        username: camera.username || '',
        password: camera.password || '',
        url: camera.url,
        snapshotUrl: camera.snapshotUrl || camera.url,
        type: camera.type,
        onvif: camera.onvif || false,
      });

      // Remove from discovered list or mark as added
      setDiscoveredCameras((prev) => prev.filter((c) => c.id !== camera.id));
      
      Alert.alert('Dispositivo Guardado', `La cámara "${added.name}" se agregó a tu lista.`);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la cámara.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={discoveredCameras}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.sectionTitle}>Configuración de Búsqueda</Text>
            
            {/* Scan type selector */}
            <View style={styles.scanTypeRow}>
              <TouchableOpacity
                style={[styles.typeTab, scanType === 'tcp' && styles.typeTabActive, scanning && { opacity: 0.6 }]}
                disabled={scanning}
                onPress={() => {
                  microInteractions.vibrate();
                  setScanType('tcp');
                  setDiscoveredCameras([]);
                }}
              >
                <FontAwesome5 name="network-wired" size={11} color={scanType === 'tcp' ? '#ffffff' : COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.typeTabText, scanType === 'tcp' && styles.typeTabTextActive]}>
                  Escaneo TCP
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeTab, scanType === 'udp' && styles.typeTabActive, scanning && { opacity: 0.6 }]}
                disabled={scanning}
                onPress={() => {
                  microInteractions.vibrate();
                  setScanType('udp');
                  setDiscoveredCameras([]);
                }}
              >
                <FontAwesome5 name="satellite-dish" size={11} color={scanType === 'udp' ? '#ffffff' : COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.typeTabText, scanType === 'udp' && styles.typeTabTextActive]}>
                  UDP (A9/V720)
                </Text>
              </TouchableOpacity>
            </View>

            {scanType === 'tcp' && (
              <>
                {/* Subnet Input */}
                <View style={styles.subnetRow}>
                  <View style={styles.subnetInputContainer}>
                    <Text style={styles.label}>Subred Local</Text>
                    <TextInput
                      style={styles.input}
                      value={subnet}
                      onChangeText={setSubnet}
                      placeholder="Ej. 192.168.1"
                      placeholderTextColor={COLORS.textMuted}
                      editable={!scanning}
                    />
                  </View>
                  <View style={styles.subnetRangeBadge}>
                    <Text style={styles.subnetRangeText}>Rango: .1 a .254</Text>
                  </View>
                </View>

                {/* Ports selection list */}
                <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Puertos a Verificar</Text>
                <View style={styles.portsGrid}>
                  {portsConfig.map((port) => (
                    <TouchableOpacity
                      key={port.id}
                      style={[styles.portChip, port.selected && styles.portChipActive, scanning && { opacity: 0.6 }]}
                      onPress={() => !scanning && togglePortSelection(port.id)}
                      activeOpacity={0.8}
                      disabled={scanning}
                    >
                      <Text style={[styles.portChipText, port.selected && styles.portChipTextActive]}>
                        {port.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {scanType === 'udp' && (
              <View style={styles.udpNoticeCard}>
                <FontAwesome5 name="info-circle" size={14} color={COLORS.accent} style={{ marginRight: SPACING.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.udpNoticeTitle}>Búsqueda UDP Broadcast</Text>
                  <Text style={styles.udpNoticeText}>
                    Las cámaras A9/V720 se localizan enviando un paquete broadcast en el puerto 32108.
                  </Text>
                </View>
              </View>
            )}

            {/* Progress overlay */}
            <ScanProgress progress={scanProgress} scanning={scanning} />

            {/* Action buttons */}
            <TouchableOpacity
              style={[styles.scanBtn, scanning && styles.scanBtnCancel]}
              onPress={handleStartScan}
              activeOpacity={0.8}
            >
              {scanning ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.scanBtnText}>Cancelar Búsqueda</Text>
                </>
              ) : (
                <>
                  <FontAwesome5 name="search" size={14} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.scanBtnText}>Iniciar Escaneo de Red</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Found header */}
            {discoveredCameras.length > 0 && (
              <Text style={[styles.sectionTitle, { marginTop: SPACING.lg, marginBottom: SPACING.sm }]}>
                Cámaras Encontradas ({discoveredCameras.length})
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.discoveredItem}>
            <View style={styles.discoveredIconWrapper}>
              <FontAwesome5
                name={item.type === 'onvif' ? 'broadcast-tower' : 'video'}
                size={20}
                color={COLORS.accent}
              />
            </View>
            
            <View style={styles.discoveredDetails}>
              <Text style={styles.discoveredName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.discoveredIp}>
                IP: {item.ip} | Puerto: {item.port}
              </Text>
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>{item.brand.toUpperCase()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleAddDiscovered(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => {
          if (scanning) return null;
          return (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="satellite-dish" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Escaneo de Red Local</Text>
              <Text style={styles.emptySubtitle}>
                Presiona el botón para barrer la subred local buscando cámaras IP y servicios de streaming activos.
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
  subnetRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  subnetInputContainer: {
    flex: 1,
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
  subnetRangeBadge: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: SIZES.radiusSm,
    height: 30,
    justifyContent: 'center',
  },
  subnetRangeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  portsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
  },
  portChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusRound,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  portChipActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  portChipText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  portChipTextActive: {
    color: COLORS.accent,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    height: 50,
    borderRadius: SIZES.radiusRound,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },
  scanBtnCancel: {
    backgroundColor: COLORS.offline,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  
  // Discovered items
  discoveredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  discoveredIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  discoveredDetails: {
    flex: 1,
  },
  discoveredName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  discoveredIp: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  brandBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  brandText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  addBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: SIZES.radiusRound,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scanTypeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: 4,
    marginBottom: SPACING.md,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
  },
  typeTabActive: {
    backgroundColor: COLORS.accent,
  },
  typeTabText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
  },
  typeTabTextActive: {
    color: '#ffffff',
  },
  udpNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  udpNoticeTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  udpNoticeText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
});

export default ScanScreen;
