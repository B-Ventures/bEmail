import React, { useState } from 'react';
import { Email } from '../types';
import Modal from './Modal';

interface ActionButtonsProps {
  currentEmail: Email;
  onReset: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ currentEmail, onReset }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const handleDownload = () => {
    const blob = new Blob([currentEmail.htmlBody], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email_day_${currentEmail.day}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentEmail.htmlBody).then(() => {
      setCopySuccess('HTML copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Failed to copy!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };
  
  const handleViewSource = () => {
      setModalContent(currentEmail.htmlBody);
      setShowModal(true);
  }

  return (
    <>
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-brand-medium text-white font-semibold rounded-lg shadow-md hover:bg-brand-light transition-colors"
        >
          Download HTML
        </button>
        <button
          onClick={handleCopy}
          className="px-6 py-3 bg-brand-medium text-white font-semibold rounded-lg shadow-md hover:bg-brand-light transition-colors"
        >
          {copySuccess || 'Copy HTML'}
        </button>
        <button
          onClick={handleViewSource}
          className="px-6 py-3 bg-brand-medium text-white font-semibold rounded-lg shadow-md hover:bg-brand-light transition-colors"
        >
          View Source
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 bg-brand-red text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors"
        >
          Start Over
        </button>
      </div>
      <Modal show={showModal} onClose={() => setShowModal(false)} title={`Source Code: Day ${currentEmail.day}`}>
          <pre className="bg-brand-dark p-4 rounded-lg text-sm text-left overflow-auto max-h-[60vh]">
              <code>
                  {modalContent}
              </code>
          </pre>
      </Modal>
    </>
  );
};

export default ActionButtons;
