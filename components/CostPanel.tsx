import React from 'react';
import { CostEstimate } from '../types';

interface CostPanelProps {
  cost: CostEstimate | null;
  isLoading: boolean;
}

export const CostPanel: React.FC<CostPanelProps> = ({ cost, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-pulse">
        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Agent 6 (FinOps) is estimating monthly cloud costs...</p>
      </div>
    );
  }

  if (!cost) return <div className="p-4 text-center">No cost data available.</div>;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-white">
      <div className="bg-primary-50 rounded-lg p-6 mb-6 flex items-center justify-between border border-primary-100 shadow-sm">
        <div>
          <h3 className="text-primary-900 font-semibold mb-1">Estimated Monthly Cost</h3>
          <p className="text-sm text-primary-600">Based on on-demand pricing (approximate)</p>
        </div>
        <div className="text-4xl font-bold text-primary-700">
          {cost.totalMonthlyCost} <span className="text-base font-normal text-primary-500">{cost.currency}</span>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes / Assumptions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cost.breakdown.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.resource}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">{item.cost}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-gray-400 text-center">
        *Disclaimer: These are AI-generated estimates. Actual cloud provider costs may vary based on region, usage patterns, and taxes.
      </p>
    </div>
  );
};