// ─────────────────────────────────────────────────────────────────────────────
// MapPickerScreen — full-screen map to drop/drag a pin and confirm location
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';
import { getAddressFromCoords } from '../services/locationService';

const DEFAULT_DELTA = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

export default function MapPickerScreen({ route, navigation }) {
  const { initialLat = 20.5937, initialLng = 78.9629 } = route.params ?? {};

  const mapRef = useRef(null);
  const [pin,     setPin]     = useState({ latitude: initialLat, longitude: initialLng });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Reverse-geocode whenever the pin moves
  const reverseGeocode = async (lat, lng) => {
    setLoading(true);
    setAddress('');
    try {
      const addr = await getAddressFromCoords(lat, lng);
      setAddress(addr);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reverseGeocode(pin.latitude, pin.longitude);
  }, []);

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleMarkerDrag = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  };

  const handleMarkerDragEnd = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleConfirm = () => {
    navigation.navigate('Report', {
      // Navigate back and pass selected coords via params
      selectedLat: pin.latitude,
      selectedLng: pin.longitude,
    });
  };

  const centerToPin = () => {
    mapRef.current?.animateToRegion({
      latitude:  pin.latitude,
      longitude: pin.longitude,
      ...DEFAULT_DELTA,
    }, 400);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude:  pin.latitude,
          longitude: pin.longitude,
          ...DEFAULT_DELTA,
        }}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        <Marker
          coordinate={pin}
          draggable
          onDrag={handleMarkerDrag}
          onDragEnd={handleMarkerDragEnd}
          pinColor={COLORS.primary}
        />
      </MapView>

      {/* ── Tip banner ── */}
      <View style={styles.tipBanner}>
        <Feather name="move" size={13} color={COLORS.primaryLight} />
        <Text style={styles.tipText}>Tap or drag the pin to pick a location</Text>
      </View>

      {/* ── Re-center button ── */}
      <TouchableOpacity style={styles.centerBtn} onPress={centerToPin} activeOpacity={0.85}>
        <Feather name="crosshair" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {/* ── Bottom card ── */}
      <View style={styles.card}>
        {/* Address row */}
        <View style={styles.addressRow}>
          <View style={styles.pinIconWrap}>
            <Feather name="map-pin" size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            {loading
              ? <View style={styles.addressLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.addressLoadingText}>Fetching address…</Text>
                </View>
              : <Text style={styles.addressText} numberOfLines={2}>{address || '—'}</Text>
            }
          </View>
        </View>

        {/* Coordinate display */}
        <View style={styles.coordRow}>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Latitude</Text>
            <Text style={styles.coordVal}>{pin.latitude.toFixed(6)}</Text>
          </View>
          <View style={styles.coordDivider} />
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Longitude</Text>
            <Text style={styles.coordVal}>{pin.longitude.toFixed(6)}</Text>
          </View>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.confirmBtnText}>Use This Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.bg },
  map:   { flex: 1 },

  // Tip banner
  tipBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(3,7,18,0.82)',
    borderWidth: 1, borderColor: COLORS.borderLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  tipText: { fontSize: FONTS.xs, color: COLORS.text, fontWeight: '500' },

  // Re-center
  centerBtn: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 260,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.card,
  },

  // Bottom card
  card: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, gap: SPACING.md,
    ...SHADOWS.card,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  pinIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  addressLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressLoadingText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  addressText: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.text, lineHeight: 20 },

  // Coords
  coordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  coordBox:     { flex: 1, padding: SPACING.md, alignItems: 'center' },
  coordDivider: { width: 1, height: '100%', backgroundColor: COLORS.border },
  coordLabel:   { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 3 },
  coordVal:     { fontSize: FONTS.md, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },

  // Confirm
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingVertical: 15,
    ...SHADOWS.primary,
  },
  confirmBtnText: { fontSize: FONTS.md, fontWeight: '800', color: '#fff' },
});
