import { createContext, useContext } from 'react'

export const themes = {
  dark: {
    bg: '#0D1108',
    surface: '#161D0F',
    surfaceRaised: '#2A2A2A',
    border: '#333333',
    borderSubtle: '#1E1E1E',
    brand: '#C8F135',
    brandDim: '#8A9E20',
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    textMuted: '#888888',
    navBg: 'rgba(13, 17, 8, 0.92)',
    cardBg: '#161D0F',
    danger: '#FF4444',
    recoveryFresh: '#C8F135',
    recoveryAlmost: '#FFD700',
    recoveryMid: '#FF8C00',
    recoveryFatigued: '#FF4444',
  },
  light: {
    bg: '#F5F7F0',
    surface: '#FFFFFF',
    surfaceRaised: '#EAEDE3',
    border: '#E0E4D8',
    borderSubtle: '#EDEFE8',
    brand: '#6B8A00',
    brandDim: '#8A9E20',
    textPrimary: '#0D1108',
    textSecondary: '#555555',
    textMuted: '#999999',
    navBg: 'rgba(245, 247, 240, 0.92)',
    cardBg: '#FFFFFF',
    danger: '#CC2222',
    recoveryFresh: '#6B8A00',
    recoveryAlmost: '#B8860B',
    recoveryMid: '#CC6600',
    recoveryFatigued: '#CC2222',
  },
}

export type Theme = typeof themes.dark
export type ThemeMode = 'dark' | 'light'

export const ThemeContext = createContext<{
  mode: ThemeMode
  theme: Theme
  toggleTheme: () => void
}>({
  mode: 'dark',
  theme: themes.dark,
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)
