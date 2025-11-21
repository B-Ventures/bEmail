
import React, { useState, useEffect } from 'react';
import { SmtpConfig } from '../types';
import { seedDatabase, auth, updateUserProfile, subscribeToUserProfile } from '../services/firebase';

interface SettingsScreenProps {
  config: SmtpConfig;
  onSave: (config: SmtpConfig) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ config, onSave }) => {
  const [formData, setFormData] = useState<SmtpConfig>({
      method: 'simulation',
      webhookUrl: '',
      authHeader: '',
      host: '', 
      port: '', 
      username: '', 
      password: '', 
      fromName: '', 
      fromEmail: '', 
      isConfigured: false,
      ...config // Override defaults with props
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; msg: string} | null>(null);
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
      setFormData(prev => ({ ...prev, ...config }));
  }, [config]);

  // Subscribe to User Profile Data
  useEffect(() => {
      if (auth?.currentUser?.uid) {
          const unsub = subscribeToUserProfile(auth.currentUser.uid, (data) => {
              setUserProfile(data);
              setDisplayName(data.displayName || '');
          });
          return () => unsub();
      }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setIsSaved(false);
    setTestResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, isConfigured: true });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (auth?.currentUser?.uid) {
          await updateUserProfile(auth.currentUser.uid, { displayName });
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 3000);
      }
  };

  const handleTestConnection = async () => {
      if (formData.method === 'simulation') {
          setTestResult({ success: true, msg: "Simulation mode is active. No real email sent." });
          return;
      }

      if (!formData.webhookUrl) {
          setTestResult({ success: false, msg: "Please enter a Webhook URL first." });
          return;
      }

      setIsTesting(true);
      setTestResult(null);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (formData.authHeader) {
            headers['Authorization'] = formData.authHeader;
        }

        const response = await fetch(formData.webhookUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                type: 'test_connection',
                to: formData.fromEmail || 'test@example.com',
                subject: 'Test Connection from EmailCourse AI',
                html: '<p>This is a test email to verify your Emailit/Zoho integration.</p>',
                firstName: 'TestUser'
            })
        });

        if (response.ok) {
            setTestResult({ success: true, msg: "Webhook triggered successfully! Check your Emailit/Zoho inbox." });
        } else {
            setTestResult({ success: false, msg: `Server returned ${response.status} ${response.statusText}` });
        }
      } catch (error: any) {
          setTestResult({ success: false, msg: `Network Error: ${error.message}` });
      } finally {
          setIsTesting(false);
      }
  };

  const handleSeedDatabase = async () => {
      if(confirm("This will create a sample Audience and Sequence in your database to verify the connection. Continue?")) {
          try {
              await seedDatabase();
              alert("Success! Sample data created. Refresh your Firebase Console to see the 'audiences' and 'sequences' collections.");
          } catch (e: any) {
              alert("Failed to create data: " + e.message);
          }
      }
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      
      {/* Account Info */}
      <div className="bg-brand-medium rounded-xl shadow-lg border border-brand-light p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Account Management</h2>
          <div className="flex items-center gap-4 mb-6 p-4 bg-brand-dark rounded-lg border border-brand-border">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-red to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {auth?.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                  <p className="text-white font-bold">{auth?.currentUser?.email}</p>
                  <p className="text-xs text-brand-subtext">User ID: {auth?.currentUser?.uid}</p>
                  <p className="text-xs text-brand-subtext mt-1">
                      Joined: {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : '...'}
                  </p>
              </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="mb-0">
               <label className="block text-sm font-medium text-brand-subtext mb-2">Display Name</label>
               <div className="flex gap-2">
                   <input 
                        type="text" 
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your Name"
                        className="flex-1 p-3 bg-brand-dark border border-brand-light rounded-md text-white focus:ring-2 focus:ring-brand-red outline-none"
                   />
                   <button type="submit" className="px-4 py-2 bg-brand-light hover:bg-brand-border text-white font-medium rounded-md transition-colors">
                       {profileSaved ? 'Saved!' : 'Update Profile'}
                   </button>
               </div>
          </form>
      </div>

      <div className="bg-brand-medium rounded-xl shadow-lg border border-brand-light p-8">
        <div className="flex items-center gap-4 mb-6">
           <div className="p-3 bg-brand-dark rounded-full border border-brand-light">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
           </div>
           <h2 className="text-2xl font-bold text-white">Email Configuration</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Method Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, method: 'simulation'})}
                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.method === 'simulation' ? 'border-brand-red bg-brand-dark' : 'border-brand-light bg-transparent hover:border-brand-subtext'}`}
              >
                  <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">Simulation Mode</span>
                      {formData.method === 'simulation' && <span className="h-3 w-3 bg-brand-red rounded-full"></span>}
                  </div>
                  <p className="text-xs text-brand-subtext">Test your campaigns without sending real emails. Best for debugging.</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({...formData, method: 'webhook'})}
                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.method === 'webhook' ? 'border-brand-red bg-brand-dark' : 'border-brand-light bg-transparent hover:border-brand-subtext'}`}
              >
                   <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">Universal Webhook</span>
                      {formData.method === 'webhook' && <span className="h-3 w-3 bg-brand-red rounded-full"></span>}
                  </div>
                  <p className="text-xs text-brand-subtext">Connect to Emailit, Zoho, or Gmail via Make.com or Zapier.</p>
              </button>
          </div>

          {/* Webhook Configuration */}
          {formData.method === 'webhook' && (
              <div className="bg-brand-dark p-6 rounded-lg border border-brand-light animate-fade-in space-y-4">
                  <div>
                      <h3 className="text-white font-bold mb-2">Webhook Setup</h3>
                      <p className="text-sm text-brand-subtext mb-4">
                          1. Create a "Catch Hook" in Make.com, Zapier, or ViaSocket.<br/>
                          2. Connect it to an <b>Emailit (SMTP)</b> or <b>Zoho Mail</b> module.<br/>
                          3. Paste the URL below.
                      </p>
                  </div>
                  
                  <div>
                        <label className="block text-sm font-medium text-brand-subtext mb-2">Webhook URL</label>
                        <input 
                            type="url" 
                            name="webhookUrl"
                            value={formData.webhookUrl}
                            onChange={handleChange}
                            placeholder="https://hook.us1.make.com/..."
                            className="w-full p-3 bg-brand-medium border border-brand-light rounded-md text-white focus:ring-2 focus:ring-brand-red outline-none"
                            required
                        />
                    </div>
                    
                     <div>
                        <label className="block text-sm font-medium text-brand-subtext mb-2">Auth Header (Optional)</label>
                        <input 
                            type="text" 
                            name="authHeader"
                            value={formData.authHeader || ''}
                            onChange={handleChange}
                            placeholder="Bearer YOUR_SECRET_KEY"
                            className="w-full p-3 bg-brand-medium border border-brand-light rounded-md text-white focus:ring-2 focus:ring-brand-red outline-none"
                        />
                        <p className="text-xs text-brand-subtext mt-1">Useful if you are protecting your webhook with a secret key.</p>
                    </div>

                     <div className="pt-2">
                         <button 
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="px-4 py-2 bg-brand-light text-white text-sm font-medium rounded hover:bg-brand-border transition-colors flex items-center gap-2"
                        >
                            {isTesting ? (
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            )}
                            Test Connection
                        </button>
                        {testResult && (
                            <p className={`text-xs mt-2 font-bold ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {testResult.msg}
                            </p>
                        )}
                     </div>
              </div>
          )}

          {/* Legacy SMTP (Visual only mostly for this context) */}
          <div className={`opacity-50 pointer-events-none blur-[1px] transition-all ${formData.method === 'simulation' ? 'opacity-100 blur-0 pointer-events-auto' : ''}`}>
             <div className="border-t border-brand-light pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-white font-bold">Sender Identity (Simulation)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-brand-subtext mb-2">From Name</label>
                        <input 
                            type="text" 
                            name="fromName"
                            value={formData.fromName}
                            onChange={handleChange}
                            placeholder="John Doe"
                            className="w-full p-3 bg-brand-dark border border-brand-light rounded-md text-white focus:ring-2 focus:ring-brand-red outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-subtext mb-2">From Email</label>
                        <input 
                            type="email" 
                            name="fromEmail"
                            value={formData.fromEmail}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            className="w-full p-3 bg-brand-dark border border-brand-light rounded-md text-white focus:ring-2 focus:ring-brand-red outline-none"
                        />
                    </div>
                  </div>
             </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-brand-light">
             <div className="text-green-400 font-medium h-6">
                 {isSaved && "Settings Saved Successfully!"}
             </div>
             <button 
                type="submit"
                className="px-8 py-3 bg-brand-red text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors"
            >
                Save Configuration
            </button>
          </div>
        </form>

        {/* Database Utilities */}
        <div className="mt-8 pt-8 border-t border-brand-light">
            <h3 className="text-white font-bold mb-2">Database Utilities</h3>
            <p className="text-xs text-brand-subtext mb-4">
                If your Firebase Console database is empty, use this to create the initial collections (tables).
            </p>
            <button 
                type="button"
                onClick={handleSeedDatabase}
                className="px-6 py-3 bg-brand-dark border border-brand-border text-white font-semibold rounded-lg hover:bg-brand-medium transition-colors flex items-center gap-2"
            >
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Generate Sample Data
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsScreen;
