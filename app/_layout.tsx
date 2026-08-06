import '../global.css';
import { useEffect, useState } from 'react';
import { Dimensions, LogBox, View } from 'react-native';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { ThemeContext, themes, ThemeMode } from '@/lib/theme';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { PostHogProvider } from 'posthog-react-native';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPurchases } from '@/lib/purchases';

const SW = Dimensions.get('window').width;

function BottomGlow() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
    >
      <Svg width={SW} height={280} viewBox={`0 0 ${SW} 280`}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="100%" rx="55%" ry="85%">
            <Stop offset="0%" stopColor="#C8F135" stopOpacity="0.18" />
            <Stop offset="60%" stopColor="#C8F135" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#C8F135" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={SW / 2} cy={280} rx={SW * 0.55} ry={240} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Anton_400Regular });
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  // Mode clair désactivé pour l'instant (chantier en pause) — l'app reste 100% sombre.
  const themeMode: ThemeMode = 'dark';

  useEffect(() => {
    AsyncStorage.getItem('attiks_onboard_v1').then((v) => {
      setOnboardingDone(v === 'done');
    });
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      initPurchases(session.user.id);
    }
  }, [session?.user?.id]);

  // No-op tant que le mode clair est désactivé (garde le contrat de ThemeContext).
  const toggleTheme = async () => {};

  useEffect(() => {
    if (loading || onboardingDone === null) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';
    const inSession = segments[0] === 'session';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      if (!onboardingDone) {
        router.replace('/(onboarding)/onboard');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && inTabs && !onboardingDone) {
      // Utilisateur existant déjà dans l'app — marquer l'onboarding comme fait
      AsyncStorage.setItem('attiks_onboard_v1', 'done');
      setOnboardingDone(true);
    } else if (session && !inOnboarding && !inTabs && !inSession && !onboardingDone) {
      router.replace('/(onboarding)/onboard');
    }
  }, [session, loading, segments, onboardingDone]);

  const theme = themes[themeMode];

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY}
      autocapture={false}
      options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
    >
      <ThemeContext.Provider value={{ mode: themeMode, theme, toggleTheme }}>
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
          <BottomGlow />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="session/active"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="session/[id]"
              options={{ headerShown: true, headerTitle: 'Détail séance', headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.textPrimary }}
            />
          </Stack>
        </View>
      </ThemeContext.Provider>
    </PostHogProvider>
  );
}
