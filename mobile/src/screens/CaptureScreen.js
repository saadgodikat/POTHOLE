// ─────────────────────────────────────────────────────────────────────────────
// CaptureScreen — Premium camera UI with bracket corners + live GPS accuracy
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather } from '@expo/vector-icons';
import { watchLocation } from '../services/locationService';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

const { width, height } = Dimensions.get('window');
const BRACKET = 28;  // corner bracket size
const BRACKET_W = 3; // bracket stroke width

export default function CaptureScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation]       = useState(null);
  const [locationLabel, setLocationLabel] = useState('Acquiring GPS…');
  const [accuracy, setAccuracy]       = useState(null);
  const [capturing, setCapturing]     = useState(false);
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
            setLocationLabel(`${loc.latitude.toFixed(6)},  ${loc.longitude.toFixed(6)}`);
          },
          () => setLocationLabel('GPS unavailable')
        );
        watcherRef.current = sub;
      } catch {
        setLocationLabel('GPS unavailable');
      }
    })();

    return () => {
      mounted = false;
      // Clean up the watcher when the screen unmounts
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
        { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
      );
      navigation.navigate('Report', {
        imageUri: compressed.uri,
        latitude:  location?.latitude  || 0,
        longitude: location?.longitude || 0,
      });
    } catch (err) {
      Alert.alert('Capture Failed', err.message);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.permIconWrap}>
          <Feather name="camera-off" size={36} color={COLORS.textMuted} />
        </View>
        <Text style={styles.permTitle}>Camera Required</Text>
        <Text style={styles.permSub}>Enable camera access to capture road defects</Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">

        {/* Dimmed overlay (top) */}
        <View style={styles.dimTop} />

        {/* ── Bracket frame ── */}
        <View style={styles.frameArea}>
          {/* Top-left */}
          <View style={[styles.corner, styles.cornerTL]} />
          {/* Top-right */}
          <View style={[styles.corner, styles.cornerTR]} />
          {/* Bottom-left */}
          <View style={[styles.corner, styles.cornerBL]} />
          {/* Bottom-right */}
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Centre crosshair */}
          <View style={styles.crossH} />
          <View style={styles.crossV} />

          <Text style={styles.frameHint}>Align defect within frame</Text>
        </View>

        {/* Dimmed overlay (bottom) */}
        <View style={styles.dimBottom}>

          {/* GPS bar */}
          <View style={styles.gpsBar}>
            <Feather
              name="navigation"
              size={11}
              color={accuracy !== null && accuracy <= 20 ? COLORS.success : '#FBBF24'}
            />
            <Text style={styles.gpsText}>{locationLabel}</Text>
            {accuracy !== null && (
              <View style={styles.accuracyPill}>
                <Text style={styles.accuracyText}>±{Math.round(accuracy)}m</Text>
              </View>
            )}
          </View>

          {/* Capture controls */}
          <View style={styles.controls}>
            {/* Back */}
            <TouchableOpacity style={styles.sideBtn} onPress={() => navigation.goBack()}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>

            {/* Shutter */}
            <TouchableOpacity
              style={[styles.shutterRing, capturing && { opacity: 0.6 }]}
              onPress={handleCapture}
              disabled={capturing}
              activeOpacity={0.8}
            >
              <View style={styles.shutterBtn}>
                {capturing
                  ? <ActivityIndicator color={COLORS.primary} size="small" />
                  : null
                }
              </View>
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.sideBtn} />
          </View>

        </View>
      </CameraView>
    </View>
  );
}

const FRAME_W = width * 0.78;
const FRAME_H = FRAME_W * 0.72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  permIconWrap: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  permTitle:  { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  permSub:    { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  grantBtn:   { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  grantBtnText:{ fontSize: FONTS.md, fontWeight: '700', color: '#fff' },

  dimTop: {
    height: '18%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  frameArea: {
    width: FRAME_W,
    height: FRAME_H,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bracket corners
  corner:    { position: 'absolute', width: BRACKET, height: BRACKET, borderColor: COLORS.primary },
  cornerTL:  { top: 0, left: 0,  borderTopWidth: BRACKET_W, borderLeftWidth: BRACKET_W,  borderTopLeftRadius: 4 },
  cornerTR:  { top: 0, right: 0, borderTopWidth: BRACKET_W, borderRightWidth: BRACKET_W, borderTopRightRadius: 4 },
  cornerBL:  { bottom: 0, left: 0,  borderBottomWidth: BRACKET_W, borderLeftWidth: BRACKET_W,  borderBottomLeftRadius: 4 },
  cornerBR:  { bottom: 0, right: 0, borderBottomWidth: BRACKET_W, borderRightWidth: BRACKET_W, borderBottomRightRadius: 4 },

  // Crosshair
  crossH: { width: 18, height: 1, backgroundColor: 'rgba(79,142,247,0.5)' },
  crossV: { position: 'absolute', width: 1, height: 18, backgroundColor: 'rgba(79,142,247,0.5)' },
  frameHint: {
    position: 'absolute', bottom: -26,
    fontSize: FONTS.xs, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5,
  },

  dimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: SPACING.xxl + 8,
    gap: SPACING.lg,
  },
  gpsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  gpsText: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  accuracyPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  accuracyText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  controls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xxl },
  sideBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  shutterRing: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shutterBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
});
