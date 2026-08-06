const KEY = process.env.EXPO_PUBLIC_WORKOUTX_API_KEY ?? '';

export const workoutxImageSource = (url: string | null) =>
  url ? { uri: url, headers: { 'X-WorkoutX-Key': KEY } } : null;
