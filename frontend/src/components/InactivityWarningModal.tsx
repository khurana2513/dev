/**
 * Inactivity Warning Modal
 * 
 * Displays a modal when user has been inactive for 25 minutes,
 * warning them that they've been idle. Users can dismiss to confirm they're still active.
 */

import { Activity } from 'lucide-react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export default function InactivityWarningModal({ isOpen, onDismiss }: InactivityWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          Are you still there?
        </h2>
        
        <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
          You've been inactive for about 25 minutes. Your session is still active, but we wanted to check if you're still working.
        </p>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> You won't be logged out automatically. Your session will remain active until you explicitly log out or close your browser.
          </p>
        </div>
        
        <button
          onClick={onDismiss}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Yes, I'm still here
        </button>
      </div>
    </div>
  );
}
