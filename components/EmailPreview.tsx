import React from 'react';
import { Email } from '../types';

interface EmailPreviewProps {
  email: Email;
}

const EmailPreview: React.FC<EmailPreviewProps> = ({ email }) => {
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-brand-light flex flex-col">
      <div className="p-3 bg-brand-medium flex items-center gap-2 flex-shrink-0">
         <div className="h-3 w-3 rounded-full bg-red-500"></div>
         <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
         <div className="h-3 w-3 rounded-full bg-green-500"></div>
         <div className="ml-4 text-xs text-brand-text font-medium bg-brand-dark px-3 py-1 rounded-md truncate">{email.subject}</div>
      </div>
      <iframe
        srcDoc={email.htmlBody}
        title={`Email Preview: ${email.subject}`}
        className="w-full h-full border-0"
        sandbox="allow-scripts"
      />
    </div>
  );
};

export default EmailPreview;
