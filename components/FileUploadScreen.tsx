import React, { useState } from 'react';

interface FileUploadScreenProps {
  onSubmit: (file: File, artworkUrl: string) => void;
  onBack: () => void;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onSubmit, onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [artworkUrl, setArtworkUrl] = useState<string>('https://images.unsplash.com/photo-1554629947-334ff61d85dc?q=80&w=2072');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const allowedTypes = [
        'text/plain', 
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
    ];

    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile) {
            if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.txt')) {
                setError('Please upload a supported file type (.pdf, .docx, .txt).');
                setFile(null);
            } else {
                setError(null);
                setFile(selectedFile);
            }
        }
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            handleFileChange(droppedFiles[0]);
        }
    };
    
    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please upload your course content file.');
            return;
        }
        if (!artworkUrl.trim()) {
            setError('Please provide an artwork URL for the email header.');
            return;
        }
        onSubmit(file, artworkUrl);
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 bg-brand-medium rounded-xl shadow-lg border border-brand-light">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Upload Your Course Content</h2>
                    <p className="text-brand-subtext mt-2">Upload your course material in PDF, Word, or Text format. AI will analyze and structure it for you.</p>
                </div>

                <div 
                    className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors duration-300 ${isDragging ? 'border-brand-red bg-brand-dark/50' : 'border-brand-light hover:border-brand-red'}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".txt,text/plain,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={onFileInputChange}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-brand-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-white">
                            {file ? `Selected: ${file.name}` : <><span className="font-semibold text-brand-red">Click to upload</span> or drag and drop</>}
                        </p>
                        <p className="text-xs text-brand-subtext mt-1">Supports PDF, DOCX, and TXT</p>
                    </label>
                </div>
                
                <div>
                    <label htmlFor="artwork-url" className="block text-sm font-medium text-brand-text mb-2">Header Artwork URL</label>
                    <input
                        type="url"
                        id="artwork-url"
                        value={artworkUrl}
                        onChange={(e) => setArtworkUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full p-3 bg-brand-dark border border-brand-light rounded-md text-white focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none"
                    />
                     <p className="text-xs text-brand-subtext mt-2">Provide a link to a high-quality background image for the email header. Find one on <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-brand-red underline">Unsplash</a>.</p>
                </div>
                
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md">{error}</p>}
                
                <div className="flex items-center justify-between mt-4">
                    <button 
                        type="button"
                        onClick={onBack}
                        className="px-6 py-3 text-brand-text font-semibold rounded-lg hover:bg-brand-light/50 transition-colors"
                    >
                        Back
                    </button>
                    <button 
                        type="submit"
                        disabled={!file}
                        className="px-8 py-3 bg-brand-red text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Generate Emails
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FileUploadScreen;