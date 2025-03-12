import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { user, loading } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [currentDepartment, setCurrentDepartment] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Departments available in the system
  const departments = ['IT', 'CS', 'EC', 'MECH', 'CIVIL', 'EEE'];

  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        console.log('No user ID available for loading preferences');
        return;
      }
      
      // Get the teacher record associated with the current user
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('default_dept_id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (teacherError) {
        console.error('Error loading teacher data:', teacherError);
        Alert.alert('Error', 'Failed to load your preferences');
        return;
      }
      
      if (teacherData && teacherData.default_dept_id) {
        // Get department code from department ID
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('dept_code')
          .eq('id', teacherData.default_dept_id)
          .single();
          
        if (deptError) {
          console.error('Error loading department data:', deptError);
          return;
        }
        
        if (deptData) {
          setCurrentDepartment(deptData.dept_code);
          setSelectedDepartment(deptData.dept_code);
          console.log(`Loaded default department: ${deptData.dept_code}`);
        }
      }
    } catch (error) {
      console.error('Error in loadUserPreferences:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDefaultDepartment = async () => {
    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a department');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Get department ID from department code
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('dept_code', selectedDepartment)
        .single();
        
      if (deptError) {
        console.error('Error getting department ID:', deptError);
        Alert.alert('Error', 'Failed to find department');
        return;
      }
      
      // Update the teacher's default department
      const { error: updateError } = await supabase
        .from('teachers')
        .update({ 
          default_dept_id: deptData.id,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user?.id);
        
      if (updateError) {
        console.error('Error updating default department:', updateError);
        Alert.alert('Error', 'Failed to save your preference');
        return;
      }
      
      setCurrentDepartment(selectedDepartment);
      Alert.alert('Success', 'Default department updated successfully');
      
    } catch (error) {
      console.error('Error in saveDefaultDepartment:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      <ScrollView style={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Department</Text>
          <Text style={styles.sectionDescription}>
            Select your default department for attendance marking
          </Text>
          
          <View style={styles.chipContainer}>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.chip,
                  selectedDepartment === dept && styles.selectedChip
                ]}
                onPress={() => setSelectedDepartment(dept)}
              >
                <Text 
                  style={[
                    styles.chipText,
                    selectedDepartment === dept && styles.selectedChipText
                  ]}
                >
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {currentDepartment ? (
            <Text style={styles.currentSetting}>
              Current default: <Text style={styles.highlight}>{currentDepartment}</Text>
            </Text>
          ) : (
            <Text style={styles.currentSetting}>No default department set</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.saveButton,
            (isSaving || selectedDepartment === currentDepartment) && styles.disabledButton
          ]}
          onPress={saveDefaultDepartment}
          disabled={isSaving || selectedDepartment === currentDepartment}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedChip: {
    backgroundColor: '#6c63ff',
    borderColor: '#6c63ff',
  },
  chipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#fff',
  },
  currentSetting: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
