
import React, { useState } from 'react';
import { Campaign, Audience, Sequence, Asset, SmtpConfig } from '../types';
import CampaignList from './CampaignList'; // Re-using the updated list component

interface CampaignManagerProps {
  campaigns: Campaign[];
  audiences: Audience[];
  sequences: Sequence[];
  assets: Asset[]; // Added to props
  smtpConfig: SmtpConfig; // Added to props
  onSave: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ campaigns, audiences, sequences, assets, smtpConfig, onSave, onDelete }) => {
  const [isCreating, setIsCreating] = useState(false);
  
  // New Campaign Form State
  const [newName, setNewName] = useState('');
  const [selectedAudienceId, setSelectedAudienceId] = useState('');
  const [selectedSequenceId, setSelectedSequenceId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [runType, setRunType] = useState<'broadcast' | 'evergreen'>('broadcast');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !selectedAudienceId || !selectedSequenceId) return;

    const audience = audiences.find(a => a.id === selectedAudienceId);
    const sequence = sequences.find(s => s.id === selectedSequenceId);
    
    // Create a snapshot of the email subjects for the campaign report
    const campaignEmails = sequence ? sequence.steps.map((step, index) => ({
        day: index + 1,
        subject: step.subject || `Day ${index + 1} Email`
    })) : [];
    
    const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: newName,
        audienceId: selectedAudienceId,
        sequenceId: selectedSequenceId,
        runType: runType,
        status: scheduleTime ? 'scheduled' : 'draft', // Default to draft if not scheduled
        scheduledFor: scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
        createdAt: new Date().toISOString(),
        emails: campaignEmails,
        stats: {
            sent: 0,
            opened: 0,
            clicks: 0
        },
        progress: {
            totalSubscribers: audience ? audience.subscribers.length : 0,
            completedSubscribers: 0,
            currentStepIndex: {},
            lastActionAt: {} // Initialized empty
        }
    };

    onSave(newCampaign);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
      setNewName('');
      setSelectedAudienceId('');
      setSelectedSequenceId('');
      setScheduleTime('');
      setRunType('broadcast');
  };

  // If not creating, show the list (which handles sending view)
  if (!isCreating) {
      return (
          <>
            <CampaignList 
                campaigns={campaigns} 
                audiences={audiences} 
                sequences={sequences} 
                assets={assets} 
                smtpConfig={smtpConfig} 
                onUpdate={onSave} 
                onDelete={onDelete} 
            />
             <div className="fixed bottom-8 right-8 z-40">
                <button 
                    onClick={() => setIsCreating(true)}
                    className="h-14 w-14 rounded-full bg-brand-red text-white shadow-lg flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all"
                    title="Create New Campaign"
                >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
             </div>
          </>
      );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
        <div className="glass-panel p-8 rounded-2xl border border-brand-border mb-8 shadow-2xl animate-fade-in mt-12">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">New Campaign Setup</h3>
                <button onClick={() => setIsCreating(false)} className="text-brand-subtext hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Campaign Name</label>
                    <input 
                    type="text" 
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-brand-dark text-white p-4 rounded-xl border border-brand-border focus:border-brand-red outline-none text-lg"
                    placeholder="e.g., January Cohort Launch"
                />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Target Audience</label>
                        <div className="relative">
                        <select 
                            value={selectedAudienceId} 
                            onChange={e => setSelectedAudienceId(e.target.value)}
                            required
                            className="w-full bg-brand-dark text-white p-4 rounded-xl border border-brand-border focus:border-brand-red outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Select Audience List...</option>
                            {audiences.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.subscribers.length} subs)</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-brand-subtext">▼</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Drip Sequence</label>
                        <div className="relative">
                        <select 
                            value={selectedSequenceId} 
                            onChange={e => setSelectedSequenceId(e.target.value)}
                            required
                            className="w-full bg-brand-dark text-white p-4 rounded-xl border border-brand-border focus:border-brand-red outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Select Sequence Template...</option>
                            {sequences.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.steps.length} steps)</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-brand-subtext">▼</div>
                        </div>
                    </div>
                </div>
                
                {/* Run Type Selection */}
                <div>
                     <label className="block text-xs font-bold text-brand-subtext uppercase mb-3">Automation Type</label>
                     <div className="grid grid-cols-2 gap-4">
                         <button
                            type="button"
                            onClick={() => setRunType('broadcast')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${runType === 'broadcast' ? 'border-brand-red bg-brand-dark' : 'border-brand-light bg-transparent hover:border-brand-subtext'}`}
                         >
                             <div className="font-bold text-white mb-1">One-time Broadcast</div>
                             <p className="text-xs text-brand-subtext">Sends to all current subscribers immediately, then ends.</p>
                         </button>
                         <button
                            type="button"
                            onClick={() => setRunType('evergreen')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${runType === 'evergreen' ? 'border-brand-red bg-brand-dark' : 'border-brand-light bg-transparent hover:border-brand-subtext'}`}
                         >
                             <div className="font-bold text-white mb-1">Ongoing Automation</div>
                             <p className="text-xs text-brand-subtext">Stays active. Automatically sends to new subscribers as they join.</p>
                         </button>
                     </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Schedule Start (Optional)</label>
                    <input 
                    type="datetime-local" 
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-brand-dark text-white p-4 rounded-xl border border-brand-border focus:border-brand-red outline-none"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                    <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-brand-subtext hover:text-white font-medium">Cancel</button>
                    <button type="submit" className="px-8 py-3 bg-brand-red text-white font-bold rounded-xl shadow-lg hover:bg-red-600 transition-all">Create Campaign</button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default CampaignManager;
