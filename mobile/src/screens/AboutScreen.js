// ─────────────────────────────────────────────────────────────────────────────
// AboutScreen — About the app + How to Use guide
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  StatusBar, Linking, TouchableOpacity, Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const STEPS = [
  {
    icon: 'camera',
    lib: 'fe',
    step: '01',
    title: 'Open Camera',
    desc: 'Tap "Report a Defect" on the Home screen to launch the camera.',
  },
  {
    icon: 'navigation',
    lib: 'fe',
    step: '02',
    title: 'GPS Auto-Tagged',
    desc: 'Your precise GPS coordinates are attached automatically. Wait for the green accuracy indicator.',
  },
  {
    icon: 'aperture',
    lib: 'fe',
    step: '03',
    title: 'Capture the Defect',
    desc: 'Point the camera at the pothole or road damage, then press the shutter button.',
  },
  {
    icon: 'edit-3',
    lib: 'fe',
    step: '04',
    title: 'Fill the Report',
    desc: 'Add a description and confirm the location on the map if needed, then submit.',
  },
  {
    icon: 'brain',
    lib: 'mci',
    step: '05',
    title: 'AI Analysis',
    desc: 'Our YOLOv8 AI model analyses the photo and classifies the defect type automatically.',
  },
  {
    icon: 'list',
    lib: 'fe',
    step: '06',
    title: 'Track Reports',
    desc: 'View all submitted reports in the Reports tab. Filter by status and check AI results.',
  },
];

const TECH = [
  { icon: 'brain',        lib: 'mci', label: 'YOLOv8 AI',       desc: 'Object detection model' },
  { icon: 'map-pin',      lib: 'fe',  label: 'High-Precision GPS', desc: 'Phase 1 enrichment' },
  { icon: 'activity',     lib: 'fe',  label: 'Quality Scoring',  desc: '0–10 road health scale' },
  { icon: 'map',          lib: 'fe',  label: 'Heatmap Engine',   desc: 'Geospatial visualization' },
];

function FeIcon({ name, lib, size, color }) {
  if (lib === 'mci') return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <Feather name={name} size={size} color={color} />;
}

export default function AboutScreen() {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
          </View>
          <Text style={styles.appName}>StreetIntel</Text>
          <Text style={styles.appVersion}>v1.0 · MVP</Text>
          <Text style={styles.appDesc}>
            An AI-powered road inspection platform that lets citizens report potholes and road
            defects. Reports are geotagged, analysed by YOLOv8, and visualised on a live heatmap.
          </Text>
        </View>

        {/* ── Tech stack ── */}
        <Text style={styles.sectionHead}>Under the Hood</Text>
        <View style={styles.techGrid}>
          {TECH.map((t, i) => (
            <View key={i} style={styles.techCard}>
              <View style={styles.techIconWrap}>
                <FeIcon name={t.icon} lib={t.lib} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.techLabel}>{t.label}</Text>
              <Text style={styles.techDesc}>{t.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── How to use ── */}
        <Text style={styles.sectionHead}>How to Use</Text>
        <View style={styles.stepsContainer}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              {/* Left: number + line */}
              <View style={styles.stepLeft}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNum}>{s.step}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              {/* Right: content */}
              <View style={styles.stepContent}>
                <View style={styles.stepIconRow}>
                  <FeIcon name={s.icon} lib={s.lib} size={16} color={COLORS.primary} />
                  <Text style={styles.stepTitle}>{s.title}</Text>
                </View>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Built for ── */}
        <View style={styles.builtCard}>
          <Feather name="award" size={18} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.builtTitle}>Built for Impact</Text>
            <Text style={styles.builtDesc}>
              StreetIntel empowers communities to report infrastructure issues, helping civic
              authorities prioritise road repairs using data-driven insights.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: SPACING.xl, paddingBottom: SPACING.xxxl, paddingHorizontal: SPACING.lg },

  // Hero
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  logoWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  logo:       { width: 44, height: 44, resizeMode: 'contain' },
  appName:    { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
  appVersion: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600', marginTop: 4, marginBottom: SPACING.md },
  appDesc:    { fontSize: FONTS.sm, color: COLORS.textSub, textAlign: 'center', lineHeight: 21 },

  // Section head
  sectionHead: {
    fontSize: FONTS.xs, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: SPACING.md, marginTop: SPACING.sm,
  },

  // Tech grid
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  techCard: {
    width: '47.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.card,
  },
  techIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  techLabel: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
  techDesc:  { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 16 },

  // Steps
  stepsContainer: { marginBottom: SPACING.xl },
  stepRow: { flexDirection: 'row', gap: SPACING.md, minHeight: 72 },
  stepLeft: { alignItems: 'center', width: 36 },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.primary,
  },
  stepNum:  { fontSize: FONTS.xs, fontWeight: '800', color: '#fff' },
  stepLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 4 },
  stepContent: { flex: 1, paddingBottom: SPACING.md, paddingTop: 6 },
  stepIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  stepTitle: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text },
  stepDesc:  { fontSize: FONTS.sm, color: COLORS.textSub, lineHeight: 20 },

  // Built for card
  builtCard: {
    flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
  },
  builtTitle: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  builtDesc:  { fontSize: FONTS.sm, color: COLORS.textSub, lineHeight: 20 },
});
