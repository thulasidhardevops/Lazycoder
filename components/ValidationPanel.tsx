import React from 'react';
import { ValidationResult } from '../types';

interface ValidationPanelProps {
  result: ValidationResult;
  isFinalized?: boolean;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ result, isFinalized }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isFinalized) {
    return (
       <div className="bg-white rounded-lg border border-primary-200 shadow-sm p-4 h-full overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center">
         <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
           <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
           </svg>
         </div>
         <h3 className="font-bold text-primary-900 text-lg mb-2">Issues Fixed in the Code</h3>
         <p className="text-primary-600 text-sm max-w-xs mx-auto mb-4">
           The Finalizer agent has automatically resolved the detected issues and formatted the code to HCL standards.
         </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
            <span>Initial Score: <span className={`font-medium ${getScoreColor(result.score)}`}>{result.score}/100</span></span>
            <span className="text-gray-300">➜</span>
            <span>Final Score: <span className="font-bold text-green-600">100/100</span></span>
          </div>
       </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-primary-200 shadow-sm p-4 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-4 border-b border-primary-100 pb-2">
        <h3 className="font-semibold text-primary-900">Agent 3 Report</h3>
        <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
          {result.score}/100
        </div>
      </div>

      <div className="space-y-6">
        {/* Issues */}
        <div>
          <h4 className="text-sm font-semibold text-primary-800 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Issues Found ({result.issues.length})
          </h4>
          {result.issues.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No critical issues found.</p>
          ) : (
            <ul className="space-y-2">
              {result.issues.map((issue, i) => (
                <li key={i} className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-100">
                  ⚠️ {issue}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <h4 className="text-sm font-semibold text-primary-800 uppercase tracking-wider mb-2 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-blue-500"></span>
             Suggestions ({result.suggestions.length})
          </h4>
          {result.suggestions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No suggestions.</p>
          ) : (
            <ul className="space-y-2">
              {result.suggestions.map((sugg, i) => (
                <li key={i} className="text-sm text-blue-800 bg-blue-50 p-2 rounded border border-blue-100">
                  💡 {sugg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};