"use client";

import { useState } from "react";

export default function ApiTest() {
  const [result, setResult] = useState<any>(null);
  
  const testApi = async () => {
    try {
      const response = await fetch('/api/hello');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('API test failed:', error);
      setResult({ error: 'API test failed' });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      <button 
        onClick={testApi}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test API
      </button>
      
      {result && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
