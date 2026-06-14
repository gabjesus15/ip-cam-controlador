import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  useWindowDimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, TYPOGRAPHY } from '../theme';
import useCameraStore from '../store/cameraStore';
import useMicroInteractions from '../hooks/useMicroInteractions';
import CameraCard from '../components/CameraCard';
import EmptyState from '../components/EmptyState';

export const CameraGridScreen = ({ navigation }) => {
  // Global State
  const cameras = useCameraStore((state) => state.cameras);
  const checkAllStatuses = useCameraStore((state) => state.checkAllStatuses);

  // Hooks
  const microInteractions = useMicroInteractions();
  const { width } = useWindowDimensions();

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'online' | 'offline'
  const [refreshing, setRefreshing] = useState(false);
  const [viewableItems, setViewableItems] = useState({});

  // Track currently visible items to optimize snapshot fetching
  const onViewableItemsChanged = useRef(({ viewableItems: visible }) => {
    const visibleMap = {};
    visible.forEach((v) => {
      if (v.item && v.item.id) {
        visibleMap[v.item.id] = true;
      }
    });
    setViewableItems(visibleMap);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10, // Consider visible if at least 10% is on screen
  }).current;

  // Dynamic Column calculation
  const numColumns = useMemo(() => {
    if (width > 1024) return 4;
    if (width > 768) return 3;
    return 2;
  }, [width]);

  const handleRefresh = async () => {
    setRefreshing(true);
    microInteractions.vibrate();
    await checkAllStatuses();
    setRefreshing(false);
  };

  // Filtered cameras list
  const filteredCameras = useMemo(() => {
    return cameras.filter((camera) => {
      const matchesSearch = camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.ip.includes(searchQuery);
      
      const matchesFilter = activeFilter === 'all' || 
        (activeFilter === 'online' && camera.status === 'online') ||
        (activeFilter === 'offline' && camera.status === 'offline');
        
      return matchesSearch && matchesFilter;
    });
  }, [cameras, searchQuery, activeFilter]);

  const handleFilterPress = (filter) => {
    microInteractions.vibrate();
    setActiveFilter(filter);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Search & Filter */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <FontAwesome5 name="search" size={14} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o IP..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome5 name="times-circle" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.chip, activeFilter === 'all' && styles.chipActive]}
          onPress={() => handleFilterPress('all')}
        >
          <Text style={[styles.chipText, activeFilter === 'all' && styles.chipTextActive]}>
            Todos ({cameras.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.chip, activeFilter === 'online' && styles.chipActive]}
          onPress={() => handleFilterPress('online')}
        >
          <Text style={[styles.chipText, activeFilter === 'online' && styles.chipTextActive]}>
            Online ({cameras.filter((c) => c.status === 'online').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, activeFilter === 'offline' && styles.chipActive]}
          onPress={() => handleFilterPress('offline')}
        >
          <Text style={[styles.chipText, activeFilter === 'offline' && styles.chipTextActive]}>
            Offline ({cameras.filter((c) => c.status === 'offline').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid List */}
      <FlatList
        data={filteredCameras}
        key={`${numColumns}_${filteredCameras.length}`} // Force redraw when layout changes
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.rowWrapper}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <CameraCard
            camera={item}
            variant="grid"
            isVisible={!!viewableItems[item.id]}
            onPress={() => navigation.navigate('CameraSingle', { camera: item })}
          />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="video-slash"
            title={searchQuery ? 'Sin resultados' : 'No hay cámaras'}
            subtitle={searchQuery ? 'Prueba escribiendo otro término de búsqueda.' : 'Las cámaras agregadas aparecerán en esta cuadrícula.'}
            actionText={searchQuery ? 'Borrar búsqueda' : 'Escanear Red'}
            onAction={searchQuery ? () => setSearchQuery('') : () => navigation.navigate('Scan')}
          />
        )}
        contentContainerStyle={styles.gridContent}
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
  searchBarContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: SIZES.radiusRound,
    marginRight: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  gridContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  rowWrapper: {
    justifyContent: 'space-between',
  },
});

export default CameraGridScreen;
