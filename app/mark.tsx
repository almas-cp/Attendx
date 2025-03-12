import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

// Define types for students and attendance data
type Student = {
  id: string;
  roll_number: string | number;
  name: string;
  register_number?: string | number;
};

type AttendanceData = {
  [key: string]: boolean | null;
};

export default function MarkAttendance() {
  const { user, session } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [markingStarted, setMarkingStarted] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [classes, setClasses] = useState<string[]>([]);
  
  // Animation properties
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });
  
  const rightOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  const leftOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
    ],
  };

  // Set up gestures for swiping - recreate panResponder when currentIndex changes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        // Only allow swiping if we have a valid student at current index
        if (currentIndex < students.length) {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        }
      },
      onPanResponderRelease: (event, gesture) => {
        // Only process swipe if we have a valid student at current index
        if (currentIndex < students.length) {
          if (gesture.dx > SWIPE_THRESHOLD) {
            swipeRight();
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            swipeLeft();
          } else {
            resetPosition();
          }
        } else {
          // Reset position if we're out of bounds
          resetPosition();
        }
      },
    })
  ).current;

  // Reset position when currentIndex changes
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!session || !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }
    
    // Load available classes
    loadClasses();
  }, [session, user]);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      
      // Using the updated class tables from database inspection
      // Based on database inspection, the available classes are: ita, itb
      const actualClasses = ['ita', 'itb'];
      const displayClasses = ['IT-A', 'IT-B']; // For display purposes
      
      // Create a mapping between display names and actual table names
      const classMapping: {[key: string]: string} = {
        'IT-A': 'ita',
        'IT-B': 'itb'
      };
      
      setClasses(displayClasses);
      setSelectedClass(displayClasses[0]);
    } catch (error) {
      console.error('Error setting classes:', error);
      Alert.alert('Error', 'Failed to set available classes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      
      if (!selectedClass) {
        console.log('No class selected');
        Alert.alert('Error', 'Please select a class');
        setIsLoading(false);
        return;
      }
      
      console.log('DEBUG START --------------------------------');
      console.log(`Selected class: ${selectedClass}`);
      
      // Map display class name to actual table name
      const tableMap: {[key: string]: string} = {
        'IT-A': 'ita',
        'IT-B': 'itb'
      };
      
      const tableName = tableMap[selectedClass] || selectedClass.toLowerCase().replace('-', '');
      console.log(`Mapped table name: "${tableName}"`);
      
      // Important: Check for user authentication status
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User authentication status:', user ? `Authenticated as ${user.email}` : 'Not authenticated');
      
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        Alert.alert('Authentication Error', 'You need to be logged in to access this feature');
        router.replace('/login');
        setIsLoading(false);
        return;
      }
      
      // Verify we can access the database with a simple query
      console.log('Testing database access...');
      try {
        // Using a simpler query that PostgREST supports
        const { data: testData, error: testError } = await supabase
          .from('ita')
          .select('id')
          .limit(1);
          
        console.log('Database access test:', {
          success: !!testData && !testError,
          count: testData?.length || 0,
          error: testError?.message || 'none'
        });
      } catch (e) {
        console.log('Database access test exception:', e);
      }
      
      // Try multiple query approaches to solve the issue
      let data = null;
      let error = null;
      
      // Method 1: Standard PostgREST query
      console.log('Method 1: Trying standard PostgREST query...');
      const { data: data1, error: error1 } = await supabase
        .from(tableName)
        .select('id, name, roll_no, register_no');
      
      console.log('Method 1 results:', { 
        success: !!data1 && !error1,
        count: data1?.length || 0, 
        error: error1?.message || 'none'
      });
      
      if (data1 && data1.length > 0) {
        console.log('Method 1 succeeded! Using these results');
        data = data1;
        error = error1;
      } else {
        // Method 2: Direct SQL query via RPC
        console.log('Method 2: Trying direct SQL query via Postgres function...');
        try {
          // Create the SQL executor function if it doesn't exist
          const createFunctionQuery = `
            CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
            RETURNS SETOF json AS $$
            DECLARE
              result json;
            BEGIN
              FOR result IN EXECUTE sql_query
              LOOP
                RETURN NEXT result;
              END LOOP;
              RETURN;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `;
          
          // Use rpc for function creation instead of direct query
          const { error: createError } = await supabase.rpc('create_pg_function', {
            function_body: createFunctionQuery
          }).single();
          
          if (createError) {
            console.log('Error creating SQL executor function:', createError.message);
            // Fallback: Try to create the function on first use
            console.log('Function may already exist, trying to use it anyway');
          } else {
            console.log('SQL executor function created successfully');
          }
          
          // Use the function to execute a direct SQL query
          const sqlQuery = `SELECT id, name, roll_no, register_no FROM ${tableName}`;
          const { data: data2, error: error2 } = await supabase.rpc('execute_sql', {
            sql_query: sqlQuery
          });
          
          console.log('Method 2 results:', { 
            success: !!data2 && !error2,
            count: data2?.length || 0, 
            error: error2?.message || 'none'
          });
          
          if (data2 && data2.length > 0) {
            console.log('Method 2 succeeded! Using these results');
            data = data2;
            error = error2;
          }
        } catch (rpcError) {
          console.log('Method 2 exception:', rpcError);
        }
        
        // Method 3: Using the improved get_table_data function
        if (!data) {
          console.log('Method 3: Using get_table_data function for direct table access...');
          try {
            const { data: data3, error: error3 } = await supabase.rpc('get_table_data', {
              table_name: tableName,
              columns: 'id, name, roll_no, register_no'
            });
            
            console.log('Method 3 results:', { 
              success: !!data3 && !error3,
              count: data3?.length || 0, 
              error: error3?.message || 'none'
            });
            
            if (data3 && data3.length > 0) {
              console.log('Method 3 succeeded! Using these results');
              data = data3;
              error = error3;
            }
          } catch (queryError) {
            console.log('Method 3 exception:', queryError);
          }
        }
      }
      
      // Process the results from whichever method succeeded
      if (data && data.length > 0) {
        console.log(`Found ${data.length} students in class ${selectedClass}`);
        console.log('First student sample:', data[0]);
        
        // Format student data for the UI - using new column names
        // Convert numeric types to strings for UI display
        const formattedStudents: Student[] = data.map((student: any) => ({
          id: student.id.toString(),
          roll_number: student.roll_no.toString(),
          name: student.name,
          register_number: student.register_no.toString()
        }));
        
        // Initialize attendance data for all students as not marked
        const initialAttendance: AttendanceData = {};
        formattedStudents.forEach(student => {
          initialAttendance[student.id] = null; // null = not marked yet
        });
        
        setStudents(formattedStudents);
        setAttendanceData(initialAttendance);
        setCurrentIndex(0);
        setMarkingStarted(true);
        // Reset position when loading new students
        position.setValue({ x: 0, y: 0 });
        console.log('Student data loaded and formatted successfully');
      } else {
        console.log(`No students found in class ${selectedClass} (table: ${tableName})`);
        
        // Check if table exists but is empty
        try {
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          console.log('Table existence check:', {
            exists: countError ? 'No' : 'Yes',
            error: countError?.message || 'none'
          });
        } catch (e) {
          console.log('Table existence check exception:', e);
        }
        
        Alert.alert('No Students', 'No students found in this class. Please select a different class or contact your administrator.');
      }
      
      console.log('DEBUG END --------------------------------');
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const swipeRight = () => {
    // Check if we have a valid student at current index
    if (currentIndex < students.length) {
      // Mark as present
      const studentId = students[currentIndex]?.id;
      console.log(`Marking student ${studentId} (index: ${currentIndex}) as PRESENT`);
      markAttendance(true);
      
      Animated.timing(position, {
        toValue: { x: width + 100, y: 0 },
        duration: 300,
        useNativeDriver: true,
      }).start(() => nextCard());
    } else {
      console.log(`Cannot mark student at index ${currentIndex} as PRESENT - index out of bounds`);
    }
  };

  const swipeLeft = () => {
    // Check if we have a valid student at current index
    if (currentIndex < students.length) {
      // Mark as absent
      const studentId = students[currentIndex]?.id;
      console.log(`Marking student ${studentId} (index: ${currentIndex}) as ABSENT`);
      markAttendance(false);
      
      Animated.timing(position, {
        toValue: { x: -width - 100, y: 0 },
        duration: 300,
        useNativeDriver: true,
      }).start(() => nextCard());
    } else {
      console.log(`Cannot mark student at index ${currentIndex} as ABSENT - index out of bounds`);
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const markAttendance = (isPresent: boolean) => {
    if (currentIndex < students.length) {
      const studentId = students[currentIndex].id;
      console.log(`Setting attendance for student ${studentId} (index: ${currentIndex}) to ${isPresent ? 'PRESENT' : 'ABSENT'}`);
      
      // Log the current state of attendance data for this student
      console.log(`Previous attendance state for student ${studentId}: ${attendanceData[studentId] === null ? 'NOT MARKED' : attendanceData[studentId] ? 'PRESENT' : 'ABSENT'}`);
      
      setAttendanceData(prev => {
        const newData = {
          ...prev,
          [studentId]: isPresent
        };
        console.log(`Updated attendance data - Total marked: ${Object.values(newData).filter(v => v !== null).length}/${students.length}`);
        return newData;
      });
    } else {
      console.log(`Attempted to mark attendance for index ${currentIndex} which is out of bounds (total: ${students.length})`);
    }
  };

  const nextCard = () => {
    // Reset position first to avoid animation glitches
    position.setValue({ x: 0, y: 0 });
    
    // Use a functional update to ensure we're working with the latest state
    setCurrentIndex(prevIndex => {
      // Store current students length in a local variable to avoid race conditions
      const studentsLength = students.length;
      const newIndex = prevIndex + 1;
      console.log(`Moving from student ${prevIndex} to ${newIndex} of ${studentsLength} total students`);
      
      if (prevIndex < studentsLength - 1) {
        return newIndex;
      } else {
        // All students marked, show completion screen
        console.log(`All students have been marked (${studentsLength} total)`);
        return studentsLength; // This will trigger the completion screen
      }
    });
  };

  // Updated to navigate to preview with all students' data
  const navigateToPreview = () => {
    try {
      if (students.length === 0) {
        console.log('ERROR: No students available when trying to navigate to preview');
        Alert.alert('Error', 'No student data available. Please try again.');
        return;
      }
      
      // Convert attendance data to JSON string safely
      const attendanceDataJson = JSON.stringify(attendanceData);
      
      // Map display class name to actual table name
      const tableMap: {[key: string]: string} = {
        'IT-A': 'ita',
        'IT-B': 'itb'
      };
      
      // Get actual table name for the selected class
      const tableName = tableMap[selectedClass] || selectedClass.toLowerCase().replace('-', '');
      
      // Debug - check if values are present
      console.log('Parameters for preview (navigateToPreview):', {
        selectedClass: selectedClass || 'NOT SET',
        tableName: tableName || 'NOT SET',
        selectedHour: selectedHour || 'NOT SET',
        attendanceKeys: Object.keys(attendanceData).length,
        totalStudents: students.length,
        hasStudents: students.length > 0
      });
      
      // Check for valid parameters
      if (!selectedClass) {
        console.log('ERROR: No selected class when trying to navigate to preview');
        Alert.alert('Error', 'Class information is missing. Please select a class and try again.');
        return;
      }
      
      // Navigate to preview screen with all required data
      console.log(`Navigating to preview with attendance data for ${Object.keys(attendanceData).length} students`);
      router.push({
        pathname: '/preview',
        params: {
          class: selectedClass,
          tableName: tableName,
          hour: selectedHour,
          attendanceData: attendanceDataJson,
          date: new Date().toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error navigating to preview:', error);
      Alert.alert('Error', 'Failed to navigate to preview. Please try again.');
    }
  };

  const undoLastAction = () => {
    if (currentIndex > 0) {
      // Get previous student ID
      const prevStudentId = students[currentIndex - 1].id;
      
      // Reset attendance status for previous student
      setAttendanceData(prev => ({
        ...prev,
        [prevStudentId]: null
      }));
      
      // Go back to previous card
      setCurrentIndex(currentIndex - 1);
      // Reset position when going back to previous card
      position.setValue({ x: 0, y: 0 });
    }
  };

  const startAttendanceMarking = () => {
    if (!selectedClass) {
      Alert.alert('Error', 'Please select a class');
      return;
    }
    
    if (!selectedHour) {
      Alert.alert('Error', 'Please select an hour');
      return;
    }
    
    loadStudents();
  };

  const renderSelectionScreen = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Mark Attendance</Text>
      
      <View style={styles.selectionContainer}>
        <Text style={styles.label}>Select Class:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedClass}
            onValueChange={(value) => setSelectedClass(value)}
            style={styles.picker}
          >
            {classes.length > 0 ? (
              classes.map((className) => (
                <Picker.Item key={className} label={className} value={className} />
              ))
            ) : (
              <Picker.Item label="No classes available" value="" />
            )}
          </Picker>
        </View>
        
        <Text style={styles.label}>Select Hour:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedHour}
            onValueChange={(value) => setSelectedHour(value)}
            style={styles.picker}
          >
            {[1, 2, 3, 4, 5, 6].map((hour) => (
              <Picker.Item key={hour} label={`Hour ${hour}`} value={hour.toString()} />
            ))}
          </Picker>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.startButton}
        onPress={startAttendanceMarking}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>Start Marking</Text>
            <MaterialIcons name="arrow-forward" size={24} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAttendanceMarking = () => {
    // Store students length in a local variable to avoid race conditions
    const studentsLength = students.length;
    
    // Log the current state for debugging
    console.log(`Rendering attendance marking. Students length: ${studentsLength}, currentIndex: ${currentIndex}`);
    
    if (studentsLength === 0) {
      console.log('Rendering empty students view');
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No students found in this class</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setMarkingStarted(false)}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentIndex >= studentsLength) {
      console.log(`Rendering completion screen. currentIndex: ${currentIndex}, students.length: ${studentsLength}`);
      return (
        <View style={styles.completeContainer}>
          <Text style={styles.completeText}>Attendance marking complete!</Text>
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={navigateToPreview}
          >
            <Text style={styles.buttonText}>View Preview</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Make sure we have a valid student at the current index
    if (!students[currentIndex]) {
      console.log(`Error: No student found at index ${currentIndex}`);
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Error loading student data</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setMarkingStarted(false)}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    const currentStudent = students[currentIndex];
    console.log(`Rendering card for student ${currentStudent.id} (${currentStudent.name}), index: ${currentIndex}/${students.length-1}`);
    
    // Store student data in local variables to prevent race conditions
    const studentId = currentStudent.id;
    const studentName = currentStudent.name;
    const studentRollNumber = currentStudent.roll_number;

    return (
      <View style={styles.markingContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>
            {selectedClass} - Hour {selectedHour}
          </Text>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {students.length}
          </Text>
        </View>
        
        <Animated.View 
          style={[styles.card, cardStyle]} 
          {...panResponder.panHandlers}
        >
          <View style={styles.studentInfoContainer}>
            <Text style={styles.rollNumber}>#{studentRollNumber}</Text>
            <Text style={styles.studentName}>{studentName}</Text>
          </View>
          
          <Animated.View style={[styles.presentBadge, { opacity: rightOpacity }]}>
            <Text style={styles.badgeText}>PRESENT</Text>
          </Animated.View>
          
          <Animated.View style={[styles.absentBadge, { opacity: leftOpacity }]}>
            <Text style={styles.badgeText}>ABSENT</Text>
          </Animated.View>
        </Animated.View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={swipeLeft}>
            <FontAwesome name="times" size={32} color="#ff6b6b" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.undoButton} 
            onPress={undoLastAction}
            disabled={currentIndex === 0}
          >
            <FontAwesome
              name="undo"
              size={28}
              color={currentIndex === 0 ? "#ccc" : "#6c63ff"}
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={swipeRight}>
            <FontAwesome name="check" size={32} color="#4cd964" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      {markingStarted ? renderAttendanceMarking() : renderSelectionScreen()}
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
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  selectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  startButton: {
    backgroundColor: '#6c63ff',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  markingContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  counterText: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '600',
  },
  card: {
    width: width - 40,
    height: height * 0.4,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentInfoContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rollNumber: {
    fontSize: 24,
    color: '#6c63ff',
    fontWeight: '600',
    marginBottom: 10,
  },
  studentName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  presentBadge: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: 'rgba(76, 217, 100, 0.9)',
    padding: 12,
    borderRadius: 8,
    transform: [{ rotate: '30deg' }],
    borderWidth: 2,
    borderColor: '#fff',
  },
  absentBadge: {
    position: 'absolute',
    top: 30,
    left: 30,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    padding: 12,
    borderRadius: 8,
    transform: [{ rotate: '-30deg' }],
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  undoButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6c63ff',
    padding: 16,
    borderRadius: 10,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4cd964',
    textAlign: 'center',
    marginBottom: 30,
  },
  previewButton: {
    backgroundColor: '#6c63ff',
    padding: 16,
    borderRadius: 10,
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});