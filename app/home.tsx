import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/lib/AuthContext';

export default function HomeScreen() {
  console.log('🖥️ Rendering HomeScreen component');
  
  const { user, loading, signOut, session } = useAuth();

  // If not authenticated, redirect to login
  useEffect(() => {
    console.log('🔍 HomeScreen: Checking authentication status');
    console.log(`🔍 Auth state: loading=${loading}, user=${user ? 'exists' : 'null'}, session=${session ? 'exists' : 'null'}`);
    
    if (!loading) {
      if (!user || !session) {
        console.log('⚠️ User is not authenticated, redirecting to login screen');
        router.replace('/login');
      } else {
        console.log('✅ User is authenticated:', user.name);
      }
    } else {
      console.log('⏳ Still loading authentication state...');
    }
  }, [user, loading, session]);

  async function handleSignOut() {
    console.log('🚪 Sign out button pressed');
    
    try {
      console.log('🔄 Starting sign out process');
      await signOut();
      console.log('✅ Sign out complete, redirecting to login screen');
      router.replace('/login');
    } catch (error) {
      console.error('❌ Error during sign out:', error);
    }
  }

  if (loading) {
    console.log('⏳ Authentication state is still loading, showing loading indicator');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  console.log('🖼️ Rendering home screen UI with user:', user?.name);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Attendx</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome {user?.name}!</Text>
          <Text style={styles.welcomeText}>
            You are now signed in to the Attendx mobile attendance tracking application.
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} testID="mark-attendance-button">
            <Text style={styles.actionButtonText}>Mark Attendance</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} testID="view-records-button">
            <Text style={styles.actionButtonText}>View Records</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} testID="settings-button">
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
          testID="sign-out-button"
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  signOutButton: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signOutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
}); 