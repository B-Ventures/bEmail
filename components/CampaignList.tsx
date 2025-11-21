
import React, { useState, useRef } from 'react';
import { Campaign, Audience, SmtpConfig, Sequence, Asset } from '../types';
import { processCampaignSequence } from '../services/campaignProcessor';

interface CampaignListProps {
  campaigns: Campaign[];
  audiences: Audience[];
  sequences: Sequence[];
  assets: Asset[]; 
  smtpConfig: SmtpConfig;
  onUpdate: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
}

const CampaignList: React.FC<CampaignListProps> = ({ campaigns, audiences, sequences, assets, smtpConfig, onUpdate, onDelete }) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState<string>('');

  // SAFETY LOCK: Only for manual sends in this component
  const recentSendsRef = useRef<Set<string>>(new Set());

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const handleAssignAudience = (campaign: Campaign, audienceId: string) => {
    onUpdate({ ...campaign, audienceId });
  };
  
  const togglePause = (campaign: Campaign) => {
      if (campaign.status === 'active') {
          onUpdate({ ...campaign, status: 'paused' });
      } else if ((campaign.status as string) === 'paused') {
          onUpdate({ ...campaign, status: 'active' });
      }
  };

  // Manual Trigger Handler
  const handleStartNow = async () => {
    if (!selectedCampaign || !selectedCampaign.audienceId) return;
    
    const audience = audiences.find(a => a.id === selectedCampaign.audienceId);
    if (!audience || audience.subscribers.length === 0) {
        if(selectedCampaign.runType !== 'evergreen') {
            alert("Please select an audience with valid subscribers.");
            return;
        }
    }

    if (!smtpConfig.isConfigured) {
      alert("Please configure your Sending Settings settings first.");
      return;
    }

    if (smtpConfig.method === 'webhook' && !smtpConfig.webhookUrl) {
        alert("Please provide a Webhook URL in Settings.");
        return;
    }

    // If Evergreen, just set to active.
    if (selectedCampaign.runType === 'evergreen') {
        onUpdate({...selectedCampaign, status: 'active'});
        alert("Campaign is now Active! Keep this tab open to ensure emails are sent to new subscribers automatically.");
        return;
    }

    // If Broadcast (Manual Send), we run it locally to show logs
    if (audience) {
        const sequence = sequences.find(s => s.id === selectedCampaign.sequenceId);
        if (!sequence) return;

        setIsSending(true);
        setSendLogs([]);
        
        // Update UI log callback
        const logCallback = (msg: string) => {
            setSendLogs(prev => [...prev, msg]);
        };

        // Set active immediately for UI feedback
        onUpdate({ ...selectedCampaign, status: 'active', scheduledFor: undefined });

        await processCampaignSequence(
            selectedCampaign,
            audience,
            sequence,
            assets,
            smtpConfig,
            onUpdate,
            recentSendsRef.current,
            logCallback
        );
        
        setIsSending(false);
        setSendLogs(prev => [...prev, "[Complete] Manual processing finished."]);
    }
  };

  const handleSchedule = () => {
    if (!selectedCampaign || !scheduleTime) return;
    if (!selectedCampaign.audienceId) {
         alert("Please select an audience first.");
         return;
    }

    onUpdate({
        ...selectedCampaign,
        status: 'scheduled',
        scheduledFor: new Date(scheduleTime).toISOString()
    });
    setScheduleTime('');
    alert(`Campaign scheduled for ${new Date(scheduleTime).toLocaleString()}. Keep the browser open at that time to ensure it runs.`);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center p-12 bg-brand-medium rounded-xl border border-brand-light">
        <h2 className="text-2xl font-bold text-white mb-2">No Campaigns Yet</h2>
        <p className="text-brand-subtext">Go to the Campaigns tab to launch your first email course.</p>
      </div>
    );
  }

  if (selectedCampaign) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <button onClick={() => { setSelectedCampaignId(null); setSendLogs([]); setIsSending(false); }} className="mb-4 text-brand-subtext hover:text-white flex items-center gap-2">
           ← Back to Campaigns
        </button>
        
        <div className="bg-brand-medium rounded-xl border border-brand-light overflow-hidden shadow-xl">
           {/* Header Section */}
           <div className="p-6 border-b border-brand-light flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-white">{selectedCampaign.name}</h2>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                        ${selectedCampaign.status === 'active' ? 'bg-green-900 text-green-200' : 
                          selectedCampaign.status === 'scheduled' ? 'bg-blue-900 text-blue-200' : 
                          selectedCampaign.status === 'completed' ? 'bg-gray-700 text-gray-300' :
                          (selectedCampaign.status as string) === 'paused' ? 'bg-orange-900 text-orange-200' :
                          'bg-yellow-900 text-yellow-200'}`}>
                        {selectedCampaign.status}
                    </span>
                    {selectedCampaign.runType === 'evergreen' && (
                        <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-purple-900 text-purple-200 border border-purple-700">
                            Evergreen
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-brand-subtext">
                    <span>{selectedCampaign.emails.length} Emails</span>
                    <span>Created: {new Date(selectedCampaign.createdAt || Date.now()).toLocaleDateString()}</span>
                    {selectedCampaign.scheduledFor && (
                        <span className="text-blue-400 font-semibold">Scheduled: {new Date(selectedCampaign.scheduledFor).toLocaleString()}</span>
                    )}
                </div>
             </div>
             
             <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                 <select 
                    className="w-full md:w-64 bg-brand-dark border border-brand-light text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-red outline-none"
                    value={selectedCampaign.audienceId || ''}
                    onChange={(e) => handleAssignAudience(selectedCampaign, e.target.value)}
                    disabled={isSending || selectedCampaign.status === 'active' || (selectedCampaign.status as string) === 'paused'}
                 >
                     <option value="">Select Audience...</option>
                     {audiences.map(a => (
                         <option key={a.id} value={a.id}>{a.name} ({a.subscribers.length} subs)</option>
                     ))}
                 </select>
                 
                 {!isSending && selectedCampaign.status !== 'active' && (selectedCampaign.status as string) !== 'paused' && (
                     <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <input 
                            type="datetime-local" 
                            className="bg-brand-dark border border-brand-light text-white rounded-md px-3 py-2 outline-none"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                        />
                        {scheduleTime ? (
                             <button 
                                onClick={handleSchedule}
                                className="px-4 py-2 rounded-md font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all whitespace-nowrap"
                            >
                                Schedule
                            </button>
                        ) : (
                            <button 
                                onClick={handleStartNow}
                                className="px-6 py-2 rounded-md font-bold text-white bg-brand-red hover:bg-red-700 transition-all shadow-md"
                            >
                                {selectedCampaign.runType === 'evergreen' ? 'Activate Automation' : 'Send Now'}
                            </button>
                        )}
                     </div>
                 )}

                 {(selectedCampaign.status === 'active' || (selectedCampaign.status as string) === 'paused') && (
                     <div className="flex items-center gap-2">
                         <button
                             onClick={() => togglePause(selectedCampaign)}
                             className={`px-6 py-2 rounded-md font-bold text-white transition-all shadow-md flex items-center gap-2 ${
                                 selectedCampaign.status === 'active' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                             }`}
                         >
                             {selectedCampaign.status === 'active' ? (
                                 <>
                                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                     Pause
                                 </>
                             ) : (
                                 <>
                                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                     Resume
                                 </>
                             )}
                         </button>
                     </div>
                 )}
                 
                 {isSending && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-brand-dark rounded-md border border-brand-light">
                         <div className="animate-spin h-4 w-4 border-2 border-brand-red border-t-transparent rounded-full"></div>
                         <span className="text-white font-bold text-sm">Processing...</span>
                     </div>
                 )}
             </div>
           </div>

           {/* Send Logs Console */}
           {(sendLogs.length > 0 || isSending) && (
               <div className="bg-black font-mono text-xs p-4 h-64 overflow-y-auto border-b border-brand-light shadow-inner">
                   {sendLogs.map((log, i) => <div key={i} className="text-green-500 mb-1 font-medium">{log}</div>)}
                   {isSending && <div className="text-green-500 animate-pulse">_</div>}
               </div>
           )}

           <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Email Sequence</h3>
                    {selectedCampaign.emails.map((email) => (
                        <div key={email.day} className="flex items-center gap-3 p-3 rounded-lg bg-brand-dark border border-brand-border">
                            <span className="bg-brand-medium px-2 py-1 rounded text-xs font-bold text-white">Day {email.day}</span>
                            <span className="text-sm text-brand-subtext truncate">{email.subject}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Real-time Stats</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-brand-dark p-4 rounded-lg text-center border border-brand-border">
                            <div className="text-2xl font-bold text-white">{selectedCampaign.stats.sent}</div>
                            <div className="text-xs text-brand-subtext uppercase">Sent</div>
                        </div>
                        <div className="bg-brand-dark p-4 rounded-lg text-center border border-brand-border">
                            <div className="text-2xl font-bold text-green-400">
                                {selectedCampaign.progress.completedSubscribers} / {selectedCampaign.progress.totalSubscribers}
                            </div>
                            <div className="text-xs text-brand-subtext uppercase">Completed</div>
                        </div>
                        <div className="bg-brand-dark p-4 rounded-lg text-center border border-brand-border">
                            <div className="text-2xl font-bold text-blue-400">
                                {Math.round((selectedCampaign.progress.completedSubscribers / (selectedCampaign.progress.totalSubscribers || 1)) * 100)}%
                            </div>
                            <div className="text-xs text-brand-subtext uppercase">Progress</div>
                        </div>
                    </div>
                    {selectedCampaign.runType === 'evergreen' && (
                        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg text-sm text-blue-200">
                            <strong>Automation Active:</strong> This campaign checks for new subscribers automatically while this app is open.
                        </div>
                    )}
                </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
      {campaigns.map(campaign => (
        <div key={campaign.id} className="glass-panel p-6 rounded-2xl hover:border-brand-red/50 transition-all cursor-pointer relative group" onClick={() => setSelectedCampaignId(campaign.id)}>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                onClick={(e) => { e.stopPropagation(); onDelete(campaign.id); }}
                className="p-2 bg-brand-dark rounded-lg text-brand-subtext hover:text-red-500"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            <div className="flex justify-between items-start mb-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-lg ${campaign.status === 'active' ? 'bg-green-600' : 'bg-brand-medium border border-brand-light'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${campaign.status === 'active' ? 'bg-green-900 text-green-200' : 'bg-brand-dark text-brand-subtext'}`}>
                    {campaign.status}
                </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{campaign.name}</h3>
            <p className="text-brand-subtext text-sm mb-4">
                {campaign.runType === 'evergreen' ? 'Evergreen Automation' : 'Broadcast Campaign'}
            </p>
            
            <div className="mt-auto pt-4 border-t border-brand-border flex items-center justify-between text-sm">
                <div className="text-white font-bold">{campaign.stats.sent} <span className="font-normal text-brand-subtext">Sent</span></div>
                <div className="text-brand-subtext">{new Date(campaign.createdAt || Date.now()).toLocaleDateString()}</div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default CampaignList;
