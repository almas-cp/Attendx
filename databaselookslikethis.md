# Database Schema Overview

This document provides an overview of the database schema, including tables, columns, data types, nullability, constraints, and relationships.

## Tables and Columns

### attendance_records
- **id**: uuid, NOT NULL, Default: gen_random_uuid(), PRIMARY KEY
- **session_id**: uuid, Nullable, FOREIGN KEY references attendance_sessions(id)
- **student_register_no**: numeric, NOT NULL, UNIQUE
- **student_roll_no**: numeric, NOT NULL
- **student_name**: text, NOT NULL
- **status**: boolean, NOT NULL
- **created_at**: timestamp with time zone, Nullable, Default: now()
- **updated_at**: timestamp with time zone, Nullable, Default: now()

### attendance_sessions
- **id**: uuid, NOT NULL, Default: gen_random_uuid(), PRIMARY KEY
- **class_name**: text, NOT NULL, UNIQUE
- **teacher_id**: bigint, Nullable, FOREIGN KEY references teachers(id)
- **session_date**: date, NOT NULL, UNIQUE
- **period**: integer, NOT NULL, UNIQUE
- **finalized**: boolean, Nullable, Default: false
- **created_at**: timestamp with time zone, Nullable, Default: now()
- **updated_at**: timestamp with time zone, Nullable, Default: now()

### departments
- **id**: integer, NOT NULL, Default: nextval('departments_id_seq'::regclass), PRIMARY KEY
- **dept_code**: character varying, NOT NULL, UNIQUE
- **dept_name**: character varying, NOT NULL
- **created_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP

### classes
- **id**: integer, NOT NULL, Default: nextval('classes_id_seq'::regclass), PRIMARY KEY
- **dept_id**: integer, Nullable, UNIQUE, FOREIGN KEY references departments(id)
- **year**: integer, NOT NULL, UNIQUE
- **batch**: character varying, NOT NULL, UNIQUE
- **class_code**: character varying, NOT NULL, UNIQUE
- **table_name**: character varying, NOT NULL, UNIQUE
- **created_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP

### teachers
- **id**: bigint, NOT NULL, PRIMARY KEY
- **Name**: text, Nullable
- **Phone No**: numeric, Nullable
- **auth_user_id**: uuid, Nullable
- **email**: text, Nullable
- **dept_id**: integer, Nullable
- **default_dept_id**: integer, Nullable
- **created_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP
- **updated_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP

### classname
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable

### class_table_map
- **class_code**: character varying, Nullable
- **table_name**: character varying, Nullable

### csea
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### cseb
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### ecea
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### eceb
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### ita
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### itb
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### itc
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

### itd
- **id**: bigint, NOT NULL, PRIMARY KEY
- **name**: text, Nullable
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable

## Foreign Key Relationships

1. **attendance_records.session_id** → **attendance_sessions.id**
2. **attendance_sessions.teacher_id** → **teachers.id**
3. **classes.dept_id** → **departments.id**

## Database Structure Overview

This database appears to be designed for an attendance management system for an educational institution:

1. **Core Tables**: 
   - **departments**: Stores different academic departments
   - **classes**: Contains information about various classes
   - **teachers**: Records teacher information
   - **attendance_sessions**: Tracks individual attendance events
   - **attendance_records**: Stores student attendance for each session

2. **Class-specific Tables**:
   - Individual tables (csea, cseb, ecea, eceb, ita, itb, itc, itd) store student information for specific classes
   - These tables all follow the same structure with id, name, roll_no, and register_no
   - The class_table_map helps map class codes to their respective tables

3. **Relationships**:
   - Teachers can conduct multiple attendance sessions
   - Each attendance session belongs to a specific class and teacher
   - Each attendance record is linked to a specific session
   - Classes belong to departments

This schema provides a comprehensive view of the database structure, detailing the relationships and constraints within the system.