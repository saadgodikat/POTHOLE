// ─────────────────────────────────────────────────────────────────────────────
// HeatmapScreen — Phase 4: Geospatial road-quality heatmap
// Uses react-native-maps with color-coded circles per grid cell.
// Score 0–10: 0 = critical damage (red), 10 = perfect road (green)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, ScrollView,
  Dimensions, Platform, RefreshControl,
} from 'react-native';
import MapView, { Circle, Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchHeatmap } from '../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const { width } = Dimensions.get('window');

// ── Quality → visual mapping ─────────────────────────────────────────────────
function qualityToColor(score) {
  // 0–3  = red (critical)
  // 3–5  = orange (poor)
  // 5–7  = yellow (fair)
  // 7–9  = light green (good)
  // 9–10 = green (excellent)
  if (score <= 2)       return { fill: 'rgba(239,68,68,0.55)',    stroke: '#EF4444' };  // red
  if (score <= 4)       return { fill: 'rgba(249,115,22,0.50)',   stroke: '#F97316' };  // orange
  if (score <= 6)       return { fill: 'rgba(234,179,8,0.48)',    stroke: '#EAB308' };  // yellow
  if (score <= 8)       return { fill: 'rgba(132,204,22,0.45)',   stroke: '#84CC16' };  // lime
  return                       { fill: 'rgba(16,185,129,0.45)',   stroke: '#10B981' };  // green
}

function qualityLabel(score) {
  if (score <= 2)  return 'Critical';
  if (score <= 4)  return 'Poor';
  if (score <= 6)  return 'Fair';
  if (score <= 8)  return 'Good';
  return 'Excellent';
}

function dangerEmoji(level) {
  return { critical: '🔴', moderate: '🟡', minor: '🟢', none: '⚪' }[level] ?? '⚪';
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { label: 'All',      value: null },
  { label: '🔴 Critical', value: 'critical' },
  { label: '🟡 Moderate', value: 'moderate' },
  { label: '🟢 Minor',    value: 'minor' },
];

const GRID_OPTIONS = [
  { label: '~250m', value: 0.0025 },
  { label: '~500m', value: 0.005 },
  { label: '~1km',  value: 0.01  },
];

