import { SvgXml } from 'react-native-svg';
import { SALUT_SVG, FATIGUE_SVG, FORME_SVG } from './mascotSvg';

export type MascotState = 'salut' | 'fatigue' | 'forme';

const SVG_BY_STATE: Record<MascotState, string> = {
  salut: SALUT_SVG,
  fatigue: FATIGUE_SVG,
  forme: FORME_SVG,
};

interface MascotProps {
  state: MascotState;
  size?: number;
}

export function Mascot({ state, size = 160 }: MascotProps) {
  return <SvgXml xml={SVG_BY_STATE[state]} width={size} height={size} />;
}

// Dérive l'état de la mascotte à partir du score de récupération, en
// suivant les mêmes seuils que le message affiché (useRecoveryScore).
export function mascotStateForScore(score: number): MascotState {
  if (score >= 85) return 'forme';
  if (score >= 65) return 'salut';
  return 'fatigue';
}
