// ─────────────────────────────────────────────────────────────────────────────
// ReportDetailScreen — Detailed view with editable description & AI results
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchReport, updateReport, BASE_URL } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, STATUS_COLORS } from '../theme';

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

function QualityScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  
  let color = COLORS.success;
  if (score <= 3)      color = COLORS.danger;
  else if (score <= 6) color = COLORS.warning;

  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreLabel, { color }]}>Road Quality</Text>
      <View style={styles.scoreValueRow}>
        <Text style={[styles.scoreValue, { color }]}>{parseFloat(score).toFixed(1)}</Text>
        <Text style={[styles.scoreMax, { color }]}>/10</Text>
      </View>
    </View>
  );
}

export default function ReportDetailScreen({ route, navigation }) {
  const { reportId } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchReport(reportId);
      setReport(data);
      setDescription(data.description || '');
      
      // Start polling if AI analysis is pending
      if (!data.defect_type && data.ai_confidence === null) {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load report details');
      navigation.goBack();
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => clearInterval(pollRef.current);
  }, [reportId]);

  useEffect(() => {
    if (!polling) {
      clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const updated = await fetchReport(reportId);
        if (updated.defect_type || updated.ai_confidence !== null) {
          setReport(updated);
          setPolling(false);
          clearInterval(pollRef.current);
        }
      } catch (err) {}
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [polling]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateReport(reportId, { description });
      setReport({ ...report, description });
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update description');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading report details…</Text>
      </View>
    );
  }

  const date = new Date(report.captured_at || report.created_at || report.timestamp);
  const conf = parseFloat(report.ai_confidence) || 0;
  const sevCfg = SEVERITY_COLORS[report.severity] || null;
  const cfg = STATUS_COLORS[report.status] || STATUS_COLORS.red;

  // Use correct image URL (dynamically use the exported BASE_URL)
  // Note: report.image_url already starts with "/uploads/..."
  const imageUrl = `${BASE_URL}${report.image_url}`;
  console.log('[ReportDetail] Image URL:', imageUrl);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scroll}>
          
          {/* ── Image ── */}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.image} 
              resizeMode="cover" 
              onError={(e) => console.log('[ReportDetail] Image load error:', e.nativeEvent.error)}
            />
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
               <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.content}>
            
            {/* ── Header ── */}
            <View style={styles.header}>
              <View>
                <Text style={styles.reportId}>Report #{report.report_id}</Text>
                <Text style={styles.dateText}>
                  {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <QualityScoreBadge score={report.quality_score} />
            </View>

            {/* ── GPS Details ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="map-pin" size={16} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Location Details</Text>
              </View>
              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Latitude</Text>
                  <Text style={styles.gridVal}>{parseFloat(report.latitude).toFixed(6)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Longitude</Text>
                  <Text style={styles.gridVal}>{parseFloat(report.longitude).toFixed(6)}</Text>
                </View>
                {report.gps_accuracy && (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Accuracy</Text>
                    <Text style={[styles.gridVal, { color: report.gps_accuracy <= 20 ? COLORS.success : COLORS.warning }]}>
                      ±{Math.round(report.gps_accuracy)}m
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── AI Analysis ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="brain" size={18} color={COLORS.primary} />
                <Text style={styles.cardTitle}>AI Analysis</Text>
                {polling && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
              </View>

              {report.defect_type ? (
                <View>
                  <View style={styles.defectRow}>
                    <Text style={styles.defectName}>
                      {DEFECT_LABELS[report.defect_type] || report.defect_type}
                    </Text>
                    {sevCfg && (
                      <View style={[styles.severityBadge, { backgroundColor: sevCfg.bg, borderColor: sevCfg.border }]}>
                        <Text style={[styles.severityText, { color: sevCfg.text }]}>
                          {report.severity.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.confSection}>
                    <View style={styles.confHeader}>
                      <Text style={styles.confLabel}>Confidence</Text>
                      <Text style={styles.confVal}>{(conf * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.confTrack}>
                      <View style={[
                        styles.confFill,
                        { 
                          width: `${(conf * 100).toFixed(0)}%`,
                          backgroundColor: conf >= 0.75 ? COLORS.success : conf >= 0.5 ? COLORS.warning : COLORS.danger
                        }
                      ]} />
                    </View>
                  </View>
                </View>
              ) : polling ? (
                <Text style={styles.pendingText}>AI analysis is currently processing this report…</Text>
              ) : report.ai_confidence !== null ? (
                <View style={styles.noDefectRow}>
                   <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                   <Text style={styles.noDefectText}>No defects were detected in this image.</Text>
                </View>
              ) : (
                <Text style={styles.pendingText}>AI analysis pending…</Text>
              )}
            </View>

            {/* ── Description (Editable) ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="edit-3" size={16} color={COLORS.primary} />
                <Text style={styles.cardTitle}>User Description</Text>
                {!editing && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder="Describe the road issue…"
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity 
                      style={styles.cancelBtn} 
                      onPress={() => { setEditing(false); setDescription(report.description || ''); }}
                      disabled={saving}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.saveBtn} 
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={[styles.description, !report.description && { fontStyle: 'italic', color: COLORS.textMuted }]}>
                  {report.description || 'No description provided.'}
                </Text>
              )}
            </View>

          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: SPACING.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loadingText: { marginTop: SPACING.md, color: COLORS.textMuted, fontSize: FONTS.sm },

  imageContainer: { width: '100%', height: 260, position: 'relative' },
  image: { width: '100%', height: '100%' },
  statusBadge: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full,
    borderWidth: 1, ...SHADOWS.card,
  },
  statusText: { fontSize: FONTS.xs, fontWeight: '800' },

  content: { padding: SPACING.lg, marginTop: -RADIUS.lg, backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  reportId: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.text },
  dateText: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },

  scoreBadge: {
    borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', backgroundColor: COLORS.bgCard,
  },
  scoreLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue: { fontSize: 18, fontWeight: '900' },
  scoreMax: { fontSize: 10, fontWeight: '700', marginLeft: 1 },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  cardTitle: { flex: 1, fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  gridItem: { flex: 1, minWidth: '40%' },
  gridLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  gridVal: { fontSize: FONTS.sm, color: COLORS.text, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  defectRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  defectName: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.text, textTransform: 'capitalize' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1 },
  severityText: { fontSize: 9, fontWeight: '800' },

  confSection: { marginTop: 4 },
  confHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confLabel: { fontSize: FONTS.xs, color: COLORS.textMuted },
  confVal: { fontSize: FONTS.xs, fontWeight: '700', color: COLORS.primary },
  confTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 3 },

  pendingText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontStyle: 'italic' },
  noDefectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16,185,129,0.05)', padding: 10, borderRadius: RADIUS.md },
  noDefectText: { fontSize: FONTS.sm, color: COLORS.success, fontWeight: '500' },

  description: { fontSize: FONTS.md, color: COLORS.text, lineHeight: 22 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryGlow },
  editBtnText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: '700' },

  editContainer: { gap: SPACING.md },
  input: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.md,
    color: COLORS.text, minHeight: 100, textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '600' },
  saveBtn: { 
    backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, 
    borderRadius: RADIUS.md, minWidth: 100, alignItems: 'center', justifyContent: 'center' 
  },
  saveBtnText: { fontSize: FONTS.sm, color: '#fff', fontWeight: '700' },
});
