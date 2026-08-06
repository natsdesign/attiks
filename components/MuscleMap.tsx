import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { FRONT_VIEWBOX, FRONT_OUTLINE, FRONT_PATHS } from '@/lib/muscleFrontPaths';
import { BACK_VIEWBOX, BACK_OUTLINE, BACK_PATHS } from '@/lib/muscleBackPaths';
import type { MuscleColors } from '@/hooks/useMuscleRecovery';

// Natural aspect ratios from SVG viewBoxes
// Front: 294.21 × 543.59  →  w/h = 0.5412
// Back:  247.38 × 543.59  →  w/h = 0.4551
const FRONT_RATIO = 294.21 / 543.59;
const BACK_RATIO  = 247.38 / 543.59;

const DEFAULT_H = 300;

const OUTLINE_COLOR: Record<'dark' | 'light', string> = {
  dark: '#34372F',
  light: '#C9CDBB',
};

const INACTIVE_MUSCLE_COLOR: Record<'dark' | 'light', string> = {
  dark: '#7B8070',
  light: '#9BA08C',
};

// L'illustration source n'a qu'un seul trapèze sur la vue de dos —
// on complète le second côté par un miroir plutôt que de laisser un trou.
const BACK_MIRROR_IDS = ['trapezius-2'];

interface BodyFigureProps {
  viewBox: string;
  outlineD: string;
  paths: { id: string; d: string }[];
  muscleColors: MuscleColors;
  inactiveColor: string;
  outlineColor: string;
  width: number;
  height: number;
  mirrorIds?: string[];
}

function BodyFigure({ viewBox, outlineD, paths, muscleColors, inactiveColor, outlineColor, width, height, mirrorIds }: BodyFigureProps) {
  const vbWidth = parseFloat(viewBox.split(' ')[2]);
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      <Path d={outlineD} fill={outlineColor} />
      {paths.map((p) => (
        <Path key={p.id} d={p.d} fill={muscleColors[p.id] ?? inactiveColor} />
      ))}
      {mirrorIds?.map((id) => {
        const p = paths.find((x) => x.id === id);
        if (!p) return null;
        return (
          <Path
            key={`${id}-mirror`}
            d={p.d}
            fill={muscleColors[id] ?? inactiveColor}
            transform={`translate(${vbWidth},0) scale(-1,1)`}
          />
        );
      })}
    </Svg>
  );
}

interface MuscleMapProps {
  muscleColors: MuscleColors;
  height?: number;
}

export function MuscleMap({ muscleColors, height = DEFAULT_H }: MuscleMapProps) {
  const { mode } = useTheme();
  const frontW = Math.round(height * FRONT_RATIO);
  const backW  = Math.round(height * BACK_RATIO);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 2 }}>
      <BodyFigure
        viewBox={FRONT_VIEWBOX}
        outlineD={FRONT_OUTLINE}
        paths={FRONT_PATHS}
        muscleColors={muscleColors}
        inactiveColor={INACTIVE_MUSCLE_COLOR[mode]}
        outlineColor={OUTLINE_COLOR[mode]}
        width={frontW}
        height={height}
      />
      <BodyFigure
        viewBox={BACK_VIEWBOX}
        outlineD={BACK_OUTLINE}
        paths={BACK_PATHS}
        muscleColors={muscleColors}
        inactiveColor={INACTIVE_MUSCLE_COLOR[mode]}
        outlineColor={OUTLINE_COLOR[mode]}
        width={backW}
        height={height}
        mirrorIds={BACK_MIRROR_IDS}
      />
    </View>
  );
}
