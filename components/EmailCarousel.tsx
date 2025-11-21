
import React, { useState } from 'react';
import { Email } from '../types';
import EmailPreview from './EmailPreview';
import ActionButtons from './ActionButtons';
import ParsedDataViewer from './ParsedDataViewer';

interface EmailCarouselProps {
  emails: Email[];
  courseTitle: string;
  onReset: () => void;
  onSaveAsset: (title: string) => void;
}

const EmailCarousel: React.FC<EmailCarouselProps> = ({ emails, courseTitle, onReset, onSaveAsset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editTitle, setEditTitle] = useState(courseTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const goToPrevious = () => {
    const isFirstEmail = currentIndex === 0;
    const newIndex = isFirstEmail ? emails.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastEmail = currentIndex === emails.length - 1;
    const newIndex = isLastEmail ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };
  
  const currentEmail = emails[currentIndex];

  if (!currentEmail) {
    return <div>No emails to display.</div>;
  }

  return (
    <div className="w-full max-w-[96rem] mx-auto flex flex-col items-center gap-6">
      <div className="text-center w-full max-w-2xl relative">
        {isEditingTitle ? (
             <div className="flex items-center justify-center gap-2">
                <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-3xl font-extrabold text-white bg-brand-dark border border-brand-light p-2 rounded text-center w-full"
                    autoFocus
                />
                <button onClick={() => setIsEditingTitle(false)} className="bg-green-600 text-white px-3 py-2 rounded">OK</button>
             </div>
        ) : (
            <h2 
                className="text-4xl font-extrabold text-white cursor-pointer hover:text-brand-red transition-colors"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit title"
            >
                {editTitle}
                <span className="text-sm text-brand-subtext ml-2 align-middle font-normal">(Edit)</span>
            </h2>
        )}
        <p className="text-lg text-brand-subtext mt-2">Your {emails.length}-day email course has been generated!</p>
        
        <button 
            onClick={() => onSaveAsset(editTitle)}
            className="absolute right-0 top-0 hidden lg:block px-4 py-2 bg-brand-red text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors text-sm"
        >
            Save to Assets
        </button>
      </div>

      <div className="lg:hidden w-full">
           <button 
            onClick={() => onSaveAsset(editTitle)}
            className="w-full px-4 py-3 bg-brand-red text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors mb-4"
        >
            Save to Assets
        </button>
      </div>

      <div className="w-full flex items-center justify-center gap-4">
        <button onClick={goToPrevious} className="p-3 rounded-full bg-brand-medium hover:bg-brand-light transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <div className="text-white text-lg font-semibold w-32 text-center">
          Day {currentEmail.day} <span className="text-brand-subtext font-normal">of {emails.length}</span>
        </div>
        
        <button onClick={goToNext} className="p-3 rounded-full bg-brand-medium hover:bg-brand-light transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 h-[75vh]">
          <ParsedDataViewer data={currentEmail.parsedData} />
          <div className="flex flex-col h-full gap-4">
            <EmailPreview email={currentEmail} />
            <ActionButtons currentEmail={currentEmail} onReset={onReset} />
          </div>
      </div>
    </div>
  );
};

export default EmailCarousel;
