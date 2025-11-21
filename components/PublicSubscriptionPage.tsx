
import React, { useState, useEffect } from 'react';
import { Audience, Subscriber } from '../types';
import { getPublicAudience, savePublicSubscriber } from '../services/firebase';

// No props needed now as it fetches its own data
const PublicSubscriptionPage: React.FC = () => {
  const [listId, setListId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'success' | 'error' | 'not-found'>('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('listId');
    setListId(id);
    
    if (id) {
      fetchData(id);
    } else {
        setStatus('not-found');
    }
  }, []);

  const fetchData = async (id: string) => {
      try {
          const data = await getPublicAudience(id);
          if (data) {
              setAudience(data as Audience);
              document.title = `${data.name} | Subscribe`;
              setStatus('idle');
          } else {
              setStatus('not-found');
          }
      } catch (e) {
          console.error(e);
          setStatus('error');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audience || !email) return;

    const newSubscriber: Subscriber = {
        id: Date.now().toString(),
        email: email,
        firstName: firstName || 'Friend',
        joinedAt: new Date().toISOString(),
        status: 'active'
    };

    const updatedAudience = {
        ...audience,
        subscribers: [...audience.subscribers, newSubscriber]
    };

    try {
        await savePublicSubscriber(audience.id, updatedAudience);
        setStatus('success');
    } catch (e) {
        console.error(e);
        alert("Failed to subscribe. Please try again.");
    }
  };

  if (status === 'loading') {
      return <div className="h-screen w-full bg-brand-dark flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-brand-red border-t-transparent rounded-full"></div></div>;
  }

  if (status === 'not-found' || !listId) return <div className="h-screen w-full bg-brand-dark flex items-center justify-center text-white p-10">List not found or has been deleted.</div>;
  
  if (status === 'error') return <div className="h-screen w-full bg-brand-dark flex items-center justify-center text-white p-10">Connection Error. Please refresh.</div>;

  if (status === 'success') {
      return (
        <div className="min-h-screen w-full bg-brand-dark flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-brand-medium border border-brand-border p-8 rounded-2xl shadow-2xl text-center animate-fade-in">
                <div className="h-20 w-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
                <p className="text-brand-subtext mb-6">Thanks for subscribing to <strong>{audience?.name}</strong>.</p>
                <button onClick={() => window.close()} className="text-brand-subtext hover:text-white underline text-sm">Close Window</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen w-full bg-brand-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-red/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-md w-full bg-brand-medium/80 backdrop-blur-md border border-brand-border p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{audience?.name}</h1>
            <p className="text-brand-subtext">{audience?.description || "Join our exclusive email list for updates."}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">First Name</label>
                <input 
                    type="text" 
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border text-white p-3 rounded-xl focus:border-brand-red outline-none transition-colors"
                    placeholder="Jane"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Email Address</label>
                <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border text-white p-3 rounded-xl focus:border-brand-red outline-none transition-colors"
                    placeholder="jane@example.com"
                />
            </div>
            <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-brand-red to-rose-600 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-red/25 transform hover:-translate-y-0.5 transition-all duration-200"
            >
                Join the List
            </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-brand-border text-center">
            <p className="text-xs text-brand-subtext">Powered by <span className="font-bold text-white">Email.AI</span></p>
        </div>
      </div>
    </div>
  );
};

export default PublicSubscriptionPage;
