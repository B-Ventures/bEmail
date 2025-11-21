import React from 'react';
import { EmailTask } from '../types';

interface ProgressTrackerProps {
  tasks: EmailTask[];
}

const StatusIcon: React.FC<{ status: EmailTask['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <div className="h-5 w-5 rounded-full border-2 border-brand-subtext"></div>;
    case 'processing':
      return (
        <svg className="animate-spin h-5 w-5 text-brand-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    case 'done':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'error':
       return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    default:
      return null;
  }
};

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ tasks }) => {
  return (
    <div className="w-full bg-brand-medium rounded-xl shadow-lg p-6 border border-brand-light">
      <h3 className="text-xl font-bold text-white mb-4">Generation Progress</h3>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-4">
            <StatusIcon status={task.status} />
            <span className={`transition-colors duration-300 ${task.status === 'pending' ? 'text-brand-subtext' : 'text-brand-text'}`}>
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProgressTracker;
