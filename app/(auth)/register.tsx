import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { GradientOrb } from '@/components/GradientOrb';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!pseudo.trim()) {
      setError('Le pseudo est requis.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email,
        pseudo,
      });
    }
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0D06' }}>
      <GradientOrb />
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 justify-center">
        <Text className="text-text-primary text-3xl font-black mb-2">Créer un compte</Text>
        <Text className="text-text-secondary text-sm mb-10">Rejoins Attiks et commence à tracker.</Text>

        {error && (
          <View className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}

        <View className="gap-3">
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-2xl px-4 h-14 text-text-primary text-base"
            placeholder="Pseudo"
            placeholderTextColor="#444"
            value={pseudo}
            onChangeText={setPseudo}
            autoCapitalize="none"
          />
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-2xl px-4 h-14 text-text-primary text-base"
            placeholder="Email"
            placeholderTextColor="#444"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-2xl px-4 h-14 text-text-primary text-base"
            placeholder="Mot de passe"
            placeholderTextColor="#444"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          className="bg-brand rounded-2xl h-14 items-center justify-center mt-6"
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-bold text-base">Créer mon compte</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable className="mt-6 items-center">
            <Text className="text-text-secondary text-sm">
              Déjà un compte ?{' '}
              <Text className="text-brand font-semibold">Se connecter</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}
