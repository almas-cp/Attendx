# Attendx - Mobile Attendance Tracking App

A React Native mobile application built with Expo for tracking student attendance with a Tinder-like swiping interface.

## Features

- Teacher authentication via phone number
- Class, date, and period selection
- Tinder-like swipe interface for marking attendance (swipe left for absent, right for present)
- Undo functionality to revert attendance marking
- Preview and finalization of attendance records
- Attendance data stored in Supabase database
- JSON backup stored in Supabase storage
- Enhanced logging for troubleshooting
- Improved error handling and connection verification

## Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- Supabase account with the proper tables set up

## Database Setup

Before running the app, make sure your Supabase database has the following structure:

1. Class tables (IT-A, IT-B, etc.) with the following columns:
   - id (bigint, primary key)
   - Name (text)
   - Roll No (numeric)
   - Register No (numeric)

2. Teachers table with the following columns:
   - id (bigint, primary key)
   - Name (text)
   - Phone No (numeric)

3. Create these tables using SQL:

```sql
-- Create the attendance_sessions table to track each attendance session
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    teacher_id BIGINT REFERENCES teachers(id),
    session_date DATE NOT NULL,
    period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 6),
    finalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(class_name, session_date, period)
);

-- Create the attendance_records table to store individual student attendance
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_register_no NUMERIC NOT NULL,
    student_roll_no NUMERIC NOT NULL,
    student_name TEXT NOT NULL,
    status BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, student_register_no)
);
```

4. Create a storage bucket named "ledger" in your Supabase project

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/attendx.git
cd attendx
```

2. Install dependencies:
```
npm install
```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase credentials.

## Running the App

```
npm start
```

This will start the Expo development server. You can run the app on:
- Android device/emulator using `npm run android`
- iOS device/simulator using `npm run ios` (requires a Mac)
- Web browser using `npm run web`

## Architecture and Code Organization

The app follows a clear structure:

- `src/lib/supabase.ts` - Centralized Supabase client with connection verification
- `src/navigation/AppNavigator.tsx` - Navigation structure with typed routes
- `src/screens/` - Screen components for each view in the app
- `App.tsx` - Main entry point with environment checking

## Debugging and Troubleshooting

### Supabase Connection Issues

The app includes enhanced logging for Supabase connections. Check your console logs for:
- `=== Supabase Client Initialization ===` - Shows whether credentials are properly configured
- `✅ Supabase connection successful!` - Indicates successful connection
- `❌ Supabase connection failed!` - Shows when connection fails, with detailed error information

### Navigation Tracking

Navigation events are logged with `=== Navigation: Navigated to "ScreenName" ===` format to help trace user flow.

## Additional Dependencies

The app uses the following key packages:
- @supabase/supabase-js for database access
- react-native-deck-swiper for the Tinder-like swipe interface
- @react-navigation for app navigation
- react-native-elements and other UI packages

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
