// ─────────────────────────────────────────────────────────────────────────────
// SubmissionResultScreen — success view with live AI result polling
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, ScrollView, ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchReport } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const SEVERITY_COLORS = {
  high:   { text: COLORS.danger, bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  medium: { text: COLORS.warning, bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  low:    { text: COLORS.success, bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
};

const DEFECT_LABELS = {
  pothole:            'Pothole',
  longitudinal_crack: 'Longitudinal Crack',
  transverse_crack:   'Transverse Crack',
  alligator_crack:    'Alligator Crack',
};

export default function SubmissionResultScreen({ route, navigation }) {
  const { report: initialReport } = route.params;
  const [report, setReport]       = useState(initialReport);
  const [polling, setPolling]     = useState(!initialReport.defect_type);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pollRef   = useRef(null);

  // ── Entry animation ──────────────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── AI result polling — every 3 s until defect_type is populated ─────────
  useEffect(() => {
    if (!polling) return;

    pollRef.current = setInterval(async () => {
      try {
        const updated = await fetchReport(report.report_id);
        if (updated.defect_type) {
          setReport(updated);
          setPolling(false);
          clearInterval(pollRef.current);
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 3000);

    // Stop polling after 2 minutes max
    const timeout = setTimeout(() => {
      clearInterval(pollRef.current);
      setPolling(false);
    }, 120_000);

    return () => {
      clearInterval(pollRef.current);
      clearTimeout(timeout);
    };
  }, [polling]);

  const severity = report.severity;
  const sevCfg   = SEVERITY_COLORS[severity] || null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Animated checkmark ── */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconRing}>
            <Feather name="check" size={52} color={COLORS.success} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>Report Submitted</Text>
          <Text style={styles.subtitle}>
            Your report has been received. AI analysis runs automatically in the background.
          </Text>

          {/* ── AI Result card ── */}
          {report.defect_type ? (
            <View style={styles.aiResultCard}>
              {/* Header */}
              <View style={styles.aiResultHeader}>
                <View style={styles.aiIconWrap}>
                  <MaterialCommunityIcons name="brain" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.aiResultTitle}>AI Detection Complete</Text>
                <View style={styles.doneBadge}>
                  <Feather name="check-circle" size={11} color={COLORS.success} />
                  <Text style={styles.doneBadgeText}>Done</Text>
                </View>
              </View>

              {/* Defect type */}
              <View style={styles.defectRow}>
                <Text style={styles.defectName}>
                  {DEFECT_LABELS[report.defect_type] || report.defect_type}
                </Text>
                {sevCfg && (
                  <View style={[styles.severityBadge, { backgroundColor: sevCfg.bg, borderColor: sevCfg.border }]}>
                    <Text style={[styles.severityText, { color: sevCfg.text }]}>
                      {severity.charAt(0).toUpperCase() + severity.slice(1)} severity
                    </Text>
                  </View>
                )}
              </View>

              {/* Confidence bar */}
              <View style={styles.confRow}>
                <Text style={styles.confLabel}>Confidence</Text>
                <Text style={styles.confVal}>{(report.ai_confidence * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.confTrack}>
                <View style={[
                  styles.confFill,
                  {
                    width: `${(report.ai_confidence * 100).toFixed(0)}%`,
                    backgroundColor: report.ai_confidence >= 0.75
                      ? COLORS.success : report.ai_confidence >= 0.5
                      ? COLORS.warning : COLORS.danger,
                  },
                ]} />
              </View>

              {/* RDD class label */}
              <Text style={styles.rawClass}>RDD class: {report.defect_type}</Text>
            </View>
          ) : (
            /* ── AI Pending card ── */
            <View style={styles.aiPendingCard}>
              <View style={styles.aiIconWrap}>
                <MaterialCommunityIcons name="brain" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiPendingTitle}>AI Analysis Running…</Text>
                <Text style={styles.aiPendingSub}>Results update automatically</Text>
              </View>
              {polling
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>
              }
            </View>
          )}

          {/* ── Report details ── */}
          <View style={styles.detailCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.accent} />
              <Text style={styles.sectionTitle}>Report Details</Text>
            </View>
            {[
              { icon: 'hash',    label: 'Report ID', val: `#${report.report_id}` },
              { icon: 'map-pin', label: 'Latitude',  val: parseFloat(report.latitude).toFixed(6) },
              { icon: 'map-pin', label: 'Longitude', val: parseFloat(report.longitude).toFixed(6) },
              { icon: 'clock',   label: 'Time',      val: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
              { icon: 'image',   label: 'Image',     val: 'Uploaded ✓' },
            ].map((d, i, arr) => (
              <View key={i} style={[styles.detailRow, i < arr.length - 1 && styles.rowBorder]}>
                <Feather name={d.icon} size={13} color={COLORS.primary} />
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailVal}>{d.val}</Text>
              </View>
            ))}
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Reports')} activeOpacity={0.85}>
              <Feather name="list" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>View All Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Capture')} activeOpacity={0.85}>
              <Feather name="camera" size={16} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Submit Another</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg },
  content: { alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xxl + 16, paddingBottom: SPACING.xxxl },

  iconWrap: { marginBottom: SPACING.xl },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 2, borderColor: 'rgba(16,185,129,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONTS.sm, color: COLORS.textSub, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg, paddingHorizontal: SPACING.sm },

  // AI result card
  aiResultCard: {
    width: '100%', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg, gap: SPACING.sm,
  },
  aiResultHeader:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiResultTitle:   { flex: 1, fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  doneBadgeText: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.success },
  defectRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  defectName:    { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.text, textTransform: 'capitalize', flex: 1 },
  severityBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  severityText:  { fontSize: FONTS.xs, fontWeight: '700' },
  confRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  confLabel:     { fontSize: FONTS.xs, color: COLORS.textMuted },
  confVal:       { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.primary },
  confTrack:     { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  confFill:      { height: '100%', borderRadius: 3 },
  rawClass:      { fontSize: FONTS.xs, color: COLORS.textMuted, fontFamily: 'monospace' },

  aiPendingCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primaryGlow, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  aiPendingTitle: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  aiPendingSub:   { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  pendingBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.warning },

  aiIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Detail card
  detailCard: {
    width: '100%', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  accent:        { width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.success },
  sectionTitle:  { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text },
  detailRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  rowBorder:     { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel:   { fontSize: FONTS.xs, color: COLORS.textMuted, width: 72 },
  detailVal:     { flex: 1, fontSize: FONTS.sm, color: COLORS.text, fontWeight: '600', textAlign: 'right' },

  // Actions
  actions:       { width: '100%', gap: SPACING.sm },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingVertical: 16, ...SHADOWS.primary,
  },
  primaryBtnText:  { fontSize: FONTS.md, fontWeight: '800', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryBtnText: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.primary },
});
