
import React, { useState } from 'react';
import { Sequence, SequenceStep, Asset, StepType } from '../types';
import Modal from './Modal';

interface SequenceBuilderProps {
  sequences: Sequence[];
  assets: Asset[];
  onSave: (sequence: Sequence) => void;
  onDelete: (id: string) => void;
}

const SequenceBuilder: React.FC<SequenceBuilderProps> = ({ sequences, assets, onSave, onDelete }) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [currentSequence, setCurrentSequence] = useState<Sequence | null>(null);

  // Edit State
  const [editingStep, setEditingStep] = useState<Partial<SequenceStep> | null>(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const createNewSequence = () => {
    const newSeq: Sequence = {
      id: Date.now().toString(),
      name: 'New Sequence',
      createdAt: new Date().toISOString(),
      steps: []
    };
    setCurrentSequence(newSeq);
    setView('edit');
  };

  const handleSaveSequence = () => {
    if (currentSequence) {
      // Re-index steps based on current array order to guarantee sequence consistency
      const reIndexedSteps = currentSequence.steps.map((step, index) => ({
          ...step,
          orderIndex: index
      }));
      
      onSave({ ...currentSequence, steps: reIndexedSteps });
      setView('list');
      setCurrentSequence(null);
    }
  };

  const addStep = () => {
    setEditingStep({
      id: Date.now().toString(),
      orderIndex: currentSequence ? currentSequence.steps.length : 0,
      delayHours: 24,
      subject: '',
      contentType: 'text',
      content: ''
    });
    setShowStepModal(true);
  };

  const deleteStep = (stepId: string) => {
      if (!currentSequence) return;
      setCurrentSequence({
          ...currentSequence,
          steps: currentSequence.steps.filter(s => s.id !== stepId)
      });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
      if (!currentSequence) return;
      const steps = [...currentSequence.steps];
      
      if (direction === 'up') {
          if (index === 0) return;
          [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
      } else {
          if (index === steps.length - 1) return;
          [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
      }
      
      setCurrentSequence({ ...currentSequence, steps });
  };

  const handleBulkImport = (asset: Asset) => {
      if (!currentSequence) return;

      const newSteps: SequenceStep[] = asset.emails.map((email, idx) => ({
          id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
          orderIndex: 0, // Will be normalized on save
          // Smart delay: 0 for the very first step of the sequence, 24 for others
          delayHours: (currentSequence.steps.length === 0 && idx === 0) ? 0 : 24, 
          subject: email.subject,
          contentType: 'asset_ref',
          content: 'Imported from Asset Library',
          assetRef: {
              assetId: asset.id,
              dayIndex: email.day
          }
      }));

      setCurrentSequence({
          ...currentSequence,
          steps: [...currentSequence.steps, ...newSteps]
      });
      setShowImportModal(false);
  };

  const saveStep = () => {
    if (!currentSequence || !editingStep) return;
    
    const newStep = editingStep as SequenceStep;
    const existingIndex = currentSequence.steps.findIndex(s => s.id === newStep.id);
    let updatedSteps = [...currentSequence.steps];
    
    if (existingIndex >= 0) {
        updatedSteps[existingIndex] = newStep;
    } else {
        updatedSteps.push(newStep);
    }

    setCurrentSequence({
        ...currentSequence,
        steps: updatedSteps
    });
    setShowStepModal(false);
    setEditingStep(null);
  };

  const handleAssetSelect = (assetId: string, dayIndex: number, subject: string) => {
      setEditingStep(prev => ({
          ...prev,
          subject: subject,
          contentType: 'asset_ref',
          content: 'Linked to AI Asset',
          assetRef: { assetId, dayIndex }
      }));
  };

  if (view === 'list') {
    return (
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
              <h2 className="text-3xl font-bold text-white">Sequences</h2>
              <p className="text-brand-subtext">Manage your email automation flows.</p>
          </div>
          <button onClick={createNewSequence} className="px-6 py-3 bg-brand-red text-white font-bold rounded-xl shadow-lg shadow-red-900/20 hover:bg-red-600 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Sequence
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sequences.map(seq => (
            <div key={seq.id} className="glass-panel p-6 rounded-2xl hover:border-brand-red/40 transition-all duration-300 group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-brand-dark rounded-lg text-blue-400 group-hover:text-white group-hover:bg-brand-red transition-colors">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </div>
                  <button onClick={() => onDelete(seq.id)} className="text-brand-subtext hover:text-red-500 p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{seq.name}</h3>
              <p className="text-brand-subtext text-sm mb-6">{seq.steps.length} Email Steps</p>
              <button 
                onClick={() => { setCurrentSequence(seq); setView('edit'); }} 
                className="mt-auto w-full py-3 rounded-lg bg-brand-dark border border-brand-border text-white font-medium hover:bg-brand-border transition-colors"
              >
                Edit Flow
              </button>
            </div>
          ))}
          {sequences.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-brand-border rounded-2xl text-brand-subtext">
                  <p>No sequences yet. Create your first automation flow.</p>
              </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 bg-brand-medium p-4 rounded-xl border border-brand-border sticky top-0 z-30 shadow-xl backdrop-blur-sm bg-opacity-90">
        <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-brand-dark rounded-lg text-brand-subtext hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
                <label className="block text-xs text-brand-subtext uppercase tracking-wider">Sequence Name</label>
                <input 
                    type="text" 
                    value={currentSequence?.name} 
                    onChange={(e) => setCurrentSequence(curr => curr ? { ...curr, name: e.target.value } : null)}
                    className="bg-transparent text-xl font-bold text-white focus:outline-none placeholder-gray-600 w-full"
                    placeholder="Name your sequence..."
                />
            </div>
        </div>
        <button onClick={handleSaveSequence} className="px-6 py-2 bg-white text-brand-dark font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg">
            Save Changes
        </button>
      </div>

      <div className="relative pl-8 md:pl-12 py-4">
         {/* Visual Vertical Line */}
         <div className="absolute left-8 md:left-12 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-red via-brand-border to-transparent transform -translate-x-1/2"></div>

         {currentSequence?.steps.map((step, index) => (
             <div key={step.id} className="relative mb-6 pl-8 group">
                 {/* Step Node */}
                 <div className="absolute left-0 top-6 w-4 h-4 bg-brand-dark border-2 border-brand-red rounded-full transform -translate-x-[22px] z-10 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                 
                 {/* Step Card */}
                 <div className="glass-panel p-6 rounded-xl border border-brand-border hover:border-brand-subtext transition-all cursor-pointer relative overflow-hidden pr-14" onClick={() => { setEditingStep(step); setShowStepModal(true); }}>
                     
                     {/* Card Controls (Reorder / Delete) */}
                     <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-medium/80 backdrop-blur p-1 rounded-lg border border-brand-border">
                        <button 
                            onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }} 
                            className={`p-1.5 rounded text-brand-subtext hover:text-white hover:bg-brand-light transition-all ${index === 0 ? 'invisible' : ''}`}
                            title="Move Up"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); moveStep(index, 'down'); }} 
                            className={`p-1.5 rounded text-brand-subtext hover:text-white hover:bg-brand-light transition-all ${index === currentSequence.steps.length - 1 ? 'invisible' : ''}`}
                            title="Move Down"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <div className="h-px w-full bg-brand-border my-0.5"></div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }} 
                            className="p-1.5 rounded text-brand-subtext hover:bg-red-500/20 hover:text-red-500 transition-all"
                            title="Delete Step"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                     <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark border border-brand-border text-xs font-medium text-brand-subtext">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             {step.delayHours === 0 ? 'Immediate' : `${step.delayHours}h Delay`}
                         </div>
                         <div className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${step.contentType === 'asset_ref' ? 'bg-blue-900/30 text-blue-400' : step.contentType === 'html' ? 'bg-purple-900/30 text-purple-400' : 'bg-gray-700 text-gray-300'}`}>
                             {step.contentType === 'asset_ref' ? 'AI Asset' : step.contentType}
                         </div>
                     </div>
                     
                     <h4 className="text-lg font-bold text-white mb-1">{step.subject || '(Untitled Step)'}</h4>
                     <p className="text-sm text-brand-subtext line-clamp-1">
                         {step.contentType === 'asset_ref' ? 'Content dynamically linked from AI Library assets.' : step.content}
                     </p>
                 </div>
             </div>
         ))}
         
         <div className="flex gap-4 mt-8">
            <button onClick={addStep} className="flex-1 p-4 border-2 border-dashed border-brand-border rounded-xl text-brand-subtext hover:border-brand-red hover:text-white hover:bg-brand-medium transition-all flex items-center justify-center gap-2 group">
                <div className="h-8 w-8 rounded-full bg-brand-dark flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="font-medium">Add Next Email Step</span>
            </button>

            <button onClick={() => setShowImportModal(true)} className="flex-1 p-4 border-2 border-dashed border-brand-border rounded-xl text-brand-subtext hover:border-blue-500 hover:text-white hover:bg-brand-medium transition-all flex items-center justify-center gap-2 group">
                 <div className="h-8 w-8 rounded-full bg-brand-dark flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                </div>
                <span className="font-medium">Import Full Course from Library</span>
            </button>
         </div>
      </div>

      {/* Step Editor Modal */}
      <Modal show={showStepModal} onClose={() => setShowStepModal(false)} title="Configure Email Step">
          <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                      <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Delay (Hours)</label>
                      <input 
                        type="number" 
                        value={editingStep?.delayHours} 
                        onChange={e => setEditingStep(prev => prev ? ({ ...prev, delayHours: parseInt(e.target.value) }) : null)}
                        className="w-full bg-brand-dark text-white p-3 rounded-lg border border-brand-border focus:border-brand-red outline-none"
                      />
                  </div>
                  <div className="col-span-2">
                      <label className="block text-xs font-bold text-brand-subtext uppercase mb-2">Subject Line</label>
                      <input 
                        type="text" 
                        value={editingStep?.subject} 
                        onChange={e => setEditingStep(prev => prev ? ({ ...prev, subject: e.target.value }) : null)}
                        className="w-full bg-brand-dark text-white p-3 rounded-lg border border-brand-border focus:border-brand-red outline-none"
                        placeholder="e.g. Welcome to the course!"
                      />
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-brand-subtext uppercase mb-3">Content Type</label>
                  <div className="flex gap-2 p-1 bg-brand-dark rounded-lg border border-brand-border w-fit">
                      {(['text', 'html', 'asset_ref'] as StepType[]).map(type => (
                          <button
                            key={type}
                            onClick={() => setEditingStep(prev => prev ? ({ ...prev, contentType: type }) : null)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${editingStep?.contentType === type ? 'bg-brand-medium text-white shadow-sm' : 'text-brand-subtext hover:text-white'}`}
                          >
                              {type === 'text' ? 'Plain Text' : type === 'html' ? 'Raw HTML' : 'AI Asset'}
                          </button>
                      ))}
                  </div>
              </div>

              {editingStep?.contentType === 'text' && (
                  <textarea
                    value={editingStep.content}
                    onChange={e => setEditingStep(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                    rows={12}
                    className="w-full bg-brand-dark text-white p-4 rounded-xl border border-brand-border focus:border-brand-red outline-none font-sans leading-relaxed"
                    placeholder="Hi {{firstName}}, write your content here..."
                  ></textarea>
              )}

              {editingStep?.contentType === 'html' && (
                  <textarea
                    value={editingStep.content}
                    onChange={e => setEditingStep(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                    rows={12}
                    className="w-full bg-brand-dark text-green-400 p-4 rounded-xl border border-brand-border focus:border-brand-red outline-none font-mono text-xs"
                    placeholder="<html>...</html>"
                  ></textarea>
              )}

              {editingStep?.contentType === 'asset_ref' && (
                  <div className="space-y-3 border border-brand-border rounded-xl p-4 bg-brand-dark/50">
                      <p className="text-sm text-brand-subtext">Select an email generated from the AI Generator:</p>
                      {assets.length === 0 ? (
                          <div className="text-center p-4 border border-dashed border-brand-border rounded text-brand-subtext">No generated assets found.</div>
                      ) : (
                          assets.map(asset => (
                              <div key={asset.id} className="mb-4 last:mb-0">
                                  <h5 className="text-xs font-bold text-white uppercase mb-2 opacity-70">{asset.title}</h5>
                                  <div className="grid grid-cols-1 gap-2">
                                      {asset.emails.map((email, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => handleAssetSelect(asset.id, email.day, email.subject)}
                                            className={`flex items-center text-left text-sm p-3 rounded-lg border transition-all ${editingStep.assetRef?.assetId === asset.id && editingStep.assetRef?.dayIndex === email.day ? 'bg-brand-red border-brand-red text-white' : 'bg-brand-medium border-brand-border text-brand-subtext hover:border-brand-subtext'}`}
                                          >
                                              <span className="w-16 font-bold opacity-75">Day {email.day}</span>
                                              <span className="truncate flex-1">{email.subject}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              )}

              <div className="flex justify-end pt-4 border-t border-brand-border">
                  <button onClick={saveStep} className="px-8 py-3 bg-white text-brand-dark font-bold rounded-lg hover:bg-gray-200 shadow-lg">
                      Done
                  </button>
              </div>
          </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal show={showImportModal} onClose={() => setShowImportModal(false)} title="Import from Asset Library">
            <div className="space-y-4">
                <p className="text-sm text-brand-subtext">Select a course to import all its emails as sequence steps automatically.</p>
                <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    {assets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between p-4 bg-brand-dark border border-brand-border rounded-xl hover:border-brand-light transition-colors">
                            <div>
                                <h4 className="font-bold text-white">{asset.title}</h4>
                                <p className="text-xs text-brand-subtext mt-1">{asset.emails.length} Emails • Created {new Date(asset.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button 
                                onClick={() => handleBulkImport(asset)}
                                className="px-4 py-2 bg-brand-medium hover:bg-brand-light text-white text-sm font-bold rounded-lg transition-colors border border-brand-border hover:border-white shadow-lg"
                            >
                                Import All {asset.emails.length} Emails
                            </button>
                        </div>
                    ))}
                    {assets.length === 0 && <div className="text-center p-8 text-brand-subtext">No assets found. Generate some content first.</div>}
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default SequenceBuilder;
