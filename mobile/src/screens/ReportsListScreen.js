// ─────────────────────────────────────────────────────────────────────────────
// ReportsListScreen — Premium redesign with confidence bar + status accent
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  StatusBar, Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchReports } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, STATUS_COLORS } from '../theme';

// ── Confidence progress bar ───────────────────────────────────────────────────
function ConfidenceBar({ value = 0 }) {
  const pct = Math.min(1, Math.max(0, value));
  const color = pct >= 0.75 ? COLORS.success : pct >= 0.5 ? COLORS.warning : COLORS.danger;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${(pct * 100).toFixed(0)}%`, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
});

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ item }) {
  const cfg  = STATUS_COLORS[item.status] || STATUS_COLORS.red;
  const date = new Date(item.created_at || item.timestamp);
  const conf = parseFloat(item.ai_confidence) || 0;

  return (
    <View style={[card.container, { borderLeftColor: cfg.bar }]}>

      {/* Header row */}
      <View style={card.header}>
        <Text style={card.id}>Report #{item.report_id}</Text>
        <View style={[card.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Text style={[card.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Date/time */}
      <Text style={card.date}>
        {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {/* GPS */}
      <View style={card.row}>
        <Feather name="map-pin" size={11} color={COLORS.primary} />
        <Text style={card.gps}>
          {parseFloat(item.latitude).toFixed(5)},  {parseFloat(item.longitude).toFixed(5)}
        </Text>
      </View>

      {/* Divider */}
      <View style={card.divider} />

      {/* AI result */}
      {item.defect_type ? (
        <View>
          <View style={card.aiRow}>
            <MaterialCommunityIcons name="brain" size={14} color={COLORS.primary} />
            <Text style={card.defectType}>{item.defect_type}</Text>
            <Text style={card.confText}>{(conf * 100).toFixed(0)}%</Text>
          </View>
          <ConfidenceBar value={conf} />
        </View>
      ) : item.ai_confidence !== null && item.ai_confidence !== undefined ? (
        // AI ran but found no defect
        <View style={card.aiPending}>
          <MaterialCommunityIcons name="check-circle-outline" size={14} color={COLORS.success} />
          <Text style={[card.pendingText, { color: COLORS.success }]}>No defect detected ✓</Text>
        </View>
      ) : (
        // AI hasn't processed yet
        <View style={card.aiPending}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={card.pendingText}>AI analysis pending…</Text>
        </View>
      )}

      {/* Description */}
      {item.description ? (
        <Text style={card.desc} numberOfLines={2}>{item.description}</Text>
      ) : null}
    </View>
  );
}
const card = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 3, gap: 8,
  },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  id:        { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  badgeText: { fontSize: FONTS.xs, fontWeight: '700' },
  date:      { fontSize: FONTS.xs, color: COLORS.textMuted },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gps:       { fontSize: FONTS.xs, color: COLORS.textSub, fontFamily: 'monospace' },
  divider:   { height: 1, backgroundColor: COLORS.border },
  aiRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  defectType:{ flex: 1, fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  confText:  { fontSize: FONTS.sm, fontWeight: '800', color: COLORS.primary },
  aiPending: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingText:{ fontSize: FONTS.xs, color: COLORS.textMuted },
  desc:      { fontSize: FONTS.xs, color: COLORS.textSub, fontStyle: 'italic' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
const FILTERS = [
  { key: null,     label: 'All',    icon: 'layers'       },
  { key: 'red',    label: 'Open',   icon: 'alert-circle' },
  { key: 'orange', label: 'Active', icon: 'clock'        },
  { key: 'green',  label: 'Done',   icon: 'check-circle' },
];

export default function ReportsListScreen({ navigation }) {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await fetchReports({ status: filter, limit: 100 });
      setReports(data.reports || []);
    } catch (err) {
      Alert.alert('Failed to load', err.message);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, [filter]));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.chip, filter === f.key && styles.chipOn]}
            onPress={() => setFilter(f.key)}
          >
            <Feather name={f.icon} size={11} color={filter === f.key ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadText}>Loading…</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyWrap}>
            <Feather name="clipboard" size={38} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Reports</Text>
          <Text style={styles.emptySub}>Submit your first road defect to get started.</Text>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => navigation.navigate('Home', { screen: 'Capture' })}
          >
            <Feather name="camera" size={15} color="#fff" />
            <Text style={styles.captureBtnText}>Capture Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => String(r.report_id)}
          renderItem={({ item }) => <ReportCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <Text style={styles.count}>{reports.length} report{reports.length !== 1 ? 's' : ''}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  filtersRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipOn:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:    { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600' },
  chipTextOn:  { color: '#fff' },

  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadText: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: SPACING.md },
  emptyWrap: {
    width: 80, height: 80, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySub:   { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
  captureBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl, paddingVertical: 12,
  },
  captureBtnText: { fontSize: FONTS.md, fontWeight: '700', color: '#fff' },

  list:  { padding: SPACING.lg, gap: SPACING.sm },
  count: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: 4 },
});
