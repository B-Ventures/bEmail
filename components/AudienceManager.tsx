
import React, { useState } from 'react';
import { Audience, Subscriber } from '../types';
import Modal from './Modal';

interface AudienceManagerProps {
  audiences: Audience[];
  onAdd: (name: string, description: string) => void;
  onUpdate: (audience: Audience) => void;
  onDelete: (id: string) => void;
}

const AudienceManager: React.FC<AudienceManagerProps> = ({ audiences, onAdd, onUpdate, onDelete }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const [viewingAudience, setViewingAudience] = useState<Audience | null>(null);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd(newName, newDesc);
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
    }
  };

  const handleAddSubscriber = (e: React.FormEvent) => {
      e.preventDefault();
      if(viewingAudience && newSubEmail.trim()) {
          const newSub: Subscriber = {
              id: Date.now().toString(),
              email: newSubEmail,
              firstName: newSubName,
              joinedAt: new Date().toISOString(),
              status: 'active'
          };
          const updatedAudience = {
              ...viewingAudience,
              subscribers: [...viewingAudience.subscribers, newSub]
          };
          onUpdate(updatedAudience);
          setViewingAudience(updatedAudience);
          setNewSubEmail('');
          setNewSubName('');
      }
  }

  const getShareLink = (audienceId: string) => {
      return `${window.location.origin}?action=subscribe&listId=${audienceId}`;
  };

  const getEmbedCode = (audienceId: string) => {
    const link = getShareLink(audienceId);
    return `<iframe src="${link}" width="100%" height="600" frameborder="0" style="border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></iframe>`;
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
       <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-white">Audience Lists</h2>
                <p className="text-brand-subtext">Manage your subscribers and opt-in forms.</p>
            </div>
            <button 
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-brand-red text-white rounded-xl font-bold shadow-lg shadow-red-900/20 hover:bg-red-600 transition-all flex items-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Create New List
            </button>
       </div>

       {isCreating && (
           <div className="glass-panel p-6 rounded-2xl border border-brand-border mb-8 animate-fade-in">
               <h3 className="text-lg font-bold text-white mb-4">Create Audience List</h3>
               <form onSubmit={handleCreate} className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input 
                            type="text" 
                            className="w-full p-3 bg-brand-dark border border-brand-border rounded-xl text-white focus:border-brand-red outline-none" 
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="List Name (e.g. Newsletter)"
                            required
                        />
                       <input 
                            type="text" 
                            className="w-full p-3 bg-brand-dark border border-brand-border rounded-xl text-white focus:border-brand-red outline-none" 
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            placeholder="Description (Internal use only)"
                        />
                   </div>
                   <div className="flex justify-end gap-2">
                       <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-brand-subtext hover:text-white">Cancel</button>
                       <button type="submit" className="px-6 py-2 bg-brand-red text-white rounded-lg font-bold shadow-md">Create List</button>
                   </div>
               </form>
           </div>
       )}

       <div className="grid grid-cols-1 gap-8">
            {audiences.map(audience => (
                <div key={audience.id} className="bg-brand-medium border border-brand-border rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-6 bg-gradient-to-r from-brand-medium to-brand-dark border-b border-brand-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                {audience.name}
                                <span className="bg-brand-dark px-3 py-1 rounded-full text-xs font-medium text-brand-subtext border border-brand-border">{audience.subscribers.length} Subscribers</span>
                            </h3>
                            <p className="text-sm text-brand-subtext mt-1">{audience.description}</p>
                        </div>
                        <button onClick={() => onDelete(audience.id)} className="text-brand-subtext hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                         {/* Add Form */}
                         <div className="lg:col-span-1">
                             <div className="bg-brand-dark p-5 rounded-xl border border-brand-border h-full flex flex-col">
                                 <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                     <svg className="w-4 h-4 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                     Add Subscriber
                                 </h4>
                                 <form onSubmit={(e) => { setViewingAudience(audience); handleAddSubscriber(e); }} className="space-y-3">
                                     <input 
                                        type="text" 
                                        placeholder="First Name" 
                                        className="w-full p-3 bg-brand-medium border border-brand-border rounded-lg text-white text-sm focus:border-brand-red outline-none"
                                        value={viewingAudience?.id === audience.id ? newSubName : ''}
                                        onChange={e => { setViewingAudience(audience); setNewSubName(e.target.value); }}
                                    />
                                     <input 
                                        type="email" 
                                        placeholder="Email Address" 
                                        required 
                                        className="w-full p-3 bg-brand-medium border border-brand-border rounded-lg text-white text-sm focus:border-brand-red outline-none"
                                        value={viewingAudience?.id === audience.id ? newSubEmail : ''}
                                        onChange={e => { setViewingAudience(audience); setNewSubEmail(e.target.value); }}
                                    />
                                     <button type="submit" className="w-full py-3 bg-white text-brand-dark font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-md">Add Manually</button>
                                 </form>
                                 
                                 <div className="mt-auto pt-6 border-t border-brand-border">
                                     <button 
                                        onClick={() => { setViewingAudience(audience); setShowEmbedModal(true); setCopyFeedback(''); }}
                                        className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-brand-subtext text-brand-subtext hover:text-white hover:border-white rounded-lg text-sm transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        Share & Embed
                                    </button>
                                 </div>
                             </div>
                         </div>

                         {/* List */}
                         <div className="lg:col-span-2">
                             <div className="rounded-xl border border-brand-border overflow-hidden bg-brand-dark/50 h-96 flex flex-col">
                                 <div className="grid grid-cols-3 gap-4 p-4 bg-brand-dark border-b border-brand-border text-xs font-bold text-brand-subtext uppercase tracking-wider">
                                     <div>Name</div>
                                     <div>Email</div>
                                     <div>Joined</div>
                                 </div>
                                 <div className="overflow-y-auto flex-1">
                                     {audience.subscribers.length === 0 ? (
                                         <div className="flex flex-col items-center justify-center h-full text-brand-subtext p-8 text-center">
                                             <p>No subscribers yet.</p>
                                             <p className="text-sm mt-1">Add one manually or use the share link.</p>
                                         </div>
                                     ) : (
                                         audience.subscribers.map(sub => (
                                             <div key={sub.id} className="grid grid-cols-3 gap-4 p-4 border-b border-brand-border hover:bg-brand-dark transition-colors text-sm text-brand-text items-center">
                                                 <div className="font-medium text-white">{sub.firstName}</div>
                                                 <div className="truncate">{sub.email}</div>
                                                 <div className="text-brand-subtext">{new Date(sub.joinedAt).toLocaleDateString()}</div>
                                             </div>
                                         ))
                                     )}
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            ))}
            {audiences.length === 0 && !isCreating && (
                <div className="text-center p-12 bg-brand-medium/30 border-2 border-dashed border-brand-border rounded-2xl">
                    <p className="text-brand-subtext">You haven't created any audience lists yet.</p>
                </div>
            )}
       </div>

       <Modal show={showEmbedModal} onClose={() => setShowEmbedModal(false)} title="Share Subscription Form">
           <div className="space-y-6">
               {viewingAudience && (
                   <>
                        <div>
                           <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Direct Share Link</label>
                           <div className="flex gap-2">
                               <input 
                                    type="text" 
                                    readOnly 
                                    value={getShareLink(viewingAudience.id)}
                                    className="flex-1 bg-brand-dark p-3 rounded-lg border border-brand-border text-sm text-blue-400 font-mono"
                                />
                                <button 
                                    onClick={() => copyToClipboard(getShareLink(viewingAudience.id))}
                                    className="px-4 py-2 bg-brand-light hover:bg-brand-border text-white rounded-lg font-bold transition-colors min-w-[80px]"
                                >
                                    {copyFeedback || 'Copy'}
                                </button>
                           </div>
                        </div>

                        <div className="border-t border-brand-border my-4"></div>

                        <div>
                            <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Website Embed Code (Iframe)</label>
                            <p className="text-brand-subtext mb-2 text-sm">Copy and paste this code into your website to show the form directly.</p>
                            <div className="relative">
                                <textarea 
                                    readOnly
                                    rows={4}
                                    className="w-full bg-black p-4 rounded-xl border border-brand-border text-green-400 font-mono text-xs resize-none focus:outline-none"
                                    value={getEmbedCode(viewingAudience.id)}
                                ></textarea>
                                <button 
                                    onClick={() => copyToClipboard(getEmbedCode(viewingAudience.id))}
                                    className="absolute top-2 right-2 px-3 py-1 bg-brand-medium hover:bg-brand-light text-white text-xs rounded-md transition-colors"
                                >
                                    Copy Code
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-2">
                             <button onClick={() => setShowEmbedModal(false)} className="px-4 py-2 bg-brand-medium text-white font-bold rounded-lg hover:bg-brand-light">Done</button>
                        </div>
                   </>
               )}
           </div>
       </Modal>
    </div>
  );
};

export default AudienceManager;
