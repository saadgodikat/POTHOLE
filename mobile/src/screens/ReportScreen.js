import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { submitReport } from '../services/api';
import { getAddressFromCoords } from '../services/locationService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function ReportScreen({ route, navigation }) {
  const { imageUri, latitude: gpsLat, longitude: gpsLng } = route.params;

  const [description,  setDescription]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  // Selected location — starts as GPS, updated when user picks on map
  const [selLat,   setSelLat]   = useState(gpsLat);
  const [selLng,   setSelLng]   = useState(gpsLng);
  const [address,  setAddress]  = useState('');
  const [addrLoading, setAddrLoading] = useState(false);

  // Fetch address whenever selected location changes
  const loadAddress = async (lat, lng) => {
    if (!lat || !lng) return;
    setAddrLoading(true);
    try {
      const { Location } = await import('expo-location');
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const parts = [geo.street, geo.city, geo.region, geo.country].filter(Boolean);
      setAddress(parts.join(', '));
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setAddrLoading(false);
    }
  };

  // Called on mount and when user returns from MapPicker
  React.useEffect(() => {
    loadAddress(selLat, selLng);
  }, [selLat, selLng]);

  // Receive coordinates back from MapPickerScreen
  React.useEffect(() => {
    const selected = route.params?.selectedLat;
    if (selected !== undefined) {
      setSelLat(route.params.selectedLat);
      setSelLng(route.params.selectedLng);
    }
  }, [route.params?.selectedLat, route.params?.selectedLng]);

  const canSubmit = !isNaN(selLat) && !isNaN(selLng);

  const handleSubmit = async () => {
    if (!imageUri || !canSubmit) return;

    setSubmitting(true);
    try {
      const result = await submitReport({
        imageUri,
        latitude:    selLat,
        longitude:   selLng,
        description,
      });
      navigation.replace('Result', { report: result.report });
    } catch (err) {
      Alert.alert(
        'Submission Failed',
        err.message || 'Could not connect to server.\nCheck your network and API URL in api.js.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Image card ── */}
        <View style={styles.imageCard}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          <View style={styles.imageFooter}>
            <View style={styles.imagePill}>
              <Feather name="camera" size={11} color={COLORS.success} />
              <Text style={styles.imagePillText}>Captured</Text>
            </View>
            <View style={styles.imagePill}>
              <Feather name="check-circle" size={11} color={COLORS.success} />
              <Text style={styles.imagePillText}>Compressed</Text>
            </View>
          </View>
        </View>

        {/* ── Location section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          {/* Location card */}
          <View style={styles.locationCard}>
            {/* Address row */}
            <View style={styles.addressRow}>
              <View style={styles.locationIconWrap}>
                <Feather name="map-pin" size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                {addrLoading
                  ? <View style={styles.addrLoading}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.addrLoadingText}>Fetching address…</Text>
                    </View>
                  : <Text style={styles.addressText} numberOfLines={2}>
                      {address || 'Location not set'}
                    </Text>
                }
              </View>
            </View>

            {/* Coordinate row */}
            <View style={styles.coordRow}>
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordVal}>
                  {selLat ? selLat.toFixed(6) : '—'}
                </Text>
              </View>
              <View style={styles.coordDivider} />
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordVal}>
                  {selLng ? selLng.toFixed(6) : '—'}
                </Text>
              </View>
            </View>

            {/* Source tags */}
            <View style={styles.sourceTags}>
              {gpsLat === selLat && gpsLng === selLng ? (
                <View style={styles.sourceTag}>
                  <Feather name="navigation" size={10} color={COLORS.success} />
                  <Text style={[styles.sourceTagText, { color: COLORS.success }]}>Auto GPS</Text>
                </View>
              ) : (
                <View style={[styles.sourceTag, styles.sourceTagMap]}>
                  <Feather name="map" size={10} color={COLORS.primary} />
                  <Text style={[styles.sourceTagText, { color: COLORS.primary }]}>Map selected</Text>
                </View>
              )}
            </View>
          </View>

          {/* Map picker button */}
          <TouchableOpacity
            style={styles.mapPickerBtn}
            onPress={() => navigation.navigate('MapPicker', {
              initialLat: selLat,
              initialLng: selLng,
            })}
            activeOpacity={0.85}
          >
            <Feather name="map" size={16} color={COLORS.primary} />
            <Text style={styles.mapPickerBtnText}>Pick on Map</Text>
            <Feather name="chevron-right" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Description ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Description <Text style={styles.optional}>· optional</Text></Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. Large pothole near main junction..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
          <Text style={styles.charCount}>{description.length} / 300</Text>
        </View>

        {/* ── AI Notice ── */}
        <View style={styles.aiNotice}>
          <View style={styles.aiIconWrap}>
            <MaterialCommunityIcons name="brain" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.aiText}>
            YOLOv8 will automatically detect defect type and confidence after submission.
          </Text>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <View style={styles.submitInner}>
                <Text style={styles.submitText}>Submit Report</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </View>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retakeBtn}>
          <Feather name="camera" size={14} color={COLORS.textMuted} />
          <Text style={styles.retakeText}>Retake Photo</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  // Image
  imageCard: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg, ...SHADOWS.card },
  preview:   { width: '100%', height: 220 },
  imageFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 8, padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  imagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  imagePillText: { fontSize: FONTS.xs, color: '#fff', fontWeight: '600' },

  // Section
  section: { marginBottom: SPACING.lg },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:  { width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary },
  sectionTitle:   { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text },
  optional:       { fontWeight: '400', color: COLORS.textMuted, fontSize: FONTS.sm },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 3, gap: 2,
  },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  modeBtnActive:     { backgroundColor: COLORS.primary },
  modeBtnText:       { fontSize: FONTS.xs, fontWeight: '600', color: COLORS.textMuted },
  modeBtnTextActive: { color: '#fff' },

  // Location card
  locationCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  addressRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  locationIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  addrLoading:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrLoadingText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  addressText:     { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.text, lineHeight: 19 },
  coordRow: {
    flexDirection: 'row', backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  coordBox:    { flex: 1, padding: SPACING.md, alignItems: 'center' },
  coordDivider:{ width: 1, backgroundColor: COLORS.border },
  coordLabel:  { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 3 },
  coordVal:    { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  sourceTags:  { flexDirection: 'row' },
  sourceTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  sourceTagMap: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  sourceTagText: { fontSize: 10, fontWeight: '700' },

  // Map picker button
  mapPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  mapPickerBtnText: { flex: 1, fontSize: FONTS.sm, fontWeight: '700', color: COLORS.primary },

  // Description
  input: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text,
    fontSize: FONTS.sm, textAlignVertical: 'top', minHeight: 90,
  },
  charCount: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },

  // AI notice
  aiNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.xl,
  },
  aiIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiText: { flex: 1, fontSize: FONTS.xs, color: COLORS.textSub, lineHeight: 18, paddingTop: 2 },

  // Submit
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 16, alignItems: 'center',
    marginBottom: SPACING.md, ...SHADOWS.primary,
  },
  submitInner:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  submitText:   { fontSize: FONTS.md, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  retakeBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.md },
  retakeText:   { fontSize: FONTS.sm, color: COLORS.textMuted },
});
