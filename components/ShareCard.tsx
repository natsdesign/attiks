import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND = '#C8F135';
const BG = '#0D1108';
const SURFACE = '#161D0F';
const WHITE = '#FFFFFF';
const BASE_W = 320;
const BASE_H = Math.round(BASE_W * 16 / 9); // 569

export interface ShareCardData {
  sessionType: string;      // ex: "PUSH · FORCE" ou "SÉANCE LIBRE"
  volumeTotal: number;      // kg
  durationMinutes: number;
  prInfo: { name: string; value: string } | null;  // ex: { name: "Développé couché", value: "100kg × 5" }
  weekStreak: number;       // séances ces 7 derniers jours
}

interface Props {
  variant: 1 | 2 | 3;
  data: ShareCardData;
  photoUri?: string;
  width: number;
}

// ─────────────────────────────────────────────────────────
// Composant racine — ref exposée pour react-native-view-shot
// ─────────────────────────────────────────────────────────
export const ShareCard = forwardRef<View, Props>(
  ({ variant, data, photoUri, width }, ref) => {
    const sc = width / BASE_W;
    const h916 = Math.round(BASE_H * sc);
    const { sessionType, volumeTotal, durationMinutes, prInfo, weekStreak } = data;

    // ── VARIANTE 3 — Minimal carré 1:1 ─────────────────
    if (variant === 3) {
      const pad = Math.round(width * 0.08);
      return (
        <View ref={ref} style={{ width, height: width, backgroundColor: BG, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: pad }}>
          <Text style={{ color: BRAND, fontWeight: '700', fontSize: Math.round(width * 0.032), letterSpacing: Math.round(width * 0.008), marginBottom: 4 }}>
            {sessionType}
          </Text>
          <Text style={{ color: WHITE, fontWeight: '900', fontStyle: 'italic', fontSize: Math.round(width * 0.155), lineHeight: Math.round(width * 0.148), letterSpacing: -2, textAlign: 'center', marginBottom: Math.round(width * 0.05) }}>
            {'SÉANCE\nTERMINÉE'}
          </Text>

          {prInfo && (
            <View style={[ss.prBadge, { borderRadius: Math.round(width * 0.025), padding: Math.round(width * 0.028), marginBottom: Math.round(width * 0.04) }]}>
              <Text style={[ss.prLabel, { fontSize: Math.round(width * 0.026) }]}>NOUVEAU PR</Text>
              <Text style={[ss.prName, { fontSize: Math.round(width * 0.035) }]}>{prInfo.name}</Text>
              <Text style={[ss.prVal, { fontSize: Math.round(width * 0.062) }]}>{prInfo.value}</Text>
            </View>
          )}

          <View style={ss.statsRow}>
            {statItems(volumeTotal, durationMinutes, weekStreak).map(({ label, value }) => (
              <View key={label} style={ss.statItem}>
                <Text style={{ color: WHITE, fontWeight: '800', fontSize: Math.round(width * 0.062), letterSpacing: -0.5 }}>{value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.48)', fontWeight: '600', fontSize: Math.round(width * 0.026), letterSpacing: 1.2, marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ color: BRAND, fontWeight: '900', fontSize: Math.round(width * 0.05), letterSpacing: Math.round(width * 0.012), marginTop: Math.round(width * 0.055) }}>
            ATTIKS
          </Text>
        </View>
      );
    }

    // ── Bloc contenu partagé V1 / V2 ───────────────────
    const Content = () => (
      <>
        <Text style={{ color: BRAND, fontWeight: '700', fontSize: 11 * sc, letterSpacing: 2.5 * sc, marginBottom: 3 * sc }}>
          {sessionType}
        </Text>
        <Text style={{ color: WHITE, fontWeight: '900', fontStyle: 'italic', fontSize: 50 * sc, lineHeight: 48 * sc, letterSpacing: -2, marginBottom: 18 * sc }}>
          {'SÉANCE\nTERMINÉE'}
        </Text>

        {prInfo && (
          <View style={[ss.prBadge, { borderRadius: 8 * sc, padding: 10 * sc, marginBottom: 14 * sc }]}>
            <Text style={[ss.prLabel, { fontSize: 9 * sc }]}>NOUVEAU PR</Text>
            <Text style={[ss.prName, { fontSize: 13 * sc }]}>{prInfo.name}</Text>
            <Text style={[ss.prVal, { fontSize: 22 * sc }]}>{prInfo.value}</Text>
          </View>
        )}

        <View style={ss.statsRow}>
          {statItems(volumeTotal, durationMinutes, weekStreak).map(({ label, value }) => (
            <View key={label} style={ss.statItem}>
              <Text style={{ color: WHITE, fontWeight: '800', fontSize: 20 * sc, letterSpacing: -0.5 }}>{value}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.48)', fontWeight: '600', fontSize: 9 * sc, letterSpacing: 1.5, marginTop: 2 * sc }}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={[ss.footerRow, { marginTop: 16 * sc }]}>
          <Text style={{ color: BRAND, fontWeight: '900', fontSize: 17 * sc, letterSpacing: 3 * sc }}>ATTIKS</Text>
          <Text style={{ color: 'rgba(200,241,53,0.6)', fontWeight: '600', fontSize: 11 * sc }}>#ATTIKSARMY</Text>
        </View>
      </>
    );

    // ── VARIANTE 2 — Carte flottante ─────────────────
    if (variant === 2) {
      return (
        <View ref={ref} style={{ width, height: h916, backgroundColor: BG, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: width - 32 * sc, backgroundColor: SURFACE, borderRadius: 20 * sc, padding: 22 * sc, overflow: 'hidden' }}>
            <Content />
          </View>
        </View>
      );
    }

    // ── VARIANTE 1 — Photo plein écran ───────────────
    const gradH = Math.round(h916 * 0.62);
    const botPad = 24 * sc;

    return (
      <View ref={ref} style={{ width, height: h916, backgroundColor: '#0A1606', overflow: 'hidden' }}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0C1A0A' }]} />
        )}

        {/* Filtre Attiks : luminosité -15%, teinte froide */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,35,70,0.12)' }]} />

        {/* Dégradé bas */}
        <LinearGradient
          colors={['transparent', 'rgba(4,8,3,0.95)']}
          locations={[0.3, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: gradH }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Contenu positionné en bas */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: botPad, paddingBottom: botPad + 6 * sc }}>
          <Content />
        </View>
      </View>
    );
  }
);

// ─── Helpers ──────────────────────────────────────────────
function statItems(volume: number, duration: number, streak: number) {
  return [
    { label: 'VOLUME', value: `${Math.round(volume)}kg` },
    { label: 'DURÉE', value: `${duration}min` },
    { label: '7 JOURS', value: String(streak) },
  ];
}

const ss = StyleSheet.create({
  prBadge: {
    backgroundColor: BRAND,
    alignSelf: 'flex-start',
  },
  prLabel: {
    color: '#0D1108',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  prName: {
    color: '#0D1108',
    fontWeight: '700',
  },
  prVal: {
    color: '#0D1108',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
