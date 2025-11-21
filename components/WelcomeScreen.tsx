
import React from 'react';

interface WelcomeScreenProps {
  onGenerate: () => void;
  onViewLibrary?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGenerate, onViewLibrary }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-medium via-brand-dark to-black border border-brand-border shadow-2xl p-12 md:p-20 flex flex-col items-center justify-center text-center min-h-[500px]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-red rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-600 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-border/50 backdrop-blur border border-brand-border text-sm text-brand-subtext">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            AI-Powered Course Generation
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight leading-tight">
          Create Email Courses <br/> <span className="text-white">in Seconds</span>
        </h2>
        
        <p className="text-xl text-brand-subtext leading-relaxed max-w-2xl mx-auto">
          Upload your source material and let our AI structure, write, and design a complete multi-day email course for you.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
                onClick={onGenerate}
                className="px-8 py-4 bg-gradient-to-r from-brand-red to-rose-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-red/20 hover:shadow-brand-red/40 hover:scale-105 transition-all duration-300 w-full sm:w-auto flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Start Generating
            </button>
            <button 
                onClick={onViewLibrary}
                className="px-8 py-4 bg-brand-dark border border-brand-border text-white font-semibold text-lg rounded-xl hover:bg-brand-medium transition-all duration-300 w-full sm:w-auto"
            >
                View Asset Library
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
