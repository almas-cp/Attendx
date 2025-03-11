import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { signInWithEmail } from '@/lib/supabase';

export default function LoginScreen() {
  console.log('🖥️ Rendering LoginScreen component');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { session, user } = useAuth();

  // Check if user is already authenticated
  useEffect(() => {
    console.log('🔍 LoginScreen: Checking authentication status');
    
    if (session && user) {
      console.log('✅ User is already authenticated, redirecting to home');
      router.replace('/home');
    } else {
      console.log('🔐 User is not authenticated, showing login form');
    }
  }, [session, user]);

  // Input change handlers with validation
  const handleEmailChange = (text: string) => {
    console.log('📝 Email input changed');
    setEmail(text);
  };

  const handlePasswordChange = (text: string) => {
    console.log('🔑 Password input changed');
    setPassword(text);
  };

  const toggleRememberMe = () => {
    console.log('🔄 Remember me toggled to:', !rememberMe);
    setRememberMe(!rememberMe);
  };

  // Login function
  async function handleLogin() {
    console.log('🔑 Login button pressed');
    console.log('🔒 Remember me setting:', rememberMe ? 'ON' : 'OFF');
    
    // Validate inputs
    if (!email || !password) {
      console.warn('⚠️ Email or password is empty');
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    console.log('🔄 Starting login process');
    setIsLoading(true);

    try {
      console.log('🔐 Attempting to sign in user');
      // Use signInWithEmail directly with the rememberMe parameter
      const { error } = await signInWithEmail(email, password, rememberMe);
      
      if (error) {
        console.error('❌ Login failed:', error.message);
        Alert.alert('Login Error', error.message);
      } else {
        console.log('✅ Login successful, navigating to home screen');
        // Navigate to home on successful login
        router.replace('/home');
      }
    } catch (error: any) {
      console.error('💥 Unexpected error during login:', error);
      Alert.alert('Login Error', error.message || 'An unexpected error occurred');
    } finally {
      console.log('🔄 Login process completed');
      setIsLoading(false);
    }
  }

  console.log('🖼️ Rendering login form UI');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.innerContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Attendx</Text>
            <Text style={styles.subtitle}>Mobile Attendance Tracking</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              testID="email-input"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              autoComplete="password"
              testID="password-input"
            />

            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={toggleRememberMe}
                testID="remember-me-switch"
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
              testID="login-button"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 