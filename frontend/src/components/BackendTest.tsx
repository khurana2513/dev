// Premium diagnostic component to test backend connectivity
import { useState } from "react";
import { Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function BackendTest() {
  const [results, setResults] = useState<Array<{ time: string; message: string; status: 'success' | 'error' | 'info' }>>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (msg: string, status: 'success' | 'error' | 'info' = 'info') => {
    setResults(prev => [...prev, { 
      time: new Date().toLocaleTimeString(), 
      message: msg,
      status 
    }]);
  };

  const testBackend = async () => {
    setTesting(true);
    setResults([]);
    
    const apiBase = import.meta.env.VITE_API_BASE || "/api";
    addResult(`Testing with API_BASE: ${apiBase}`, 'info');
    
    // Test 1: Health endpoint
    try {
      addResult("Test 1: Testing /health...", 'info');
      const healthRes = await fetch(`${apiBase}/health`);
      const healthText = await healthRes.text();
      if (healthRes.ok) {
        addResult(`✅ Health check passed: ${healthText}`, 'success');
      } else {
        addResult(`❌ Health check failed: ${healthRes.status} - ${healthText}`, 'error');
      }
    } catch (e: any) {
      addResult(`❌ Health check error: ${e.message}`, 'error');
    }
    
    // Test 2: Presets endpoint
    try {
      addResult("Test 2: Testing /presets/AB-1...", 'info');
      const presetsRes = await fetch(`${apiBase}/presets/AB-1`);
      const presetsText = await presetsRes.text();
      if (presetsRes.ok) {
        const data = JSON.parse(presetsText);
        addResult(`✅ Presets loaded: ${data.length} blocks`, 'success');
      } else {
        addResult(`❌ Presets failed: ${presetsRes.status} - ${presetsText}`, 'error');
      }
    } catch (e: any) {
      addResult(`❌ Presets error: ${e.message}`, 'error');
    }
    
    
    // Test 4: Login endpoint
    try {
      addResult("Test 4: Testing /users/login endpoint...", 'info');
      const loginRes = await fetch(`${apiBase}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "test" }),
      });
      const loginText = await loginRes.text();
      if (loginRes.status === 404) {
        addResult(`❌ Login endpoint not found (404) - router may not be included`, 'error');
      } else if (loginRes.status === 401 || loginRes.status === 422) {
        addResult(`✅ Login endpoint exists (${loginRes.status} - expected for invalid token)`, 'success');
      } else {
        addResult(`⚠️ Login endpoint returned: ${loginRes.status} - ${loginText.substring(0, 100)}`, 'error');
      }
    } catch (e: any) {
      addResult(`❌ Login endpoint error: ${e.message}`, 'error');
    }
    
    setTesting(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 border-green-400/30 text-green-100';
      case 'error':
        return 'bg-red-500/20 border-red-400/30 text-red-100';
      default:
        return 'bg-blue-500/20 border-blue-400/30 text-blue-100';
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={testBackend}
        disabled={testing}
        className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {testing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Testing...</span>
          </>
        ) : (
          <>
            <Activity className="w-4 h-4" />
            <span>Test Connection</span>
          </>
        )}
      </button>
      
      {results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-premium">
          {results.map((result, i) => (
            <div 
              key={i} 
              className={`text-xs font-mono p-3 rounded-lg border backdrop-blur-sm ${getStatusColor(result.status)} animate-fade-in`}
            >
              <div className="flex items-start gap-2">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="text-[10px] opacity-70 mb-1">{result.time}</div>
                  <div className="leading-relaxed">{result.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
