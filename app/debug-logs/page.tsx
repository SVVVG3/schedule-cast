'use client';

import { useEffect, useState } from 'react';

interface DebugLog {
  id: string;
  event: string;
  data: string;
  fid: number | null;
  timestamp: string;
  user_agent: string;
}

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filterFid, setFilterFid] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const url = filterFid 
        ? `/api/debug-log?fid=${filterFid}&limit=100`
        : '/api/debug-log?limit=100';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterFid]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLogs, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, filterFid]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatData = (dataStr: string) => {
    try {
      const data = JSON.parse(dataStr);
      return JSON.stringify(data, null, 2);
    } catch {
      return dataStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Debug Logs</h1>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Filter by FID (e.g. 481970)"
              value={filterFid}
              onChange={(e) => setFilterFid(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Refresh
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
          </div>
          
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-gray-500">No debug logs found</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-4">
                      <span className="font-semibold text-blue-600">{log.event}</span>
                      {log.fid && (
                        <span className="text-sm bg-blue-100 px-2 py-1 rounded">
                          FID: {log.fid}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  {log.data && log.data !== '{}' && (
                    <pre className="bg-white border p-3 rounded text-sm overflow-x-auto">
                      {formatData(log.data)}
                    </pre>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-2">
                    User Agent: {log.user_agent}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 