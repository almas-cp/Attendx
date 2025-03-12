import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

// Try to get values from environment variables first
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string;

// Fallback to hardcoded values if environment variables are not available
if (!supabaseUrl) {
  supabaseUrl = 'https://lrkjzxjeyctlnxobmtyt.supabase.co';
  console.log('⚠️ Using fallback supabaseUrl:', supabaseUrl);
}

if (!supabaseAnonKey) {
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxya2p6eGpleWN0bG54b2JtdHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NzUwOTIsImV4cCI6MjA1NzI1MTA5Mn0.iH2dXGqgjUM9xwVyVgNbQvobFdMAf4eDoIjsof-hiM0';
  console.log('⚠️ Using fallback supabaseAnonKey');
}

console.log('🔐 Initializing Supabase client with URL:', supabaseUrl);

// Create a custom storage implementation that we can control
class ControlledStorage {
  // In-memory storage for current session
  private memoryStorage: Record<string, string> = {};
  // Flag to determine if we should persist to AsyncStorage for future sessions
  private shouldPersistToDisk: boolean = false;
  
  // Set whether sessions should be persisted between app launches
  setRememberMe(remember: boolean) {
    console.log(`🔐 Setting session persistence to: ${remember ? 'ON' : 'OFF'}`);
    this.shouldPersistToDisk = remember;
  }
  
  async getItem(key: string): Promise<string | null> {
    // First check in-memory storage (for current session)
    if (this.memoryStorage[key]) {
      return this.memoryStorage[key];
    }
    
    // Only check disk storage if persistence is enabled
    if (this.shouldPersistToDisk) {
      const diskValue = await AsyncStorage.getItem(key);
      if (diskValue) {
        // Cache in memory for future use
        this.memoryStorage[key] = diskValue;
        return diskValue;
      }
    } else {
      console.log('🔒 Disk persistence disabled, only using in-memory session');
    }
    
    return null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    // Always store in memory for current session
    this.memoryStorage[key] = value;
    
    // Only persist to disk if enabled
    if (this.shouldPersistToDisk) {
      await AsyncStorage.setItem(key, value);
    } else {
      console.log('🔒 Not persisting session to disk, but keeping in memory for current session');
    }
  }
  
  async removeItem(key: string): Promise<void> {
    // Always remove from memory
    delete this.memoryStorage[key];
    
    // Always remove from disk too to be safe
    await AsyncStorage.removeItem(key);
  }
}

// Create our controlled storage instance
export const controlledStorage = new ControlledStorage();

// By default, don't remember sessions
controlledStorage.setRememberMe(false);

// Create client with anonymous key for most operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: controlledStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Create service role client for administrative operations
// This should only be used for operations that require bypassing RLS
export const adminSupabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false // Never persist admin sessions
      }
    })
  : supabase; // Fallback to regular client if service key is not available

// Set up app state change listener to refresh auth token when app comes to foreground
AppState.addEventListener('change', (state) => {
  console.log('📱 App state changed to:', state);
  if (state === 'active') {
    console.log('🔄 App is active, checking authentication session');
    // First check if we have a session before trying to refresh it
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log('🔑 Active session found, refreshing authentication');
        supabase.auth.refreshSession().then(({ data, error }) => {
          if (error) {
            console.error('❌ Session refresh failed:', error.message);
          } else {
            console.log('✅ Session refreshed successfully', data.session ? 'with new session' : 'but no session available');
          }
        });
      } else {
        console.log('ℹ️ No active session to refresh');
      }
    }).catch(error => {
      console.error('❌ Error checking session:', error.message);
    });
  }
});

