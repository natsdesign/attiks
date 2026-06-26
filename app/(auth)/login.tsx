import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { GradientOrb } from '@/components/GradientOrb';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1108' }}>
      <GradientOrb />
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-brand text-5xl font-black tracking-tight mb-2">ATTIKS</Text>
        <Text className="text-text-secondary text-base mb-12">Track your gains. Show your progress.</Text>

        {error && (
          <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}

        <View className="gap-3">
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-2xl px-4 h-14 text-text-primary text-base"
            placeholder="Email"
            placeholderTextColor="#444"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-2xl px-4 h-14 text-text-primary text-base"
            placeholder="Mot de passe"
            placeholderTextColor="#444"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="bg-brand rounded-2xl h-14 items-center justify-center mt-6"
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-bold text-base">Connexion</Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-text-secondary text-sm">
              Pas encore de compte ?{' '}
              <Text className="text-brand font-semibold">Créer un compte</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}
