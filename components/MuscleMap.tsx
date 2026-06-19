import { useMemo } from 'react';
import { Dimensions, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import { MUSCLE_SVG } from '@/lib/muscleSvg';
import type { MuscleColors } from '@/hooks/useMuscleRecovery';

const SW = Dimensions.get('window').width;
// Card inner width = SW - 40 (section padding 20 each side); gap 8 between views
const GAP = 8;
const VIEW_W = Math.floor((SW - 40 - GAP) / 2);
// SVG is 604.76 × 511.04. Each half is ~302.38 wide.
// When displayed at width = 2*VIEW_W, height = 2*VIEW_W × (511.04/604.76)
const VIEW_H = Math.floor(2 * VIEW_W * (511.04 / 604.76));

const BRAND = '#C8F135';

const WEBVIEW_PROPS = {
  scrollEnabled: false,
  showsHorizontalScrollIndicator: false,
  showsVerticalScrollIndicator: false,
  overScrollMode: 'never' as const,
  bounces: false,
  originWhitelist: ['*'],
  style: { flex: 1, backgroundColor: 'transparent' },
};

const JS_INJECT = (colorsJson: string) => `
(function() {
  var colors = ${colorsJson};
  var BRAND = '${BRAND}';
  document.querySelectorAll('.cls-1').forEach(function(el) { el.style.fill = BRAND; });
  function applyColor(id, color) {
    var el = document.getElementById(id);
    if (!el) return;
    var tag = el.tagName.toLowerCase();
    if (tag === 'path' || tag === 'ellipse' || tag === 'rect' || tag === 'circle') {
      el.style.fill = color;
    } else {
      el.querySelectorAll('.cls-1').forEach(function(c) { c.style.fill = color; });
    }
  }
  Object.keys(colors).forEach(function(id) { applyColor(id, colors[id]); });
})();
`;

const BASE_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
`;

function buildHtml(muscleColors: MuscleColors, side: 'front' | 'back'): string {
  // front: SVG at left:0, back: SVG shifted left by VIEW_W so the right half is visible
  const svgPos = side === 'front'
    ? 'position:absolute; left:0; top:0; width:200%; height:auto;'
    : 'position:absolute; left:-100%; top:0; width:200%; height:auto;';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  ${BASE_STYLE}
  svg { ${svgPos} }
</style>
</head>
<body>
${MUSCLE_SVG}
<script>${JS_INJECT(JSON.stringify(muscleColors))}</script>
</body>
</html>`;
}

interface MuscleMapProps {
  muscleColors: MuscleColors;
  compact?: boolean;
}

export function MuscleMap({ muscleColors, compact = false }: MuscleMapProps) {
  const scale = compact ? 0.54 : 1;
  const w = Math.floor(VIEW_W * scale);
  const h = Math.floor(VIEW_H * scale);

  const frontHtml = useMemo(() => buildHtml(muscleColors, 'front'), [muscleColors]);
  const backHtml = useMemo(() => buildHtml(muscleColors, 'back'), [muscleColors]);

  const labelColor = '#8A9A7A';

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: compact ? 0 : 8, paddingTop: compact ? 0 : 8 }}>
        {/* Face */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: w, height: h, overflow: 'hidden' }}>
            <WebView source={{ html: frontHtml }} {...WEBVIEW_PROPS} />
          </View>
          <Text style={{
            textAlign: 'center',
            color: labelColor,
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            Face
          </Text>
        </View>

        {/* Dos */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: w, height: h, overflow: 'hidden' }}>
            <WebView source={{ html: backHtml }} {...WEBVIEW_PROPS} />
          </View>
          <Text style={{
            textAlign: 'center',
            color: labelColor,
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            Dos
          </Text>
        </View>
      </View>
      {!compact && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 18,
          marginTop: 10,
          marginBottom: 4,
        }}>
          {[
            { color: '#FF3B30', label: '< 24h' },
            { color: '#FF9500', label: '24–36h' },
            { color: BRAND, label: 'Prêt' },
          ].map(({ color, label }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: color,
              }} />
              <Text style={{ color: labelColor, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
