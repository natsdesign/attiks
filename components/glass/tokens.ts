// Design system "Glass" — constantes partagées.
// Volontairement séparé de lib/theme.ts : ces tokens habillent le nouveau
// look verre dépoli (validé d'abord sur la homepage) sans déteindre sur les
// écrans qui n'ont pas encore été repassés dessus.

export const GLASS = {
  radius: 16,
  brand: '#C8F135',
  border: 'rgba(200,241,53,0.14)',
  borderTop: 'rgba(200,241,53,0.32)',
  tint: 'rgba(200,241,53,0.03)',
  ctaBg: '#D2E24C',
  ctaBorder: '#C8F135',
  ctaTxt: '#0A0D06',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.1)',
  placeholder: 'rgba(255,255,255,0.35)',
  backdrop: 'rgba(0,0,0,0.55)',
} as const;

// Ressort iOS-like (damping ratio proche d'UIKit) — même config que le geste
// de swipe de la homepage, pour que tous les composants glass aient le même
// feeling tactile au press/relâchement.
export const GLASS_SPRING = { damping: 22, mass: 0.7, stiffness: 340, useNativeDriver: true } as const;
