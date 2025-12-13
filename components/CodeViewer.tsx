import React, { useState, useEffect } from 'react';
import { TerraformFile, CostEstimate, SecurityFinding, ChatMessage, ProjectStatus } from '../types';
import { Button } from './Button';
import { CostPanel } from './CostPanel';
import { SecurityPanel } from './SecurityPanel';
import { MermaidDiagram } from './MermaidDiagram';
import { ChatInterface } from './ChatInterface';

interface CodeViewerProps {
  files: TerraformFile[];
  cost: CostEstimate | null;
  security: SecurityFinding[];
  diagram: string | null;
  chatHistory: ChatMessage[];
  status: ProjectStatus;
  
  onDownload: (filename: string, content: string) => void;
  onDownloadAll: (filename: string, files: TerraformFile[]) => void;
  onChat: (msg: string) => void;
}

type Tab = 'code' | 'diagram' | 'cost' | 'security' | 'chat';

export const CodeViewer: React.FC<CodeViewerProps> = ({ 
  files, cost, security, diagram, chatHistory, status,
  onDownload, onDownloadAll, onChat 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentFiles, setCurrentFiles] = useState(files);

  const isPostProcessing = status === ProjectStatus.POST_PROCESSING || status === ProjectStatus.FINALIZING;

  useEffect(() => {
    setCurrentFiles(files);
    // Auto-switch to README if it exists and we are in code tab
    if (activeTab === 'code' && files.length > 0 && files[files.length - 1].filename === 'README.md') {
       setActiveFileIndex(files.length - 1);
    }
  }, [files]);

  const activeFile = currentFiles[activeFileIndex];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-primary-200 overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-primary-200">
        <div className="flex space-x-1">
          {[
            { id: 'code', label: 'Code', icon: 'code' },
            { id: 'diagram', label: 'Diagram', icon: 'diagram' },
            { id: 'cost', label: 'FinOps', icon: 'currency-dollar' },
            { id: 'security', label: 'Sentinel', icon: 'shield-check' },
            { id: 'chat', label: 'Refine', icon: 'chat' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                ${activeTab === tab.id 
                  ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <span className="capitalize">{tab.label}</span>
              {tab.id === 'security' && security.length > 0 && (
                <span className="bg-red-100 text-red-600 px-1.5 rounded-full text-xs">{security.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'code' && (
          <div className="flex gap-2">
             <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDownloadAll("terraform-project", currentFiles)}
            >
              Download Project (ZIP)
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-gray-100">
        
        {/* TAB: CODE */}
        {activeTab === 'code' && (
          <div className="flex flex-col h-full">
            {/* File List */}
            <div className="flex overflow-x-auto bg-white border-b border-gray-200 px-2 pt-2 gap-1 custom-scrollbar shrink-0">
               {currentFiles.map((file, idx) => (
                <button
                  key={file.filename}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-t-md border-t border-x transition-colors whitespace-nowrap
                    ${idx === activeFileIndex 
                      ? 'bg-gray-50 border-gray-200 text-primary-700 relative top-[1px]' 
                      : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
                    }
                  `}
                >
                  {file.filename}
                </button>
              ))}
            </div>
            {/* Editor */}
            <div className="flex-1 relative">
              {activeFile ? (
                 <textarea
                  className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none custom-scrollbar"
                  value={activeFile.content}
                  readOnly
                  spellCheck={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">No files generated.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: DIAGRAM */}
        {activeTab === 'diagram' && (
          <MermaidDiagram chart={diagram || ''} />
        )}

        {/* TAB: COST */}
        {activeTab === 'cost' && (
          <CostPanel cost={cost} isLoading={isPostProcessing && !cost} />
        )}

        {/* TAB: SECURITY */}
        {activeTab === 'security' && (
          <SecurityPanel findings={security} isLoading={isPostProcessing && security.length === 0} />
        )}

        {/* TAB: CHAT */}
        {activeTab === 'chat' && (
          <ChatInterface 
            history={chatHistory} 
            onSendMessage={onChat}
            isProcessing={isPostProcessing} // Simplification: lock chat during generation
          />
        )}

      </div>
    </div>
  );
};