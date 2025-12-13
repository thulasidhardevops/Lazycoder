import React from 'react';
import { SecurityFinding } from '../types';

interface SecurityPanelProps {
  findings: SecurityFinding[];
  isLoading: boolean;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ findings, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-pulse">
        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p>Agent 7 (Sentinel) is auditing for vulnerabilities...</p>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">System Secure</h3>
        <p className="text-gray-600 max-w-sm mt-2">
          No critical security vulnerabilities or compliance violations were detected by the Sentinel.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-white">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Security & Compliance Report</h3>
        <p className="text-sm text-gray-500">Found {findings.length} issues requiring attention.</p>
      </div>

      <div className="space-y-4">
        {findings.map((finding, idx) => {
          let severityColor = "bg-gray-100 text-gray-800 border-gray-200";
          if (finding.severity === 'CRITICAL') severityColor = "bg-red-50 text-red-900 border-red-200";
          if (finding.severity === 'HIGH') severityColor = "bg-orange-50 text-orange-900 border-orange-200";
          if (finding.severity === 'MEDIUM') severityColor = "bg-yellow-50 text-yellow-900 border-yellow-200";

          return (
            <div key={idx} className={`p-4 rounded-lg border ${severityColor}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                   <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${severityColor.replace('bg-', 'bg-white ')}`}>
                     {finding.severity}
                   </span>
                   <h4 className="font-semibold">{finding.title}</h4>
                </div>
                {finding.compliance && finding.compliance.length > 0 && (
                  <div className="flex gap-1">
                    {finding.compliance.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-white bg-opacity-50 text-xs rounded border border-current opacity-75">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm opacity-90">{finding.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};