
import React from 'react';
import { Audience, Campaign, Sequence } from '../types';

interface DashboardProps {
  audiences: Audience[];
  campaigns: Campaign[];
  sequences: Sequence[];
  onNavigate: (view: any) => void;
  dbStatus: 'loading' | 'ok' | 'permission-denied' | 'error' | 'disconnected';
}

const StatCard: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
    <div className="relative overflow-hidden rounded-2xl bg-brand-medium border border-brand-border p-6 group hover:border-brand-subtext/30 transition-all duration-300">
        <div className={`absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 text-[8rem] ${color}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 text-brand-subtext">
                <div className={`p-2 rounded-lg bg-brand-dark ${color} bg-opacity-10`}>
                    {icon}
                </div>
                <span className="font-medium text-sm uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-4xl font-bold text-white">{value}</div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ audiences, campaigns, sequences, onNavigate, dbStatus }) => {
  const totalSubscribers = audiences.reduce((sum, aud) => sum + aud.subscribers.length, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const getStatusDisplay = () => {
      switch(dbStatus) {
          case 'loading': return { color: 'bg-yellow-500', text: 'Checking...', border: 'bg-yellow-900/20 border-yellow-500/30', textColor: 'text-yellow-400' };
          case 'ok': return { color: 'bg-green-500', text: 'Online & Ready', border: 'bg-green-900/20 border-green-500/30', textColor: 'text-green-400' };
          case 'permission-denied': return { color: 'bg-red-500', text: 'Permission Denied', border: 'bg-red-900/20 border-red-500/30', textColor: 'text-red-400' };
          case 'disconnected': return { color: 'bg-red-500', text: 'Disconnected', border: 'bg-red-900/20 border-red-500/30', textColor: 'text-red-400' };
          default: return { color: 'bg-red-500', text: 'Connection Error', border: 'bg-red-900/20 border-red-500/30', textColor: 'text-red-400' };
      }
  };

  const statusUI = getStatusDisplay();

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-brand-subtext">Here's what's happening with your email courses today.</p>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${statusUI.border} flex items-center gap-2`}>
              <div className={`h-2 w-2 rounded-full ${statusUI.color} ${dbStatus === 'loading' ? 'animate-ping' : ''}`}></div>
              <span className={`text-sm font-bold ${statusUI.textColor}`}>
                  System Status: {statusUI.text}
              </span>
          </div>
      </div>

      {dbStatus === 'permission-denied' && (
           <div className="bg-yellow-600/20 border border-yellow-500 text-yellow-200 p-6 rounded-xl mb-8 flex items-start gap-4 animate-fade-in">
                <svg className="w-8 h-8 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Database Locked</h3>
                    <p className="text-sm mb-2">The app cannot save data because your Firestore security rules are set to 'locked'.</p>
                    <ol className="list-decimal list-inside text-sm space-y-1 bg-black/20 p-3 rounded-lg">
                        <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-white">Firebase Console</a> -> Firestore Database.</li>
                        <li>Click the <strong>Rules</strong> tab (next to Data).</li>
                        <li>Change <code className="bg-black/40 px-1 rounded text-yellow-400">allow read, write: if false;</code> to <code className="bg-black/40 px-1 rounded text-green-400">allow read, write: if true;</code></li>
                        <li>Click <strong>Publish</strong>.</li>
                    </ol>
                    <p className="text-xs mt-2 text-yellow-200/70">After publishing, refresh this page.</p>
                </div>
           </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
            label="Subscribers" 
            value={totalSubscribers} 
            color="text-purple-400"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard 
            label="Active Campaigns" 
            value={activeCampaigns} 
            color="text-green-400"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatCard 
            label="Sequences" 
            value={sequences.length} 
            color="text-blue-400"
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="glass-panel rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                    onClick={() => onNavigate('generator')} 
                    className="p-4 rounded-xl bg-gradient-to-br from-brand-medium to-brand-dark border border-brand-border hover:border-brand-red/50 transition-all duration-300 group text-left shadow-lg"
                >
                    <div className="h-10 w-10 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center mb-3 group-hover:bg-brand-red group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h4 className="font-bold text-white text-lg">Generate Content</h4>
                    <p className="text-xs text-brand-subtext mt-1">Create emails from PDF/Text</p>
                </button>

                <button 
                    onClick={() => onNavigate('sequences')} 
                    className="p-4 rounded-xl bg-gradient-to-br from-brand-medium to-brand-dark border border-brand-border hover:border-blue-500/50 transition-all duration-300 group text-left shadow-lg"
                >
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h4 className="font-bold text-white text-lg">New Sequence</h4>
                    <p className="text-xs text-brand-subtext mt-1">Build a drip campaign flow</p>
                </button>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Recent Campaigns</h3>
            {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center border-2 border-dashed border-brand-border rounded-xl">
                    <p className="text-brand-subtext mb-2">No activity yet</p>
                    <button onClick={() => onNavigate('campaigns')} className="text-sm text-brand-red hover:underline">Start a campaign</button>
                </div>
            ) : (
                <ul className="space-y-4">
                    {campaigns.slice(0, 4).map(c => (
                        <li key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-brand-dark border border-brand-border">
                            <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${c.status === 'active' ? 'bg-green-500 animate-pulse' : c.status === 'completed' ? 'bg-gray-500' : 'bg-yellow-500'}`}></div>
                                <div>
                                    <div className="font-bold text-white text-sm">{c.name}</div>
                                    <div className="text-xs text-brand-subtext uppercase tracking-wider">{c.status}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-white">{c.progress.completedSubscribers} / {c.progress.totalSubscribers}</div>
                                <div className="text-xs text-brand-subtext">Emails Sent</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
