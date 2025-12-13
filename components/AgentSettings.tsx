import React from 'react';
import { AgentConfig, ProjectTemplate, ThinkingLevel } from '../types';

interface AgentSettingsProps {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
}

export const AgentSettings: React.FC<AgentSettingsProps> = ({ config, onChange }) => {
  const handleChange = (field: keyof AgentConfig, value: any) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-primary-200 shadow-sm w-full max-w-2xl mx-auto mt-6">
      <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Agent Configuration
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project Template</label>
          <div className="space-y-2">
            {[
              { id: 'standard', label: 'Standard', desc: 'Balanced, monolithic or simple structure.' },
              { id: 'microservices', label: 'Microservices', desc: 'Separated VPCs, modules, and service isolation.' },
              { id: 'serverless', label: 'Serverless', desc: 'Optimized for Lambda, API Gateway, and DynamoDB.' }
            ].map((option) => (
              <label 
                key={option.id}
                className={`
                  relative flex items-start p-3 border rounded-lg cursor-pointer transition-all
                  ${config.template === option.id 
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' 
                    : 'border-gray-200 hover:border-primary-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="template"
                  className="sr-only"
                  checked={config.template === option.id}
                  onChange={() => handleChange('template', option.id as ProjectTemplate)}
                />
                <div className="ml-2">
                  <span className={`block text-sm font-medium ${config.template === option.id ? 'text-primary-900' : 'text-gray-900'}`}>
                    {option.label}
                  </span>
                  <span className={`block text-xs ${config.template === option.id ? 'text-primary-700' : 'text-gray-500'}`}>
                    {option.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">DevOps Automation</label>
             <div className="space-y-2">
               <label className="flex items-center space-x-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={config.generateCICD || false}
                   onChange={(e) => handleChange('generateCICD', e.target.checked)}
                   className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                 />
                 <span className="text-sm text-gray-700">Generate CI/CD (GitHub/GitLab)</span>
               </label>
               <label className="flex items-center space-x-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={config.generateAnsible || false}
                   onChange={(e) => handleChange('generateAnsible', e.target.checked)}
                   className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                 />
                 <span className="text-sm text-gray-700">Generate Ansible Playbooks</span>
               </label>
             </div>
          </div>
        </div>

        {/* Thinking Level & Instructions */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thinking Budget (IQ Level)</label>
            <select
              value={config.thinkingLevel}
              onChange={(e) => handleChange('thinkingLevel', e.target.value as ThinkingLevel)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
            >
              <option value="low">Low (Fast - 4k tokens)</option>
              <option value="medium">Medium (Standard - 16k tokens)</option>
              <option value="high">High (Deep - 32k tokens)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Higher budgets allow for complex reasoning but take longer.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Instructions</label>
            <textarea
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
              placeholder="e.g., Use 'company_module_bucket' for S3, strict naming conventions, prefer spot instances..."
              value={config.customInstructions || ''}
              onChange={(e) => handleChange('customInstructions', e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Hint: Mention custom modules here to use them.</p>
          </div>
        </div>
      </div>
    </div>
  );
};