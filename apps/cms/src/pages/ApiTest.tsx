import React, { useState } from 'react';
import api from '../lib/api';

export function ApiTest() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testHealth = async () => {
    try {
      setLoading(true);
      addResult('Testing health endpoint...');
      const response = await api.get('/health');
      addResult(`✅ Health: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      addResult(`❌ Health Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    try {
      setLoading(true);
      addResult('Testing login...');
      const response = await api.post('/auth/login', {
        email: 'admin@omega.com',
        password: 'admin123'
      });
      addResult(`✅ Login: ${JSON.stringify(response.data)}`);
      
      // Test auth/me with the token
      const meResponse = await api.get('/auth/me');
      addResult(`✅ User Info: ${JSON.stringify(meResponse.data)}`);
    } catch (error: any) {
      addResult(`❌ Login Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDashboard = async () => {
    try {
      setLoading(true);
      addResult('Testing dashboard...');
      const response = await api.get('/dashboard/summary');
      addResult(`✅ Dashboard: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      addResult(`❌ Dashboard Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testOrders = async () => {
    try {
      setLoading(true);
      addResult('Testing orders...');
      const response = await api.get('/orders');
      addResult(`✅ Orders: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      addResult(`❌ Orders Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">API Test Dashboard</h1>
        <p className="text-gray-400">Test all API endpoints to verify functionality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={testHealth}
          disabled={loading}
          className="btn btn-primary"
        >
          Test Health
        </button>
        <button
          onClick={testLogin}
          disabled={loading}
          className="btn btn-primary"
        >
          Test Login
        </button>
        <button
          onClick={testDashboard}
          disabled={loading}
          className="btn btn-primary"
        >
          Test Dashboard
        </button>
        <button
          onClick={testOrders}
          disabled={loading}
          className="btn btn-primary"
        >
          Test Orders
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={clearResults}
          className="btn btn-secondary"
        >
          Clear Results
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">API Response Log</h2>
        <div className="bg-gray-900 rounded-md p-4 h-96 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-gray-500">Click test buttons to see API responses...</p>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`text-sm font-mono ${
                    result.includes('✅') ? 'text-green-400' : 
                    result.includes('❌') ? 'text-red-400' : 
                    'text-gray-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-100 mt-2">Testing API...</p>
          </div>
        </div>
      )}
    </div>
  );
}
