
import React, { useState, useEffect } from 'react';

const messages = [
  'Analyzing course structure...',
  'Consulting with AI content experts...',
  'Breaking down content into daily emails...',
  'Crafting compelling subject lines...',
  'Designing beautiful HTML templates...',
  'Finalizing email sequence...',
];

const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center p-8 flex flex-col items-center justify-center gap-6 bg-brand-medium rounded-xl shadow-lg">
       <svg className="animate-spin h-12 w-12 text-brand-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-lg text-brand-text transition-opacity duration-500">{messages[messageIndex]}</p>
    </div>
  );
};

export default Loader;
