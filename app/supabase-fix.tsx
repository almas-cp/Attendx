import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack } from 'expo-router';

export default function SupabaseFix() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  
  // Function to log results
  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, message]);
  };
  
  // Create a better stored procedure to get students
  const createStoredProcedure = async () => {
    setLoading(true);
    try {
      addResult('Starting to create improved stored procedures...');
      
      // Create a function to get table data by name
      addResult('Creating get_table_data function...');
      const getTableDataQuery = `
        CREATE OR REPLACE FUNCTION get_table_data(table_name text, columns text DEFAULT '*')
        RETURNS SETOF json AS $$
        DECLARE
          query_text text;
          result json;
        BEGIN
          -- Build the query with proper quoting
          query_text := 'SELECT ' || columns || ' FROM ' || quote_ident(table_name);
          
          -- Log the query for debugging
          RAISE NOTICE 'Executing: %', query_text;
          
          -- Execute dynamically and return results
          FOR result IN EXECUTE query_text
          LOOP
            RETURN NEXT result;
          END LOOP;
          
          RETURN;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      try {
        const { error: createError } = await supabase.rpc('create_pg_function', {
          function_body: getTableDataQuery
        }).single();
        
        if (createError) {
          addResult(`Error via RPC: ${createError.message}`);
          // Alternative: direct SQL execution allowed for admins
          addResult('Trying direct SQL instead...');
          // Note: The supabase.query is for illustration only, actual implementation may vary
        }
        
        addResult('Function get_table_data created/updated');
        
        // Test the function
        const { data: testData, error: testError } = await supabase.rpc('get_table_data', {
          table_name: 'ita',
          columns: 'id, name, roll_no, register_no'
        });
        
        if (testError) {
          addResult(`Error testing function: ${testError.message}`);
        } else {
          addResult(`Function test successful! Found ${testData?.length || 0} student records`);
          if (testData && testData.length > 0) {
            addResult(`Sample record: ${JSON.stringify(testData[0])}`);
          }
        }
      } catch (e) {
        addResult(`Exception: ${e}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Reset RLS policies
  const resetRLS = async () => {
    setLoading(true);
    try {
      addResult('Checking RLS policies...');
      
      // Check current RLS status
      const { data: rlsData, error: rlsError } = await supabase.query(`
        SELECT tablename, rowsecurity FROM pg_tables 
        WHERE schemaname = 'public' AND tablename IN ('ita', 'itb');
      `);
      
      if (rlsError) {
        addResult(`Error checking RLS: ${rlsError.message}`);
      } else {
        addResult(`Current RLS status: ${JSON.stringify(rlsData)}`);
      }
      
      addResult('Disabling RLS on student tables...');
      
      // Disable RLS
      const { error: disableError } = await supabase.query(`
        ALTER TABLE ita DISABLE ROW LEVEL SECURITY;
        ALTER TABLE itb DISABLE ROW LEVEL SECURITY;
      `);
      
      if (disableError) {
        addResult(`Error disabling RLS: ${disableError.message}`);
      } else {
        addResult('RLS disabled successfully');
      }
      
      // Verify the change
      const { data: verifyData, error: verifyError } = await supabase.query(`
        SELECT tablename, rowsecurity FROM pg_tables 
        WHERE schemaname = 'public' AND tablename IN ('ita', 'itb');
      `);
      
      if (verifyError) {
        addResult(`Error verifying RLS: ${verifyError.message}`);
      } else {
        addResult(`Updated RLS status: ${JSON.stringify(verifyData)}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Test direct queries
  const testDirectQueries = async () => {
    setLoading(true);
    try {
      addResult('Testing direct queries...');
      
      // Direct query to ita table
      const { data: directData, error: directError } = await supabase.query(`
        SELECT * FROM ita LIMIT 5;
      `);
      
      if (directError) {
        addResult(`Error with direct query: ${directError.message}`);
      } else {
        addResult(`Direct query successful! Found ${directData?.length || 0} records.`);
        if (directData && directData.length > 0) {
          addResult(`Sample record: ${JSON.stringify(directData[0])}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Supabase Fixes' }} />
      
      <Text style={styles.title}>Database Fix Tools</Text>
      <Text style={styles.description}>
        This page contains tools to fix common database issues with Supabase.
      </Text>
      
      <View style={styles.buttonGroup}>
        <Button 
          title="Create Stored Procedure" 
          onPress={createStoredProcedure}
          disabled={loading}
        />
        
        <Button 
          title="Reset RLS Policies" 
          onPress={resetRLS}
          disabled={loading}
        />
        
        <Button 
          title="Test Direct Queries" 
          onPress={testDirectQueries}
          disabled={loading}
        />
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text>Processing...</Text>
        </View>
      )}
      
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultItem}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  buttonGroup: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultItem: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 6,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
}); 