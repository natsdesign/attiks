import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

const BRAND  = '#C8F135';
const BG     = '#060D04';
const WHITE  = '#FFFFFF';

const BASE_W = 320;
const BASE_H = Math.round(BASE_W * 16 / 9); // 569

export interface ShareCardData {
  sessionType: string;
  volumeTotal: number;
  durationMinutes: number;
  prInfo: { name: string; value: string } | null;
  weekStreak: number;
}

interface Props {
  variant: 1 | 2 | 3;
  data: ShareCardData;
  photoUri?: string;
  width: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVol(kg: number): string {
  const v = Math.round(kg);
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')} T`;
  return `${v} KG`;
}

function fmtDuration(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, '0') : ''}`;
  return `${min} MIN`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PRBadge({ sc }: { sc: number }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5 * sc,
      backgroundColor: 'rgba(200,241,53,0.10)',
      borderWidth: 1, borderColor: 'rgba(200,241,53,0.40)',
      borderRadius: 99, paddingHorizontal: 10 * sc, paddingVertical: 5 * sc,
    }}>
      <View style={{ width: 5 * sc, height: 5 * sc, borderRadius: 99, backgroundColor: BRAND }} />
      <Text style={{ color: BRAND, fontWeight: '800', fontSize: 9 * sc, letterSpacing: 1.2 }}>
        RECORD
      </Text>
    </View>
  );
}

interface ContentProps {
  data: ShareCardData;
  sc: number;
  compact?: boolean;
}

// Parse "100kg × 5" → { weight: "100 KG", reps: "× 5" }
function parsePR(value: string): { weight: string; reps: string } {
  const m = value.match(/^([\d,.]+)\s*kg?\s*[×x]\s*(\d+)$/i);
  if (m) return { weight: `${m[1]} KG`, reps: `× ${m[2]}` };
  return { weight: value.toUpperCase(), reps: '' };
}

function CardContent({ data, sc, compact = false }: ContentProps) {
  const { sessionType, volumeTotal, durationMinutes, prInfo, weekStreak } = data;
  const pr = prInfo ? parsePR(prInfo.value) : null;

  return (
    <>
      {/* Session type label */}
      <Text style={{
        color: 'rgba(255,255,255,0.40)',
        fontSize: 9 * sc,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: compact ? 6 * sc : 8 * sc,
      }}>
        {prInfo ? sessionType : 'CE QUE TU AS SOULEVÉ'}
      </Text>

      {/* Hero — PR : deux lignes (poids + reps) / Volume : une ligne */}
      {pr ? (
        <View style={{ marginBottom: 4 * sc }}>
          <Text style={{
            color: WHITE,
            fontFamily: 'Anton_400Regular',
            fontSize: 68 * sc,
            letterSpacing: -1,
          }}>
            {pr.weight}
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'Anton_400Regular',
            fontSize: 28 * sc,
            letterSpacing: -0.5,
          }}>
            {pr.reps}
          </Text>
        </View>
      ) : (
        <Text style={{
          color: WHITE,
          fontFamily: 'Anton_400Regular',
          fontSize: 64 * sc,
          letterSpacing: -1,
          marginBottom: 4 * sc,
        }}>
          {fmtVol(volumeTotal)}
        </Text>
      )}

      {/* Hero sublabel */}
      <Text style={{
        color: prInfo ? BRAND : 'rgba(255,255,255,0.45)',
        fontSize: 10 * sc,
        fontWeight: '700',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginBottom: compact ? 12 * sc : 16 * sc,
      }}>
        {prInfo ? prInfo.name.toUpperCase() : 'VOLUME TOTAL'}
      </Text>

      {/* Divider */}
      <View style={{
        height: 0.5,
        backgroundColor: 'rgba(255,255,255,0.14)',
        marginBottom: compact ? 12 * sc : 14 * sc,
      }} />

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[
          { value: fmtVol(volumeTotal), label: 'VOLUME' },
          { value: fmtDuration(durationMinutes), label: 'DURÉE' },
          { value: String(weekStreak), label: 'SÉANCES · 7J' },
        ].map(({ value, label }, i, arr) => (
          <React.Fragment key={label}>
            <View style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === arr.length - 1 ? 'flex-end' : 'center' }}>
              <Text style={{
                color: WHITE,
                fontWeight: '800',
                fontSize: 14 * sc,
                letterSpacing: -0.3,
              }}>
                {value}
              </Text>
              <Text style={{
                color: 'rgba(255,255,255,0.38)',
                fontSize: 7 * sc,
                fontWeight: '700',
                letterSpacing: 1,
                marginTop: 2 * sc,
              }}>
                {label}
              </Text>
            </View>
            {i < arr.length - 1 && (
              <View style={{
                width: 0.5,
                height: 22 * sc,
                backgroundColor: 'rgba(255,255,255,0.12)',
                marginHorizontal: 6 * sc,
              }} />
            )}
          </React.Fragment>
        ))}
      </View>
    </>
  );
}

// ── Share Card ────────────────────────────────────────────────────────────────

export const ShareCard = forwardRef<View, Props>(
  ({ variant, data, photoUri, width }, ref) => {
    const sc    = width / BASE_W;
    const h916  = Math.round(BASE_H * sc);
    const pad   = 22 * sc;
    const topPad = 18 * sc;

    // ── VARIANTE 3 — Carré 1:1 typographique ─────────────
    if (variant === 3) {
      return (
        <View ref={ref} style={{
          width,
          height: width,
          backgroundColor: BG,
          overflow: 'hidden',
        }}>
          {/* Background gradient */}
          <LinearGradient
            colors={['#0A1508', '#060D04', '#040904']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Content */}
          <View style={{
            flex: 1,
            paddingHorizontal: pad,
            paddingVertical: pad * 0.9,
            justifyContent: 'space-between',
          }}>
            {/* Top: ATTIKS */}
            <Text style={{
              color: BRAND,
              fontWeight: '900',
              fontSize: 11 * sc,
              letterSpacing: 3.5 * sc,
            }}>
              ATTIKS
            </Text>

            {/* Middle: hero */}
            <View>
              <CardContent data={data} sc={sc} compact />
            </View>

            {/* Bottom: date */}
            <Text style={{
              color: 'rgba(255,255,255,0.22)',
              fontSize: 8 * sc,
              fontWeight: '600',
              letterSpacing: 1,
            }}>
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
            </Text>
          </View>
        </View>
      );
    }

    // ── VARIANTE 2 — Dark card 9:16 sans photo ───────────
    if (variant === 2) {
      return (
        <View ref={ref} style={{
          width,
          height: h916,
          backgroundColor: BG,
          overflow: 'hidden',
        }}>
          {/* Rich dark gradient bg */}
          <LinearGradient
            colors={['#111F0D', '#080F06', '#050A03', '#030603']}
            locations={[0, 0.28, 0.6, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Brand glow top-right — radial gradient SVG */}
          <View style={{ position: 'absolute', top: -60 * sc, right: -60 * sc, width: 240 * sc, height: 240 * sc }}>
            <Svg width={240 * sc} height={240 * sc}>
              <Defs>
                <RadialGradient id="glow2" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%"   stopColor={BRAND} stopOpacity="0.18" />
                  <Stop offset="55%"  stopColor={BRAND} stopOpacity="0.06" />
                  <Stop offset="100%" stopColor={BRAND} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={120 * sc} cy={120 * sc} rx={120 * sc} ry={120 * sc} fill="url(#glow2)" />
            </Svg>
          </View>

          {/* PR badge top-right */}
          {data.prInfo && (
            <View style={{ position: 'absolute', top: topPad, right: pad }}>
              <PRBadge sc={sc} />
            </View>
          )}

          {/* Content — aligned bottom */}
          <View style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            padding: pad,
            paddingBottom: pad * 1.2,
          }}>
            <CardContent data={data} sc={sc} />

            {/* Footer */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 18 * sc,
            }}>
              <Text style={{
                color: BRAND,
                fontWeight: '900',
                fontSize: 13 * sc,
                letterSpacing: 3.5 * sc,
              }}>
                ATTIKS
              </Text>
              <Text style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: 9 * sc,
                fontWeight: '600',
                letterSpacing: 0.5,
              }}>
                {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // ── VARIANTE 1 — Story 9:16 photo plein cadre ────────
    const gradStart = Math.round(h916 * 0.32);

    return (
      <View ref={ref} style={{
        width,
        height: h916,
        backgroundColor: '#050B03',
        overflow: 'hidden',
      }}>
        {/* Photo ou fond de substitution */}
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#0D1A0A', '#081208', '#060D04']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Overlay couleur subtil si photo */}
        {photoUri && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />
        )}

        {/* Gradient bas — large pour la lisibilité */}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(4,8,3,0.55)',
            'rgba(4,8,3,0.92)',
            'rgba(3,6,2,0.99)',
          ]}
          locations={[0, 0.35, 0.62, 1]}
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: h916 - gradStart,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Gradient léger en haut pour lisibilité du logo */}
        <LinearGradient
          colors={['rgba(3,6,2,0.55)', 'transparent']}
          locations={[0, 1]}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 80 * sc,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Top bar */}
        <View style={{
          position: 'absolute',
          top: topPad, left: pad, right: pad,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{
            color: WHITE,
            fontWeight: '900',
            fontSize: 12 * sc,
            letterSpacing: 3 * sc,
            opacity: 0.85,
          }}>
            ATTIKS
          </Text>
          {data.prInfo && <PRBadge sc={sc} />}
        </View>

        {/* Content bas */}
        <View style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          padding: pad,
          paddingBottom: pad * 1.4,
        }}>
          <CardContent data={data} sc={sc} />

          {/* Footer date */}
          <Text style={{
            color: 'rgba(255,255,255,0.22)',
            fontSize: 8 * sc,
            fontWeight: '600',
            letterSpacing: 0.5,
            marginTop: 14 * sc,
          }}>
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase()}
          </Text>
        </View>
      </View>
    );
  }
);
