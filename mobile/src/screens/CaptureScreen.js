// ─────────────────────────────────────────────────────────────────────────────
// CaptureScreen — Simple, clean camera UI with GPS accuracy + shutter
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, Dimensions, SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather } from '@expo/vector-icons';
import { watchLocation } from '../services/locationService';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

const { width } = Dimensions.get('window');
const GUIDE_SIZE = width * 0.72;

export default function CaptureScreen({ navigation }) {
  const cameraRef  = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [location,      setLocation]      = useState(null);
  const [locationLabel, setLocationLabel] = useState('Acquiring GPS…');
  const [accuracy,      setAccuracy]      = useState(null);
  const [capturing,     setCapturing]     = useState(false);
  const watcherRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sub = await watchLocation(
          (loc) => {
            if (!mounted) return;
            setLocation(loc);
            setAccuracy(loc.accuracy);
            setLocationLabel(`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
          },
          () => setLocationLabel('GPS unavailable'),
        );
        watcherRef.current = sub;
      } catch {
        setLocationLabel('GPS unavailable');
      }
    })();
    return () => {
      mounted = false;
      if (watcherRef.current) {
        watcherRef.current.then?.((s) => s?.remove()).catch(() => {});
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
      );
      navigation.navigate('Report', {
        imageUri:  compressed.uri,
        latitude:  location?.latitude  || 0,
        longitude: location?.longitude || 0,
        accuracy:  accuracy ?? null,
      });
    } catch (err) {
      Alert.alert('Capture Failed', err.message);
    } finally {
      setCapturing(false);
    }
  };

  // ── Permission loading ───────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // ── Permission denied ────────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.permIcon}>
          <Feather name="camera-off" size={32} color={COLORS.textMuted} />
        </View>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>Allow camera access to capture road defects</Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera view ──────────────────────────────────────────────────────────────
  const gpsGood = accuracy !== null && accuracy <= 20;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* ── Top bar: back + GPS ── */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.gpsChip}>
          <View style={[styles.gpsDot, { backgroundColor: gpsGood ? '#34D399' : '#FBBF24' }]} />
          <Text style={styles.gpsText} numberOfLines={1}>{locationLabel}</Text>
          {accuracy !== null && (
            <Text style={styles.gpsAcc}>±{Math.round(accuracy)}m</Text>
          )}
        </View>
      </SafeAreaView>

      {/* ── Centre viewfinder guide ── */}
      <View style={styles.guideWrap} pointerEvents="none">
        <View style={styles.guide}>
          <Text style={styles.guideHint}>Aim at the road defect</Text>
        </View>
      </View>

      {/* ── Bottom controls ── */}
      <View style={styles.bottomBar}>
        <Text style={styles.hintText}>Tap the button to capture</Text>

        <View style={styles.controls}>
          {/* Back placeholder — keeps shutter centred */}
          <View style={styles.sideSlot} />

          {/* Shutter */}
          <TouchableOpacity
            style={[styles.shutterRing, capturing && styles.shutterRingActive]}
            onPress={handleCapture}
            disabled={capturing}
            activeOpacity={0.85}
          >
            <View style={styles.shutterInner}>
              {capturing
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : null}
            </View>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity style={styles.sideSlot} onPress={() => navigation.goBack()}>
            <Feather name="x" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },

  // Permission screens
  centered: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  permIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  permTitle:   { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  permSub:     { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 20 },
  grantBtn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  grantBtnText:{ fontSize: FONTS.md, fontWeight: '700', color: '#fff' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  gpsChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  gpsDot:  { width: 7, height: 7, borderRadius: 3.5 },
  gpsText: { flex: 1, fontSize: FONTS.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  gpsAcc:  { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  // Viewfinder guide
  guideWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  guide: {
    width: GUIDE_SIZE, height: GUIDE_SIZE * 0.7,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: SPACING.sm,
  },
  guideHint: {
    fontSize: FONTS.xs, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4,
  },

  // Bottom controls
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 40, paddingTop: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', gap: SPACING.lg,
  },
  hintText: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 },
  controls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: SPACING.xxl,
  },
  sideSlot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterRingActive: { opacity: 0.6 },
  shutterInner: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
});
