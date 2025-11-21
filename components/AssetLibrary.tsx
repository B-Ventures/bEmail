
import React, { useState } from 'react';
import { Asset, Email } from '../types';
import Modal from './Modal';

interface AssetLibraryProps {
  assets: Asset[];
  onUpdate: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onUpdate, onDelete }) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ index: number, email: Email } | null>(null);

  // Save changes to a specific email within an asset
  const handleSaveEmail = () => {
      if (selectedAsset && editingEmail) {
          const updatedEmails = [...selectedAsset.emails];
          const updatedEmail = { ...editingEmail.email };
          
          // Update the specific email in the array
          updatedEmails[editingEmail.index] = {
              ...updatedEmails[editingEmail.index],
              subject: updatedEmail.subject,
              htmlBody: updatedEmail.htmlBody
          };

          const updatedAsset = {
              ...selectedAsset,
              emails: updatedEmails
          };

          onUpdate(updatedAsset);
          setSelectedAsset(updatedAsset); // Update local view
          setEditingEmail(null); // Close modal
      }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* List View */}
      {!selectedAsset && (
          <>
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Asset Library</h2>
                <p className="text-brand-subtext">View and edit your generated email courses.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map(asset => (
                    <div key={asset.id} className="glass-panel p-6 rounded-2xl hover:border-brand-red/50 transition-all group cursor-pointer relative" onClick={() => setSelectedAsset(asset)}>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={(e) => { e.stopPropagation(); if(confirm('Delete this asset?')) onDelete(asset.id); }}
                                className="p-2 bg-brand-dark rounded-lg text-brand-subtext hover:text-red-500"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                        </div>
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-brand-red to-purple-600 flex items-center justify-center mb-4 text-white shadow-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{asset.title}</h3>
                        <div className="flex items-center gap-2 text-brand-subtext text-sm">
                            <span className="bg-brand-dark px-2 py-1 rounded border border-brand-border">{asset.emails.length} Emails</span>
                            <span>•</span>
                            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
                {assets.length === 0 && (
                    <div className="col-span-full text-center p-12 border-2 border-dashed border-brand-border rounded-xl text-brand-subtext">
                        <p>No assets found. Use the Generator to create one.</p>
                    </div>
                )}
            </div>
          </>
      )}

      {/* Detail View */}
      {selectedAsset && (
          <div className="animate-fade-in">
              <button onClick={() => setSelectedAsset(null)} className="mb-6 flex items-center gap-2 text-brand-subtext hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back to Library
              </button>

              <div className="flex items-center justify-between mb-8">
                  <div>
                      <h2 className="text-3xl font-bold text-white">{selectedAsset.title}</h2>
                      <p className="text-brand-subtext">Created on {new Date(selectedAsset.createdAt).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => { if(confirm('Delete this asset?')) { onDelete(selectedAsset.id); setSelectedAsset(null); } }}
                    className="px-4 py-2 bg-brand-dark border border-brand-border text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                      Delete Asset
                  </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  {selectedAsset.emails.map((email, idx) => (
                      <div key={idx} className="bg-brand-medium p-6 rounded-xl border border-brand-border hover:border-brand-light transition-colors flex flex-col md:flex-row gap-6">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                  <span className="bg-brand-dark text-white text-xs font-bold px-2 py-1 rounded">Day {email.day}</span>
                                  <h4 className="text-lg font-bold text-white">{email.subject}</h4>
                              </div>
                              <div className="bg-brand-dark p-4 rounded-lg border border-brand-border h-32 overflow-hidden relative group">
                                   <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent z-10"></div>
                                   <div dangerouslySetInnerHTML={{ __html: email.htmlBody }} className="text-xs origin-top scale-75 w-[133%]"></div>
                              </div>
                          </div>
                          <div className="flex flex-col justify-center gap-2 min-w-[150px]">
                              <button 
                                onClick={() => setEditingEmail({ index: idx, email: email })}
                                className="px-4 py-2 bg-brand-light text-white rounded-lg font-medium hover:bg-brand-border transition-colors"
                              >
                                  Edit Content
                              </button>
                              <button 
                                onClick={() => {
                                    const blob = new Blob([email.htmlBody], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${selectedAsset.title.replace(/\s+/g, '_')}_Day_${email.day}.html`;
                                    a.click();
                                }}
                                className="px-4 py-2 bg-brand-dark border border-brand-border text-brand-subtext rounded-lg font-medium hover:text-white transition-colors"
                              >
                                  Download HTML
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Edit Modal */}
      <Modal show={!!editingEmail} onClose={() => setEditingEmail(null)} title="Edit Email Content">
          <div className="space-y-4 h-[70vh] flex flex-col">
              <div>
                  <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Subject Line</label>
                  <input 
                    type="text" 
                    value={editingEmail?.email.subject || ''} 
                    onChange={(e) => editingEmail && setEditingEmail({ ...editingEmail, email: { ...editingEmail.email, subject: e.target.value } })}
                    className="w-full bg-brand-dark text-white p-3 rounded-lg border border-brand-border focus:border-brand-red outline-none"
                  />
              </div>
              <div className="flex-1 flex flex-col">
                  <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">HTML Body</label>
                  <textarea 
                    value={editingEmail?.email.htmlBody || ''} 
                    onChange={(e) => editingEmail && setEditingEmail({ ...editingEmail, email: { ...editingEmail.email, htmlBody: e.target.value } })}
                    className="flex-1 w-full bg-brand-dark text-green-400 font-mono text-xs p-4 rounded-lg border border-brand-border focus:border-brand-red outline-none resize-none"
                  ></textarea>
              </div>
              <div className="flex justify-end pt-4">
                  <button onClick={handleSaveEmail} className="px-8 py-3 bg-brand-red text-white font-bold rounded-lg shadow-lg hover:bg-red-600">
                      Save Changes
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default AssetLibrary;