const DEFAULT_REGION = {
  latitude:       28.6139,
  longitude:      77.2090,
  latitudeDelta:  0.2,
  longitudeDelta: 0.2,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function HeatmapScreen() {
  const mapRef                    = useRef(null);
  const [features,  setFeatures]  = useState([]);
  const [metadata,  setMetadata]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState(null);
  const [dangerFilter, setDangerFilter] = useState(null);
  const [gridSize,  setGridSize]  = useState(0.005);
  const [selected,  setSelected]  = useState(null);  // selected cell for callout card

  const loadHeatmap = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      const params = { grid_size: gridSize };
      if (dangerFilter) params.danger_level = dangerFilter;

      const data = await fetchHeatmap(params);
      setFeatures(data.features ?? []);
      setMetadata(data.metadata ?? null);

      // Auto-fit map to features if we have data
      if (data.features?.length > 0 && mapRef.current) {
        const lats = data.features.map(f => f.geometry.coordinates[1]);
        const lngs = data.features.map(f => f.geometry.coordinates[0]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        mapRef.current.fitToCoordinates(
          [
            { latitude: minLat, longitude: minLng },
            { latitude: maxLat, longitude: maxLng },
          ],
          { edgePadding: { top: 60, right: 40, bottom: 160, left: 40 }, animated: true }
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gridSize, dangerFilter]);

  useEffect(() => { loadHeatmap(); }, [loadHeatmap]);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    if (!features.length) return null;
    const scores      = features.map(f => f.properties.avg_quality);
    const avgScore    = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const minScore    = Math.min(...scores).toFixed(1);
    const critical    = features.filter(f => f.properties.dominant_danger === 'critical').length;
    const totalReports= features.reduce((a, f) => a + f.properties.count, 0);
    return { avgScore, minScore, critical, totalReports, cells: features.length };
  }, [features]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Road Heatmap</Text>
          <Text style={styles.headerSub}>
            {metadata
              ? `${metadata.total_cells} zones · ${metadata.total_reports_used} reports`
              : 'Geospatial road quality'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadHeatmap(true)}>
          <Feather name="refresh-cw" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Filter row ── */}
      <View style={styles.filterRow}>
        {/* Danger filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {FILTER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.chip, dangerFilter === opt.value && styles.chipActive]}
              onPress={() => setDangerFilter(opt.value)}
            >
              <Text style={[styles.chipText, dangerFilter === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.chipDivider} />
          {/* Grid size chips */}
          {GRID_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.chip, gridSize === opt.value && styles.chipActive]}
              onPress={() => setGridSize(opt.value)}
            >
              <Text style={[styles.chipText, gridSize === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Map ── */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={DEFAULT_REGION}
          mapType="standard"
          customMapStyle={darkMapStyle}
          onPress={() => setSelected(null)}
        >
          {features.map((feature, idx) => {
            const { lat, lng, avg_quality, count, dominant_danger, heat_intensity } = feature.properties;
            const colors   = qualityToColor(avg_quality);
            const radiusM  = Math.max(150, Math.min(600, heat_intensity * 500 + 100));

            return (
              <React.Fragment key={idx}>
                <Circle
                  center={{ latitude: lat, longitude: lng }}
                  radius={radiusM}
                  fillColor={colors.fill}
                  strokeColor={colors.stroke}
                  strokeWidth={1.5}
                  onPress={() => setSelected(feature.properties)}
                />
                {/* Show small dot marker for tap target when zoomed in */}
                <Marker
                  coordinate={{ latitude: lat, longitude: lng }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => setSelected(feature.properties)}
                >
                  <View style={[styles.dotMarker, { backgroundColor: colors.stroke }]} />
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Loading overlay */}
        {loading && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.mapLoadingText}>Loading heatmap…</Text>
          </View>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <View style={styles.mapError}>
            <Feather name="wifi-off" size={28} color={COLORS.textMuted} />
            <Text style={styles.mapErrorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadHeatmap()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!loading && !error && features.length === 0 && (
          <View style={styles.mapError}>
            <MaterialCommunityIcons name="map-marker-off" size={36} color={COLORS.textMuted} />
            <Text style={styles.mapErrorText}>No data yet</Text>
            <Text style={styles.mapErrorSub}>Submit reports to populate the heatmap</Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#EF4444', label: 'Critical (0–2)' },
            { color: '#F97316', label: 'Poor (2–4)' },
            { color: '#EAB308', label: 'Fair (4–6)' },
            { color: '#84CC16', label: 'Good (6–8)' },
            { color: '#10B981', label: 'Excellent (8–10)' },
          ].map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Selected cell card ── */}
      {selected && (
        <View style={styles.calloutCard}>
          <View style={styles.calloutHeader}>
            <View style={styles.calloutScoreWrap}>
              <Text style={[styles.calloutScore, { color: qualityToColor(selected.avg_quality).stroke }]}>
                {selected.avg_quality}
              </Text>
              <Text style={styles.calloutScoreMax}>/10</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.calloutLabel, { color: qualityToColor(selected.avg_quality).stroke }]}>
                {qualityLabel(selected.avg_quality)} Road
              </Text>
              <Text style={styles.calloutCoord}>
                {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Feather name="x" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.calloutStats}>
            <View style={styles.calloutStat}>
              <Text style={styles.calloutStatVal}>{selected.count}</Text>
              <Text style={styles.calloutStatKey}>Reports</Text>
            </View>
            <View style={styles.calloutStatDiv} />
            <View style={styles.calloutStat}>
              <Text style={styles.calloutStatVal}>{selected.min_quality}</Text>
              <Text style={styles.calloutStatKey}>Worst Score</Text>
            </View>
            <View style={styles.calloutStatDiv} />
            <View style={styles.calloutStat}>
              <Text style={styles.calloutStatVal}>
                {dangerEmoji(selected.dominant_danger)} {selected.dominant_danger ?? 'none'}
              </Text>
              <Text style={styles.calloutStatKey}>Dominant</Text>
            </View>
          </View>
          {/* Heat intensity bar */}
          <View style={styles.heatBarWrap}>
            <Text style={styles.heatBarLabel}>Heat Intensity</Text>
            <View style={styles.heatBarTrack}>
              <View style={[styles.heatBarFill, {
                width:           `${Math.round(selected.heat_intensity * 100)}%`,
                backgroundColor: qualityToColor(selected.avg_quality).stroke,
              }]} />
            </View>
            <Text style={styles.heatBarPct}>{Math.round(selected.heat_intensity * 100)}%</Text>
          </View>
        </View>
      )}

      {/* ── Summary strip (when no cell selected) ── */}
      {!selected && stats && !loading && (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryStat}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color={COLORS.primary} />
            <Text style={styles.summaryVal}>{stats.cells}</Text>
            <Text style={styles.summaryKey}>Zones</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryStat}>
            <Feather name="activity" size={14} color={COLORS.primary} />
            <Text style={styles.summaryVal}>{stats.avgScore}</Text>
            <Text style={styles.summaryKey}>Avg Score</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryStat}>
            <Feather name="alert-octagon" size={14} color={COLORS.danger} />
            <Text style={[styles.summaryVal, { color: COLORS.danger }]}>{stats.critical}</Text>
            <Text style={styles.summaryKey}>Critical Zones</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryStat}>
            <Feather name="file-text" size={14} color={COLORS.primary} />
            <Text style={styles.summaryVal}>{stats.totalReports}</Text>
            <Text style={styles.summaryKey}>Reports</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.bg,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.text },
  headerSub:   { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  refreshBtn:  {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Filter
  filterRow:   { paddingBottom: SPACING.sm, backgroundColor: COLORS.bg },
  filterChips: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
  },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  chipDivider:    { width: 1, height: 20, backgroundColor: COLORS.border, marginHorizontal: 4 },

  // Map
  mapWrap: { flex: 1, position: 'relative' },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.80)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  mapLoadingText: { color: COLORS.textMuted, fontSize: FONTS.sm },
  mapError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.90)',
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: SPACING.xl,
  },
  mapErrorText:  { color: COLORS.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
  mapErrorSub:   { color: COLORS.textMuted, fontSize: FONTS.xs, textAlign: 'center' },
  retryBtn:      { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  retryBtnText:  { color: '#fff', fontWeight: '700', fontSize: FONTS.sm },

  // Dot marker
  dotMarker: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#fff' },

  // Legend
  legend: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 5,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText:{ fontSize: 10, color: COLORS.textSub, fontWeight: '500' },

  // Selected cell callout
  calloutCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderTopWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  calloutScoreWrap: { flexDirection: 'row', alignItems: 'baseline' },
  calloutScore:    { fontSize: 36, fontWeight: '800' },
  calloutScoreMax: { fontSize: FONTS.sm, color: COLORS.textMuted, marginLeft: 2 },
  calloutLabel:    { fontSize: FONTS.md, fontWeight: '700' },
  calloutCoord:    { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  calloutStats:    { flexDirection: 'row', backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  calloutStat:     { flex: 1, alignItems: 'center', gap: 3 },
  calloutStatVal:  { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  calloutStatKey:  { fontSize: 10, color: COLORS.textMuted },
  calloutStatDiv:  { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },

  // Heat intensity bar
  heatBarWrap:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heatBarLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, width: 85 },
  heatBarTrack: { flex: 1, height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  heatBarFill:  { height: '100%', borderRadius: 3 },
  heatBarPct:   { fontSize: FONTS.xs, color: COLORS.textMuted, width: 36, textAlign: 'right' },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    borderTopWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  summaryStat: { flex: 1, alignItems: 'center', gap: 3 },
  summaryVal:  { fontSize: FONTS.md, fontWeight: '800', color: COLORS.text },
  summaryKey:  { fontSize: 10, color: COLORS.textMuted },
  summaryDiv:  { width: 1, height: 32, backgroundColor: COLORS.border },
});

// ── Dark map style ─────────────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry',        stylers: [{ color: '#0f1923' }] },
  { elementType: 'labels.text.fill',stylers: [{ color: '#6B7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#030712' }] },
  { featureType: 'road',            elementType: 'geometry',        stylers: [{ color: '#1F2937' }] },
  { featureType: 'road',            elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
  { featureType: 'road.highway',    elementType: 'geometry',        stylers: [{ color: '#374151' }] },
  { featureType: 'water',           elementType: 'geometry',        stylers: [{ color: '#0c1a2e' }] },
  { featureType: 'poi',             stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',         stylers: [{ visibility: 'off' }] },
];
