import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/AuthContext';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

console.log('🚀 Application starting - initializing root layout');

export default function RootLayout() {
  console.log('🖥️ Rendering RootLayout component');
  
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const colorScheme = useColorScheme();
  
  // Load fonts
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  // Wait for fonts to load
  useEffect(() => {
    if (!loaded) {
      console.log('⏳ Fonts not loaded yet, returning null');
      return;
    }
    
    console.log('✅ All assets loaded, rendering app with AuthProvider');
    setFontsLoaded(true);
    
    // Hide splash screen once everything is ready
    SplashScreen.hideAsync().then(() => {
      console.log('🔄 Fonts loaded, hiding splash screen');
    });
  }, [loaded]);
  
  // Wait until fonts are loaded
  if (!fontsLoaded) {
    console.log('⏳ Still loading fonts...');
    return null;
  }
  
  console.log('🎨 Current color scheme:', colorScheme);
  
  return (
    <AuthProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}
