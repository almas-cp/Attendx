# Attendx: Mobile Attendance Tracking Application

## Project Overview
Attendx is a mobile attendance marking application built with React Native and Expo, with Supabase as the backend. The application streamlines the attendance marking process for teachers through an intuitive swipe interface.

## Core Functionality
1. Teacher authentication
2. Class, date, and period selection
3. Swipe-based attendance marking (Tinder-like UI)
4. Undo functionality
5. Attendance preview and confirmation
6. Data synchronization with Supabase database

## User Flow
1. **Login Screen**: Teacher logs in to the application
2. **Selection Screen**: Teacher selects the date, hour (1-6), and class 
3. **Attendance Screen**: Teacher marks attendance by swiping student cards
   - Swipe right for present
   - Swipe left for absent
   - Each card displays student roll number and name
   - Undo button to revert the last action and view previous card
4. **Preview Screen**: Table view of all marked attendance for review
5. **Confirmation Screen**: Teacher finalizes the attendance data

## Database Structure
Based on the existing tables (IT-A, IT-B, teachers), the application will use:
- Class tables (IT-A, IT-B, etc.) to store student information
- Teachers table for authentication and teacher data
- Attendance records will be uploaded to a Supabase bucket named "ledger" in JSON format

## Technical Specifications
- **Frontend**: React Native with Expo
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage Bucket ("ledger")

## Supabase Connection Details
- URL: https://lrkjzxjeyctlnxobmtyt.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxya2p6eGpleWN0bG54b2JtdHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NzUwOTIsImV4cCI6MjA1NzI1MTA5Mn0.iH2dXGqgjUM9xwVyVgNbQvobFdMAf4eDoIjsof-hiM0

## Implementation Plan
1. Set up React Native project with Expo
2. Configure Supabase client and authentication
3. Design and implement UI components:
   - Login screen
   - Class/date/period selection screen
   - Swipeable attendance cards
   - Preview table
   - Confirmation screen
4. Implement data synchronization with Supabase
5. Add offline functionality (optional)
6. Testing and bug fixes
7. Deployment

## Future Enhancements (Optional)
- Analytics dashboard for attendance trends
- Student self-registration option
- Push notifications for reminders
- Export functionality (PDF, Excel)
- Integration with academic management systems

## Deployment Strategy
- Build with Expo and deploy to App Store and Google Play
- Use Expo updates for seamless app updates

The application will be developed with React Native and run with Expo for cross-platform compatibility.