"use client";
import { useState, useEffect } from "react";
import { setupDatabase } from "@/lib/database-setup";

export default function DatabaseSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    setStatus('Setting up database...');
    
    try {
      const success = await setupDatabase();
      setIsSuccess(success);
      setStatus(success ? '✅ Database setup completed successfully!' : '❌ Database setup failed. Please run the SQL manually in Supabase.');
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Setup</h1>
          <p className="text-gray-600">
            Initialize the Supabase database tables for Identity Matcher
          </p>
        </div>

        {status && (
          <div className={`p-4 rounded-md text-sm ${isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {status}
          </div>
        )}

        <button
          onClick={handleSetup}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Setting up...' : 'Setup Database'}
        </button>

        {isSuccess && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              You can now use the identity matcher system.
            </p>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Go to Homepage →
            </a>
          </div>
        )}

        {!isSuccess && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Manual Setup Instructions:</h3>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Open Supabase Dashboard</li>
              <li>Go to SQL Editor</li>
              <li>Copy contents of <code className="bg-gray-100 px-1">supabase-schema.sql</code></li>
              <li>Paste and run the SQL script</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