// Helper functions for authentication
export async function signUpWithEmail(email: string, password: string, name: string) {
  console.log(`📝 Attempting to sign up user with email: ${email} and name: ${name}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    
    if (error) {
      console.error('❌ Sign up failed:', error.message);
    } else {
      console.log('✅ Sign up successful. User data:', data.user ? { id: data.user.id, email: data.user.email } : 'No user data');
      console.log('📧 Confirmation email status:', data.user?.identities?.length === 0 ? 'Already signed up' : 'Email confirmation sent');
      
      // If sign up is successful, automatically create a teacher record for this user
      if (data.user) {
        await createTeacherRecord(data.user.id, {
          name: name || data.user.email?.split('@')[0] || 'New Teacher',
          email: data.user.email || '',
          phone: '9999999999' // default placeholder
        });
      }
    }
    
    return { data, error };
  } catch (exception) {
    console.error('💥 Unexpected error during sign up:', exception);
    throw exception;
  }
}

// Function to create a teacher record for a new user
async function createTeacherRecord(userId: string, userData: { name: string, email: string, phone: string }) {
  console.log('👨‍🏫 Creating new teacher record for user:', userId);
  
  try {
    // Use admin client to bypass RLS
    const { data, error } = await adminSupabase
      .from('teachers')
      .insert({
        "Name": userData.name,
        "Phone No": userData.phone,
        "auth_user_id": userId,
        "email": userData.email
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Failed to create teacher record:', error.message);
      return null;
    }
    
    console.log('✅ Teacher record created successfully:', data);
    return data;
  } catch (error) {
    console.error('💥 Unexpected error creating teacher record:', error);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string, rememberMe: boolean = false) {
  console.log(`🔑 Attempting to sign in user with email: ${email}, remember session: ${rememberMe}`);
  
  // Set storage persistence based on rememberMe flag
  controlledStorage.setRememberMe(rememberMe);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
    } else {
      console.log('✅ Sign in successful. User ID:', data.user?.id);
      console.log('🎫 Session expires at:', data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'Unknown');
      console.log('💾 Session will be ' + (rememberMe ? 'remembered' : 'forgotten') + ' after app close');
    }
    
    return { data, error };
  } catch (exception) {
    console.error('💥 Unexpected error during sign in:', exception);
    throw exception;
  }
}

export async function signOut() {
  console.log('🚪 Attempting to sign out user');
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out failed:', error.message);
    } else {
      console.log('✅ Sign out successful');
      // Reset remember me to false on sign out
      controlledStorage.setRememberMe(false);
    }
    
    return { error };
  } catch (exception) {
    console.error('💥 Unexpected error during sign out:', exception);
    throw exception;
  }
}

export async function getCurrentUser() {
  console.log('👤 Getting current user info');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Error getting current user:', error.message);
      return null;
    }
    
    if (user) {
      console.log('✅ Current user retrieved. User ID:', user.id);
    } else {
      console.log('ℹ️ No user currently logged in');
    }
    
    return user;
  } catch (exception) {
    console.error('💥 Unexpected error getting current user:', exception);
    return null;
  }
}

export async function getUserProfile() {
  console.log('👤 Fetching user profile from database');
  
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('⚠️ Cannot fetch profile - no user is logged in');
      return null;
    }
    
    console.log('🔍 Looking up teacher profile with auth_user_id:', user.id);

    // First try using regular authenticated client (uses RLS policies)
    let { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('auth_user_id', user.id)
      .limit(1);
    
    // If no results with standard client, try with admin client
    if ((!teacher || teacher.length === 0) && error?.code !== 'PGRST116') {
      console.log('⚠️ No teacher found with authenticated client, attempting with admin client');
      
      const { data: adminData, error: adminError } = await adminSupabase
        .from('teachers')
        .select('*')
        .eq('auth_user_id', user.id)
        .limit(1);
      
      if (adminError) {
        console.error('❌ Admin client query error:', adminError.message);
      } else if (adminData && adminData.length > 0) {
        teacher = adminData;
        console.log('✅ Teacher found using admin client');
      }
    }
    
    // If the teacher was found, return profile data
    if (teacher && teacher.length > 0) {
      const teacherData = teacher[0];
      console.log('✅ Teacher profile retrieved. Name:', teacherData.Name);
      
      return {
        id: teacherData.id.toString(),
        name: teacherData.Name,
        email: teacherData.email || user.email || '',
        created_at: user.created_at || new Date().toISOString()
      };
    }
    
    // If no teacher was found, check if we should create one
    if (user.email) {
      console.log('🔍 No teacher found, checking for record by email:', user.email);
      
      const { data: emailMatches, error: emailError } = await adminSupabase
        .from('teachers')
        .select('*')
        .eq('email', user.email)
        .limit(1);
      
      if (!emailError && emailMatches && emailMatches.length > 0) {
        // Found by email, update the auth_user_id
        const teacherData = emailMatches[0];
        console.log('✅ Teacher found by email, updating auth_user_id');
        
        const { error: updateError } = await adminSupabase
          .from('teachers')
          .update({ auth_user_id: user.id })
          .eq('id', teacherData.id);
        
        if (updateError) {
          console.error('❌ Failed to update auth_user_id:', updateError.message);
        }
        
        return {
          id: teacherData.id.toString(),
          name: teacherData.Name,
          email: teacherData.email || user.email,
          created_at: user.created_at || new Date().toISOString()
        };
      }
      
      // No existing teacher found, create a new teacher record
      console.log('🔄 Creating new teacher record for existing user');
      const newTeacher = await createTeacherRecord(user.id, {
        name: user.user_metadata?.name || user.email.split('@')[0] || 'Teacher',
        email: user.email,
        phone: '9999999999' // default placeholder
      });
      
      if (newTeacher) {
        return {
          id: newTeacher.id.toString(),
          name: newTeacher.Name,
          email: newTeacher.email || user.email,
          created_at: user.created_at || new Date().toISOString()
        };
      }
    }
    
    // Last resort fallback
    console.log('⚠️ Creating temporary profile as no teacher record could be created');
    return {
      id: '0',
      name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Teacher'),
      email: user.email || '',
      created_at: user.created_at || new Date().toISOString()
    };
  } catch (exception) {
    console.error('💥 Unexpected error fetching user profile:', exception);
    return null;
  }
}

// New functions to populate database tables

// Create departments
export async function createDepartments() {
  console.log('🏫 Creating department records');
  
  try {
    const departments = [
      { dept_code: 'IT', dept_name: 'Information Technology' },
      { dept_code: 'CSE', dept_name: 'Computer Science Engineering' },
      { dept_code: 'ECE', dept_name: 'Electronics and Communication Engineering' },
      { dept_code: 'EEE', dept_name: 'Electrical and Electronics Engineering' },
      { dept_code: 'MECH', dept_name: 'Mechanical Engineering' }
    ];
    
    const { data, error } = await adminSupabase
      .from('departments')
      .upsert(departments, { onConflict: 'dept_code' })
      .select();
      
    if (error) {
      console.error('❌ Failed to create departments:', error.message);
      return null;
    }
    
    console.log('✅ Departments created successfully:', data.length);
    return data;
  } catch (error) {
    console.error('💥 Unexpected error creating departments:', error);
    return null;
  }
}

// Create classes
export async function createClasses() {
  console.log('🏛️ Creating class records');
  
  try {
    // First get department IDs
    const { data: depts, error: deptError } = await adminSupabase
      .from('departments')
      .select('id, dept_code');
      
    if (deptError || !depts) {
      console.error('❌ Failed to fetch departments:', deptError?.message);
      return null;
    }
    
    // Find IT department ID
    const itDept = depts.find(d => d.dept_code === 'IT');
    if (!itDept) {
      console.error('❌ IT department not found');
      return null;
    }
    
    const classes = [
      { 
        dept_id: itDept.id, 
        year: 1, 
        batch: 'A', 
        class_code: '1IT-A', 
        table_name: 'ita' 
      },
      { 
        dept_id: itDept.id, 
        year: 1, 
        batch: 'B', 
        class_code: '1IT-B', 
        table_name: 'itb' 
      },
      { 
        dept_id: itDept.id, 
        year: 2, 
        batch: 'A', 
        class_code: '2IT-A', 
        table_name: 'ita' 
      },
      { 
        dept_id: itDept.id, 
        year: 2, 
        batch: 'B', 
        class_code: '2IT-B', 
        table_name: 'itb' 
      }
    ];
    
    const { data, error } = await adminSupabase
      .from('classes')
      .upsert(classes, { onConflict: 'class_code' })
      .select();
      
    if (error) {
      console.error('❌ Failed to create classes:', error.message);
      return null;
    }
    
    // Also update class_table_map
    const classTableMaps = classes.map(c => ({
      class_code: c.class_code,
      table_name: c.table_name
    }));
    
    const { error: mapError } = await adminSupabase
      .from('class_table_map')
      .upsert(classTableMaps, { onConflict: 'class_code' });
      
    if (mapError) {
      console.error('❌ Failed to update class_table_map:', mapError.message);
    }
    
    console.log('✅ Classes created successfully:', data.length);
    return data;
  } catch (error) {
    console.error('💥 Unexpected error creating classes:', error);
    return null;
  }
}

// Create sample attendance sessions
export async function createSampleAttendanceSessions(teacherId: string) {
  console.log('📋 Creating sample attendance sessions for teacher:', teacherId);
  
  try {
    // Get classes
    const { data: classes, error: classError } = await adminSupabase
      .from('classes')
      .select('id, class_code');
      
    if (classError || !classes || classes.length === 0) {
      console.error('❌ Failed to fetch classes:', classError?.message);
      return null;
    }
    
    // Create one session for each class for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const sessions = classes.map((cls, index) => ({
      teacher_id: parseInt(teacherId),
      session_date: today,
      period: index + 1, // Different period for each class
      class_name: cls.class_code,
      finalized: false
    }));
    
    const { data, error } = await adminSupabase
      .from('attendance_sessions')
      .insert(sessions)
      .select();
      
    if (error) {
      console.error('❌ Failed to create attendance sessions:', error.message);
      return null;
    }
    
    console.log('✅ Sample attendance sessions created:', data.length);
    return data;
  } catch (error) {
    console.error('💥 Unexpected error creating attendance sessions:', error);
    return null;
  }
}

// Initialize database with sample data
export async function initializeDatabaseWithSampleData(teacherId: string) {
  console.log('🚀 Initializing database with sample data');
  
  try {
    // Create departments
    const departments = await createDepartments();
    if (!departments) {
      console.error('❌ Failed to create departments');
      return false;
    }
    
    // Create classes
    const classes = await createClasses();
    if (!classes) {
      console.error('❌ Failed to create classes');
      return false;
    }
    
    // Create sample attendance sessions
    const sessions = await createSampleAttendanceSessions(teacherId);
    if (!sessions) {
      console.error('❌ Failed to create sample attendance sessions');
      return false;
    }
    
    console.log('✅ Database initialized successfully with sample data');
    return true;
  } catch (error) {
    console.error('💥 Unexpected error initializing database:', error);
    return false;
  }
}