import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

// Define types
type Student = {
  id: string;
  roll_number: string | number;
  name: string;
  register_number?: string | number;
  isPresent: boolean | null;
};

type AttendanceData = {
  [key: string]: boolean | null;
};

export default function PreviewScreen() {
  const { user, session } = useAuth();
  const params = useLocalSearchParams();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Get params
  const className = String(params.class || '');
  const tableName = String(params.tableName || ''); // Get the actual table name
  const hourNumber = String(params.hour || '');
  const date = String(params.date || new Date().toISOString().split('T')[0]);
  const attendanceDataString = String(params.attendanceData || '{}');
  const attendanceData: AttendanceData = JSON.parse(attendanceDataString);
  
  // Log received parameters for debugging
  console.log('Preview received params:', {
    id: params.id || 'MISSING',
    class: className || 'MISSING',
    tableName: tableName || 'MISSING',
    hour: hourNumber || 'MISSING',
    date: date,
    attendanceDataKeys: Object.keys(attendanceData).length
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!session || !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }
    
    loadStudentDetails();
  }, [session, user]);

  const loadStudentDetails = async () => {
    try {
      if (!className) {
        console.log('No class selected');
        Alert.alert('Error', 'Class information is missing');
        return;
      }

      console.log(`Loading from class: ${className}`);

      // Map display class name to actual table name
      const tableMap: {[key: string]: string} = {
        'IT-A': 'ita',
        'IT-B': 'itb'
      };
      
      const actualTableName = tableMap[className] || className.toLowerCase().replace('-', '');
      console.log(`Using table name: ${actualTableName}`);

      // Load ALL students from the class instead of just one
      const { data, error } = await supabase
        .from(actualTableName)
        .select('id, name, roll_no, register_no')
        .order('roll_no', { ascending: true });

      console.log('Student data query result:', {
        success: !!data && !error,
        count: data?.length || 0,
        error: error?.message || 'none'
      });

      if (error) {
        console.error('Error loading student details:', error);
        Alert.alert('Error', 'Failed to load student details');
        return;
      }

      if (data && data.length > 0) {
        console.log(`Loaded ${data.length} students from class ${className}`);
        
        // Format using updated column names
        // Convert numeric types to strings for UI display
        const allStudents: Student[] = data.map(student => ({
          id: student.id.toString(),
          name: student.name,
          roll_number: student.roll_no.toString(),
          register_number: student.register_no.toString(),
          isPresent: attendanceData[student.id.toString()] || false
        }));
        
        setStudents(allStudents);
      } else {
        console.log('No students found in class:', className);
        Alert.alert('Error', 'No students found in this class');
      }
    } catch (error) {
      console.error('Error in loadStudentDetails:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading student details');
    }
  };

  const saveAttendance = async () => {
    try {
      setIsSaving(true);
      console.log('Starting attendance save process');
      
      // Use the actual table name
      const actualTableName = tableName || className.toLowerCase().replace('-', '');
      
      // Format attendance data for saving with updated column names
      const formattedData = {
        class: className,
        tableName: actualTableName,
        hour: hourNumber,
        date: date,
        teacher_id: user?.id,
        marked_at: new Date().toISOString(),
        attendance: students.map(student => ({
          student_id: student.id,
          roll_no: student.roll_number,  // Updated to match column name
          name: student.name,
          register_no: student.register_number,  // Updated to match column name
          is_present: student.isPresent === true // Convert to boolean
        })),
      };
      
      console.log('Formatted attendance data:', {
        class: formattedData.class,
        tableName: formattedData.tableName,
        hour: formattedData.hour,
        date: formattedData.date,
        studentsCount: formattedData.attendance.length,
        presentCount: formattedData.attendance.filter(s => s.is_present).length,
        absentCount: formattedData.attendance.filter(s => !s.is_present).length
      });
      
      try {
        console.log('Attempting to save to attendance_sessions table');
        // First try to save to attendance_sessions and attendance_records tables
        const { data: sessionData, error: sessionError } = await supabase
          .from('attendance_sessions')
          .insert({
            class_name: className,
            table_name: actualTableName,
            hour: hourNumber,
            date: date,
            teacher_id: user?.id,
            marked_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (sessionError) {
          console.error('Error creating attendance session:', sessionError);
          throw sessionError;
        }
        
        console.log('Session created successfully with ID:', sessionData.id);
        
        // Insert attendance records for each student with updated column names
        const attendanceRecords = students.map(student => ({
          session_id: sessionData.id,
          student_id: student.id,
          roll_no: student.roll_number,  // Updated to match column name
          student_name: student.name,
          is_present: student.isPresent === true  // Convert to boolean
        }));
        
        console.log(`Saving ${attendanceRecords.length} attendance records`);
        
        const { error: recordsError } = await supabase
          .from('attendance_records')
          .insert(attendanceRecords);
          
        if (recordsError) {
          console.error('Error saving attendance records:', recordsError);
          throw recordsError;
        }
        
        console.log('All attendance records saved successfully');
        
        // Generate CSV format for download/display
        const csvContent = generateCsvContent(students);
        console.log('CSV content generated for display or download');
        
        Alert.alert(
          'Success',
          'Attendance has been saved successfully!',
          [{ text: 'OK', onPress: () => router.replace('/home') }]
        );
      } catch (dbError) {
        console.log('Database save failed, saving to storage as backup', dbError);
        
        // Fallback to saving in storage bucket if database insert fails
        const filename = `${actualTableName}_${date}_hour${hourNumber}_${new Date().getTime()}.json`;
        console.log('Saving to storage with filename:', filename);
        
        const { data, error } = await supabase
          .storage
          .from('ledger')
          .upload(filename, JSON.stringify(formattedData), {
            contentType: 'application/json',
            cacheControl: '3600',
          });
        
        if (error) {
          console.error('Storage error:', error);
          Alert.alert('Error', 'Failed to save attendance. Please try again.');
          return;
        }
        
        console.log('Attendance saved to storage successfully');
        
        Alert.alert(
          'Success',
          'Attendance has been saved successfully (as backup file)!',
          [{ text: 'OK', onPress: () => router.replace('/home') }]
        );
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to generate CSV content from student data
  const generateCsvContent = (students: Student[]): string => {
    // Header row
    let csv = 'roll_no,name,present/absent\n';
    
    // Data rows
    students.forEach(student => {
      const status = student.isPresent ? 'present' : 'absent';
      csv += `${student.roll_number},${student.name},${status}\n`;
    });
    
    return csv;
  };

  const confirmSave = () => {
    Alert.alert(
      'Confirm Submission',
      'Are you sure you want to save this attendance record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: saveAttendance }
      ],
      { cancelable: true }
    );
  };

  // Toggle attendance status for a student
  const toggleAttendance = (studentId: string) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId 
          ? { ...student, isPresent: !student.isPresent } 
          : student
      )
    );
  };
  
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 0.2 }]}>Roll No</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Name</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.3 }]}>Attendance</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    // Get status info
    const isPresentIcon = item.isPresent 
      ? <MaterialIcons name="check-box" size={24} color="#4cd964" />
      : <MaterialIcons name="check-box-outline-blank" size={24} color="#ff6b6b" />;
    
    const statusText = item.isPresent ? 'Present' : 'Absent';
    
    return (
      <TouchableOpacity 
        style={styles.tableRow}
        onPress={() => toggleAttendance(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tableCell, { flex: 0.2 }]}>#{item.roll_number}</Text>
        <Text style={[styles.tableCell, { flex: 0.5 }]}>{item.name}</Text>
        <View style={[styles.tableCell, styles.statusCell, { flex: 0.3 }]}>
          {isPresentIcon}
          <Text style={item.isPresent ? styles.presentText : styles.absentText}>
            {statusText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading student details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Preview</Text>
          <Text style={styles.subtitle}>
            {className} - Hour {hourNumber} - {date}
          </Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {students.filter(s => s.isPresent === true).length}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {students.filter(s => s.isPresent === false).length}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {students.length}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
        
        <View style={styles.tableContainer}>
          {/* Table instructions */}
          <Text style={styles.instructions}>
            Tap on a student to toggle their attendance status
          </Text>
          
          {/* Table header */}
          {renderTableHeader()}
          
          {/* Student list */}
          <FlatList
            data={students}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No student data available</Text>
            }
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.csvButton}
            onPress={() => {
              const csv = generateCsvContent(students);
              Alert.alert(
                'CSV Format',
                csv,
                [{ text: 'OK' }]
              );
            }}
            disabled={isSaving}
          >
            <MaterialIcons name="format-list-bulleted" size={24} color="#fff" />
            <Text style={styles.buttonText}>View CSV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={confirmSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Save Attendance</Text>
                <MaterialIcons name="check-circle" size={24} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 10,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  rollNumber: {
    fontSize: 14,
    color: '#6c63ff',
    fontWeight: '600',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backButton: {
    backgroundColor: '#8892b0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  csvButton: {
    backgroundColor: '#f0ad4e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f7fa',
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableHeaderCell: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 15,
    color: '#333',
  },
  statusCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  presentText: {
    color: '#4cd964',
    fontWeight: 'bold',
    fontSize: 14,
  },
  absentText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 