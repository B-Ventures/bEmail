
import React, { useState } from 'react';
import { loginUser, registerUser, resetUserPassword } from '../services/firebase';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
        if (resetMode) {
             await resetUserPassword(email);
             setMessage('Password reset email sent! Check your inbox.');
             setResetMode(false);
        } else if (isLogin) {
            await loginUser(email, password);
        } else {
            await registerUser(email, password);
        }
    } catch (err: any) {
        console.error(err);
        let msg = err.message || 'An error occurred';
        
        // Handle specific Firebase Auth errors
        if (err.code === 'auth/operation-not-allowed') {
            msg = 'Configuration Error: Email/Password Sign-in is not enabled in your Firebase Console. Please enable it in the Authentication tab.';
        } else if (err.code === 'auth/email-already-in-use') {
            msg = 'This email is already registered. Please Sign In.';
        } else if (err.code === 'auth/weak-password') {
            msg = 'Password should be at least 6 characters.';
        } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            msg = 'Invalid email or password.';
        } else {
            msg = msg.replace('Firebase: ', '');
        }
        
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
       {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-red/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-brand-medium/50 backdrop-blur-lg border border-brand-border p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
              <div className="inline-flex h-12 w-12 bg-brand-red/20 text-brand-red rounded-xl items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm-1.28 2L12 11.58 5.28 6zM4 18V7.39l7.44 4.96a1 1 0 001.12 0L20 7.39V18z"/></svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-1">Email.AI</h2>
              <p className="text-brand-subtext">
                  {resetMode ? 'Reset Password' : isLogin ? 'Sign In to your account' : 'Create your free account'}
              </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border text-white p-3 rounded-xl focus:border-brand-red outline-none transition-colors"
                    placeholder="name@company.com"
                  />
              </div>
              
              {!resetMode && (
                  <div>
                      <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Password</label>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-brand-dark border border-brand-border text-white p-3 rounded-xl focus:border-brand-red outline-none transition-colors"
                        placeholder="••••••••"
                      />
                  </div>
              )}

              {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-left">
                      <span className="font-bold">Error:</span> {error}
                  </div>
              )}
              {message && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm text-center">
                      {message}
                  </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                  {resetMode ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
          </form>

          <div className="mt-6 text-center space-y-2">
              {!resetMode && (
                  <p className="text-sm text-brand-subtext">
                      {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                      <button onClick={() => setIsLogin(!isLogin)} className="text-white font-bold hover:underline">
                          {isLogin ? 'Sign Up' : 'Sign In'}
                      </button>
                  </p>
              )}
              
              <button 
                onClick={() => { setResetMode(!resetMode); setError(''); setMessage(''); }} 
                className="text-xs text-brand-subtext hover:text-white underline"
              >
                  {resetMode ? 'Back to Login' : 'Forgot Password?'}
              </button>
          </div>
      </div>
    </div>
  );
};

export default AuthScreen;
