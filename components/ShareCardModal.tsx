import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { ShareCard, ShareCardData } from './ShareCard';

const BRAND = '#C8F135';
const BG = '#0D1108';
const SURFACE = '#161D0F';
const TEXT_MUTED = '#4A5A3A';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;

const VARIANTS: { id: 1 | 2 | 3; label: string; sub: string }[] = [
  { id: 1, label: 'Story', sub: 'Avec photo' },
  { id: 2, label: 'Carte', sub: 'Sans fond' },
  { id: 3, label: 'Feed', sub: 'Carré' },
];

interface Props {
  data: ShareCardData;
  onDismiss: () => void;
}

export function ShareCardModal({ data, onDismiss }: Props) {
  const [variant, setVariant] = useState<1 | 2 | 3>(2);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);

  const cardRef = useRef<View>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      friction: 9,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, []);

  // Ré-anime quand la variante change
  useEffect(() => {
    enterAnim.setValue(0.88);
    Animated.spring(enterAnim, {
      toValue: 1,
      friction: 9,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [variant]);

  async function handlePickPhoto() {
    Alert.alert('Choisir une photo', '', [
      { text: 'Appareil photo', onPress: takePhoto },
      { text: 'Galerie', onPress: openGallery },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function takePhoto() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission refusée', "L'accès à l'appareil photo est requis.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function openGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager ta séance',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer la carte.');
    } finally {
      setSharing(false);
    }
  }

  const cardHeight = variant === 3 ? CARD_W : Math.round(CARD_W * 16 / 9);

  return (
    <SafeAreaView style={ss.root}>
      {/* ── HEADER ─────────────────────────────────── */}
      <View style={ss.header}>
        <Pressable onPress={onDismiss} style={ss.closeBtn} hitSlop={12}>
          <Text style={ss.closeTxt}>✕</Text>
        </Pressable>
        <View style={ss.headerCenter}>
          <Text style={ss.headerTitle}>SÉANCE TERMINÉE</Text>
          <Text style={ss.headerSub}>Partage ton effort</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── CARTE + CONTRÔLES (scrollable) ─────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={ss.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Aperçu de la carte */}
        <Animated.View
          style={[
            ss.cardWrap,
            { height: cardHeight },
            {
              opacity: enterAnim,
              transform: [{ scale: Animated.add(0.94, Animated.multiply(enterAnim, 0.06)) }],
            },
          ]}
        >
          <ShareCard
            ref={cardRef}
            variant={variant}
            data={data}
            photoUri={photoUri}
            width={CARD_W}
          />
        </Animated.View>

        {/* Bouton photo (variante 1 uniquement) */}
        {variant === 1 && (
          <Pressable onPress={handlePickPhoto} style={ss.photoBtn}>
            <Text style={ss.photoBtnTxt}>
              {photoUri ? '✓ Photo choisie — changer' : '＋ Choisir une photo'}
            </Text>
          </Pressable>
        )}

        {/* Sélecteur de variantes */}
        <View style={ss.variantRow}>
          {VARIANTS.map(({ id, label, sub }) => {
            const active = variant === id;
            return (
              <Pressable
                key={id}
                onPress={() => setVariant(id)}
                style={[ss.variantTab, active && ss.variantTabActive]}
              >
                <Text style={[ss.variantIcon, active && { color: '#0D1108' }]}>
                  {id === 1 ? '▮' : id === 2 ? '▬' : '■'}
                </Text>
                <Text style={[ss.variantLabel, active && { color: '#0D1108' }]}>{label}</Text>
                <Text style={[ss.variantSub, active && { color: 'rgba(13,17,8,0.6)' }]}>{sub}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── BOUTONS FIXES EN BAS ────────────────────── */}
      <View style={ss.bottomBar}>
        <Pressable
          onPress={handleShare}
          disabled={sharing}
          style={[ss.shareBtn, sharing && { opacity: 0.6 }]}
        >
          <Text style={ss.shareTxt}>{sharing ? 'Génération…' : 'Partager'}</Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={ss.passBtn}>
          <Text style={ss.passTxt}>Passer</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2914',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#8A9A7A', fontSize: 14, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    fontSize: 18,
    letterSpacing: -0.5,
  },
  headerSub: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },

  /* scroll */
  scroll: { paddingTop: 20, paddingHorizontal: 20, alignItems: 'center' },

  /* card */
  cardWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    width: CARD_W,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },

  /* photo picker */
  photoBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderStyle: 'dashed',
  },
  photoBtnTxt: {
    color: BRAND,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.3,
  },

  /* variant selector */
  variantRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    width: CARD_W,
  },
  variantTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  variantTabActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  variantIcon: {
    color: '#8A9A7A',
    fontSize: 14,
    marginBottom: 4,
  },
  variantLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  variantSub: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 2,
  },

  /* bottom bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#1E2914',
    gap: 10,
  },
  shareBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  shareTxt: {
    color: '#0D1108',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.5,
  },
  passBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passTxt: {
    color: TEXT_MUTED,
    fontWeight: '600',
    fontSize: 15,
  },
});
