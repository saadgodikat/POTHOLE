// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen — Premium redesign
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Dimensions, Image
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* Glow ring behind logo */}
          <View style={styles.glowOuter}>
            <View style={styles.glowInner}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
            </View>
          </View>
          <Text style={styles.appName}>RoadWatch</Text>
          <Text style={styles.tagline}>AI-Powered Road Inspection Platform</Text>

          {/* Pill tag */}
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Live · Phase 1 + 2 MVP</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {[
            { icon: 'brain',       lib: 'mci', label: 'YOLOv8 AI'  },
            { icon: 'navigation',  lib: 'fe',  label: 'GPS Tagged'  },
            { icon: 'shield',      lib: 'fe',  label: 'Auto Detect' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, i === 1 && styles.statCardCenter]}>
              {s.lib === 'mci'
                ? <MaterialCommunityIcons name={s.icon} size={22} color={COLORS.primary} />
                : <Feather name={s.icon} size={20} color={COLORS.primary} />
              }
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Primary CTA ── */}
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() => navigation.navigate('Capture')}
          activeOpacity={0.88}
        >
          <View style={styles.ctaIconWrap}>
            <Feather name="camera" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Report a Defect</Text>
            <Text style={styles.ctaSub}>Capture · GPS tag · AI analyse</Text>
          </View>
          <View style={styles.ctaArrow}>
            <Feather name="arrow-right" size={18} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* ── Secondary CTA ── */}
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.88}
        >
          <View style={[styles.ctaIconWrap, styles.ctaIconWrapSec]}>
            <Feather name="list" size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitleSec}>View Reports</Text>
            <Text style={styles.ctaSubSec}>Browse all submitted defects</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* ── Info cards ── */}
        <Text style={styles.sectionHead}>How it works</Text>
        <View style={styles.infoGrid}>
          {[
            { icon: 'camera',  step: '01', title: 'Capture',  desc: 'Take a photo of the road defect' },
            { icon: 'map-pin', step: '02', title: 'Tag GPS',  desc: 'Coordinates are auto-attached'  },
            { icon: 'upload',  step: '03', title: 'Submit',   desc: 'Report is sent to the server'   },
            { icon: 'cpu',     step: '04', title: 'AI Scan',  desc: 'YOLOv8 detects defect type'     },
          ].map((c, i) => (
            <View key={i} style={styles.infoCard}>
              <Text style={styles.infoStep}>{c.step}</Text>
              <Feather name={c.icon} size={20} color={COLORS.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.infoTitle}>{c.title}</Text>
              <Text style={styles.infoDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: SPACING.xxl + 16, paddingBottom: SPACING.xxxl, paddingHorizontal: SPACING.lg },

  // Hero
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  glowOuter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  glowInner: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoImage: { width: 44, height: 44, resizeMode: 'contain' },
  appName: { fontSize: FONTS.xxxl, fontWeight: '800', color: COLORS.text, letterSpacing: -1.2 },
  tagline: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 5,
    marginTop: SPACING.md,
  },
  pillDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  pillText: { fontSize: FONTS.xs, color: COLORS.primaryLight, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: {
    flex: 1, alignItems: 'center', gap: 6,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statCardCenter: { borderColor: COLORS.borderLight, backgroundColor: 'rgba(139,92,246,0.07)' },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textSub, fontWeight: '500', textAlign: 'center' },

  // Primary CTA
  primaryCta: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.primary,
  },
  ctaIconWrap: {
    width: 52, height: 52, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaIconWrapSec: { backgroundColor: COLORS.primaryGlow },
  ctaTitle:    { fontSize: FONTS.md, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  ctaSub:      { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.68)', marginTop: 3 },
  ctaArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

  // Secondary CTA
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  ctaTitleSec: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text },
  ctaSubSec:   { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 3 },

  // How it works
  sectionHead: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.md, textTransform: 'uppercase' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  infoCard: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoStep:  { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: '800', marginBottom: 8 },
  infoTitle: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  infoDesc:  { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 16 },
});
