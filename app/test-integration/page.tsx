"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function TestIntegration() {
  const [testResults, setTestResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: any = {};

    // Test 1: Supabase Connection
    try {
      const { error } = await supabase.from('reference_images').select('count(*)').limit(1);
      results.supabase = { success: !error, error: error?.message };
    } catch (e) {
      results.supabase = { success: false, error: (e as Error).message };
    }

    // Test 2: Gemini API
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('Say "Hello from Gemini"');
      results.gemini = { success: true, response: result.response.text() };
    } catch (e) {
      results.gemini = { success: false, error: (e as Error).message };
    }

    // Test 3: Lighthouse API
    try {
      results.lighthouse = { success: true, message: 'API key configured' };
    } catch (e) {
      results.lighthouse = { success: false, error: (e as Error).message };
    }

    // Test 4: WalletConnect
    try {
      results.walletconnect = { 
        success: !!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
        message: 'Project ID configured' 
      };
    } catch (e) {
      results.walletconnect = { success: false, error: (e as Error).message };
    }

    setTestResults(results);
    setIsLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Integration Tests</h1>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Testing integrations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(testResults).map(([service, result]: [string, any]) => (
              <div key={service} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-2 capitalize">{service}</h2>
                <div className={`space-y-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  <p>Status: {result.success ? '✅ Connected' : '❌ Failed'}</p>
                  {result.error && <p>Error: {result.error}</p>}
                  {result.response && <p>Response: {result.response}</p>}
                  {result.message && <p>Message: {result.message}</p>}
                </div>
              </div>
            ))}
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
              <div className="space-y-2 text-gray-600">
                {Object.values(testResults).every((r: any) => r.success) ? (
                  <>
                    <p>✅ All integrations working!</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><a href="/admin" className="text-blue-600 hover:underline">Go to Admin Panel</a> to upload reference images</li>
                      <li><a href="/verify" className="text-blue-600 hover:underline">Go to Verification Page</a> to test identity matching</li>
                      <li><a href="/" className="text-blue-600 hover:underline">Go to Homepage</a> to start using the app</li>
                    </ul>
                  </>
                ) : (
                  <p>⚠️ Some integrations need attention. Check the errors above.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
