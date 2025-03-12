# Database Schema Overview

This document provides an overview of the database schema, including tables, columns, data types, nullability, and default values.

## Tables and Columns

### attendance_records
- **id**: uuid, NOT NULL, Default: gen_random_uuid()
- **session_id**: uuid, Nullable
- **student_register_no**: numeric, NOT NULL
- **student_roll_no**: numeric, NOT NULL
- **status**: boolean, NOT NULL
- **created_at**: timestamp with time zone, Nullable, Default: now()
- **updated_at**: timestamp with time zone, Nullable, Default: now()
- **student_name**: text, NOT NULL

### attendance_sessions
- **id**: uuid, NOT NULL, Default: gen_random_uuid()
- **teacher_id**: bigint, Nullable
- **session_date**: date, NOT NULL
- **period**: integer, NOT NULL
- **finalized**: boolean, Nullable, Default: false
- **created_at**: timestamp with time zone, Nullable, Default: now()
- **updated_at**: timestamp with time zone, Nullable, Default: now()
- **class_name**: text, NOT NULL

### departments
- **id**: integer, NOT NULL, Default: nextval('departments_id_seq'::regclass)
- **dept_code**: character varying, NOT NULL
- **dept_name**: character varying, NOT NULL
- **created_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP

### classes
- **id**: integer, NOT NULL, Default: nextval('classes_id_seq'::regclass)
- **dept_id**: integer, Nullable
- **year**: integer, NOT NULL
- **batch**: character varying, NOT NULL
- **class_code**: character varying, NOT NULL
- **table_name**: character varying, NOT NULL
- **created_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP

### ita
- **id**: bigint, NOT NULL
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable
- **name**: text, Nullable

### itb
- **id**: bigint, NOT NULL
- **roll_no**: numeric, Nullable
- **register_no**: numeric, Nullable
- **name**: text, Nullable

### teachers
- **id**: bigint, NOT NULL
- **Phone No**: numeric, Nullable
- **auth_user_id**: uuid, Nullable
- **dept_id**: integer, Nullable
- **default_dept_id**: integer, Nullable
- **created_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP
- **updated_at**: timestamp with time zone, Nullable, Default: CURRENT_TIMESTAMP
- **email**: text, Nullable
- **Name**: text, Nullable

### class_table_map
- **class_code**: character varying, Nullable
- **table_name**: character varying, Nullable

This schema provides a comprehensive view of the database structure, detailing the relationships and constraints within the system. 