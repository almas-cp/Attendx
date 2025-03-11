import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Stack } from 'expo-router';

export default function TestDatabase() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Function to run test queries
  const runTests = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Log the results
      const addResult = (name: string, data: any) => {
        setResults(prev => [...prev, { name, data }]);
      };

      // Test 1: Check if we can connect to Supabase
      addResult('Supabase Connection', 'Testing...');
      try {
        const { data, error } = await supabase.from('_alive').select('*');
        addResult('Supabase Connection', {
          success: !error,
          error: error?.message || 'none'
        });
      } catch (e: any) {
        addResult('Supabase Connection', {
          success: false,
          error: e.message || String(e)
        });
      }

      // Test 2: List all tables
      addResult('List Tables', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        addResult('List Tables', {
          success: !error,
          tables: data?.map(t => t.table_name) || [],
          error: error?.message || 'none'
        });
      } catch (e: any) {
        addResult('List Tables', {
          success: false,
          error: e.message || String(e)
        });
      }

      // Test 3: Check ITA table directly
      addResult('ITA Table', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('ita')
          .select('*');
        
        addResult('ITA Table', {
          success: !error,
          count: data?.length || 0,
          sample: data && data.length > 0 ? data[0] : null,
          error: error?.message || 'none'
        });
      } catch (e: any) {
        addResult('ITA Table', {
          success: false,
          error: e.message || String(e)
        });
      }

      // Test 4: Try with uppercase table name
      addResult('ITA Table (Uppercase)', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('ITA')
          .select('*');
        
        addResult('ITA Table (Uppercase)', {
          success: !error,
          count: data?.length || 0,
          error: error?.message || 'none'
        });
      } catch (e: any) {
        addResult('ITA Table (Uppercase)', {
          success: false,
          error: e.message || String(e)
        });
      }

      // Test 5: Check columns in ITA table
      addResult('ITA Columns', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'ita')
          .eq('table_schema', 'public');
        
        addResult('ITA Columns', {
          success: !error,
          columns: data || [],
          error: error?.message || 'none'
        });
      } catch (e: any) {
        addResult('ITA Columns', {
          success: false,
          error: e.message || String(e)
        });
      }

      // Test 6: check RLS policies
      addResult('RLS Policies', 'Testing...');
      try {
        const { data, error } = await supabase
          .from('pg_policy')
          .select('*');
        
        addResult('RLS Policies', {
          success: !error,
          policies: data || [],
          error: error?.message || 'none'
        });
      } catch (e: any) {
        addResult('RLS Policies', {
          success: false,
          error: e.message || String(e)
        });
      }

    } catch (e: any) {
      setResults(prev => [...prev, { 
        name: 'Overall Error', 
        data: { error: e.message || String(e) } 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Run the tests automatically on component mount
  useEffect(() => {
    runTests();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Database Tests' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Database Connection Tests</Text>
        <Button 
          title={loading ? "Testing..." : "Run Tests Again"} 
          onPress={runTests} 
          disabled={loading} 
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Running database tests...</Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultTitle}>{result.name}</Text>
            <Text style={styles.resultData}>
              {typeof result.data === 'string' 
                ? result.data 
                : JSON.stringify(result.data, null, 2)}
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultData: {
    fontFamily: 'monospace',
  },
}); 