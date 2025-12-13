import React from 'react';
import { ProjectStatus } from '../types';

interface PipelineVisualizerProps {
  status: ProjectStatus;
}

const steps = [
  { id: 'analyze', label: 'Analyze', statusMatch: [ProjectStatus.ANALYZING] },
  { id: 'generate', label: 'Generate', statusMatch: [ProjectStatus.GENERATING] },
  { id: 'validate', label: 'Validate', statusMatch: [ProjectStatus.REVIEWING] },
  { id: 'finalize', label: 'Finalize', statusMatch: [ProjectStatus.FINALIZING] },
  { id: 'document', label: 'Document', statusMatch: [ProjectStatus.POST_PROCESSING, ProjectStatus.COMPLETED] },
];

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ status }) => {
  const getStepState = (stepIndex: number) => {
    const currentStepIndex = steps.findIndex(s => s.statusMatch.includes(status));
    
    // If completed, all steps are done
    if (status === ProjectStatus.COMPLETED) return 'completed';

    // If generic error, we check if the error happened at or before this step
    if (status === ProjectStatus.ERROR) {
       // Ideally we would know exactly which step failed, but for now we mark pending as error if index is 0 and status is error
       // or we simply show the first step as error if everything else failed
       if (currentStepIndex === -1) return stepIndex === 0 ? 'error' : 'pending';
       if (stepIndex === currentStepIndex) return 'error';
       if (stepIndex < currentStepIndex) return 'completed';
       return 'pending';
    }

    if (currentStepIndex === -1 && status === ProjectStatus.IDLE) return 'pending';

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full py-4 px-2">
      <div className="flex flex-col gap-0 relative">
        {/* Connecting Line (Vertical) */}
        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 -z-10"></div>

        {steps.map((step, index) => {
          const state = getStepState(index);
          
          let icon = <div className="w-2 h-2 rounded-full bg-gray-400" />;
          let bgColor = "bg-white border-2 border-gray-300";
          let textColor = "text-gray-500";
          
          if (state === 'active') {
            icon = (
              <svg className="w-5 h-5 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            );
            bgColor = "bg-primary-50 border-2 border-primary-500 shadow-md scale-110";
            textColor = "text-primary-800 font-bold";
          } else if (state === 'completed') {
            icon = (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            );
            bgColor = "bg-green-500 border-2 border-green-500";
            textColor = "text-green-700 font-medium";
          } else if (state === 'error') {
            icon = (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            );
            bgColor = "bg-red-500 border-2 border-red-500 shadow-md";
            textColor = "text-red-700 font-bold";
          }

          return (
            <div key={step.id} className="flex items-center gap-4 py-3 group">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${bgColor}`}>
                {icon}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm transition-colors duration-300 ${textColor}`}>
                  {step.label}
                </span>
                {state === 'active' && (
                  <span className="text-xs text-primary-500 animate-pulse">Processing...</span>
                )}
                {state === 'error' && (
                  <span className="text-xs text-red-500 font-semibold">Failed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};