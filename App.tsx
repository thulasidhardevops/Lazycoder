
import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { Button } from './components/Button';
import { CodeViewer } from './components/CodeViewer';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { AgentSettings } from './components/AgentSettings';
import { Project, ProjectStatus, AgentConfig, TerraformFile, ChatMessage } from './types';
import { 
  analyzeArchitectureImage, 
  generateTerraformCode, 
  validateTerraformCode, 
  finalizeTerraformCode, 
  generateProjectDocumentation,
  estimateProjectCost,
  performSecurityAudit,
  generateMermaidDiagram,
  generateDevOpsFiles,
  chatWithAgent
} from './services/gemini';
import { fileToBase64, downloadFile, downloadZip, extractTextFilesFromZip } from './utils/fileHelpers';
import { generateCliScript } from './utils/cliGenerator';

const App: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    template: 'standard',
    thinkingLevel: 'medium',
    customInstructions: '',
    generateCICD: false,
    generateAnsible: false
  });

  // Helper to safely update state
  const updateProject = (id: string, updates: Partial<Project>) => {
    setCurrentProject(prev => {
      if (!prev || prev.id !== id) return prev;
      const newLogs = updates.logs ? [...prev.logs, ...updates.logs] : prev.logs;
      return { ...prev, ...updates, logs: newLogs };
    });
  };

  const addLog = (id: string, message: string) => {
    setCurrentProject(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, logs: [...prev.logs, message] };
    });
  };

  const startProject = async (imageFile: File, moduleFile?: File) => {
    // Initialize empty project state
    const newProject: Project = {
      id: Date.now().toString(),
      name: imageFile.name.split('.')[0],
      createdAt: Date.now(),
      image: imageFile,
      imageUrl: URL.createObjectURL(imageFile),
      status: ProjectStatus.ANALYZING,
      analysis: null,
      code: [],
      customModules: [],
      validation: null,
      cost: null,
      security: [],
      mermaidDiagram: null,
      chatHistory: [],
      logs: ["Starting enterprise pipeline..."],
      config: agentConfig
    };
    
    setCurrentProject(newProject);
    
    try {
      // 0. Process Custom Modules (RAG) if present
      let modules: TerraformFile[] = [];
      if (moduleFile) {
        addLog(newProject.id, "System: Extracting custom modules context...");
        try {
          modules = await extractTextFilesFromZip(moduleFile);
          addLog(newProject.id, `System: Loaded ${modules.length} custom module files.`);
        } catch (e) {
          addLog(newProject.id, `System Error: Failed to load modules - ${(e as Error).message}`);
        }
      }
      
      // Update state with modules
      // Note: We access the ID from local variable to ensure we don't need closure access to state
      setCurrentProject(prev => prev && prev.id === newProject.id ? { ...prev, customModules: modules } : prev);

      // 1. Convert Image
      const base64 = await fileToBase64(imageFile);
      
      // 2. Agent 1: Analysis
      addLog(newProject.id, "Agent 1 (Architect): Analyzing diagram topology...");
      const analysis = await analyzeArchitectureImage(base64, imageFile.type);
      updateProject(newProject.id, { 
        analysis, 
        status: ProjectStatus.GENERATING,
        logs: [`Agent 1: Detected ${analysis.provider} architecture in ${analysis.region || 'us-east-1'}.`, "Agent 2 (Generator): Drafting Infrastructure as Code..."] 
      });

      // 3. Agent 2: Generation (Passed Modules here)
      const generatedCode = await generateTerraformCode(analysis, agentConfig, modules);
      updateProject(newProject.id, { 
        code: generatedCode, 
        status: ProjectStatus.REVIEWING,
        logs: ["Agent 2: Code generated.", "Agent 3 (Sentinel): Reviewing for compliance..."]
      });

      // 4. Agent 3: Validation
      const validation = await validateTerraformCode(generatedCode);
      updateProject(newProject.id, { 
        validation, 
        status: ProjectStatus.FINALIZING,
        logs: [`Agent 3: Review Score: ${validation.score}/100.`, "Agent 4 (Finalizer): Polishing and formatting..."]
      });

      // 5. Agent 4: Finalizer
      let finalCode = generatedCode;
      if (validation.score < 100 || validation.issues.length > 0) {
        finalCode = await finalizeTerraformCode(generatedCode, validation, agentConfig);
        addLog(newProject.id, "Agent 4: Applied fixes.");
      }

      updateProject(newProject.id, {
        code: finalCode,
        status: ProjectStatus.POST_PROCESSING,
        logs: ["Starting Parallel Agents: Documentation, FinOps, Security, Visualization..."]
      });

      // 6. Parallel Execution (Agents 5-9)
      // We use Promise.all but the agents themselves catch errors silently and return default values
      // This ensures one failure doesn't crash the entire pipeline
      const [docs, cost, security, diagram, devopsFiles] = await Promise.all([
        generateProjectDocumentation(finalCode, analysis),
        estimateProjectCost(finalCode),
        performSecurityAudit(finalCode),
        generateMermaidDiagram(finalCode),
        generateDevOpsFiles(finalCode, agentConfig)
      ]);

      const allFiles = [...finalCode, ...devopsFiles, docs];

      updateProject(newProject.id, { 
        code: allFiles,
        cost,
        security,
        mermaidDiagram: diagram,
        status: ProjectStatus.COMPLETED,
        logs: [
          "Agent 5 (Documentor): README created.",
          `Agent 6 (FinOps): Estimated cost ${cost.totalMonthlyCost}.`,
          `Agent 7 (Sentinel): Found ${security.length} findings.`,
          "Agent 8 (Visualizer): Diagram rendered.",
          "Agent 9 (DevOps): CI/CD & Automation files added.",
          "Pipeline Successfully Completed."
        ]
      });

    } catch (err: any) {
      console.error(err);
      updateProject(newProject.id, { 
        status: ProjectStatus.ERROR, 
        error: err.message || "An unknown error occurred",
        logs: [`CRITICAL FAILURE: ${err.message}`]
      });
    }
  };

  const handleChat = async (msg: string) => {
    if (!currentProject) return;
    
    // Optimistic update
    const newHistory: ChatMessage[] = [...currentProject.chatHistory, { role: 'user', text: msg, timestamp: Date.now() }];
    
    // Using explicit update instead of generic partial
    setCurrentProject(prev => prev ? { ...prev, chatHistory: newHistory } : null);

    const response = await chatWithAgent(newHistory, currentProject.code, msg);

    const updatedHistory: ChatMessage[] = [...newHistory, { role: 'model', text: response.text, timestamp: Date.now() }];
    
    // If files were modified, update them
    let updatedCode = currentProject.code;
    if (response.files && response.files.length > 0) {
      const fileMap = new Map(currentProject.code.map(f => [f.filename, f]));
      response.files.forEach(f => fileMap.set(f.filename, f));
      updatedCode = Array.from(fileMap.values());
      addLog(currentProject.id, `Agent 10 (Refiner): Updated ${response.files.length} files based on chat.`);
    }

    setCurrentProject(prev => prev ? { ...prev, chatHistory: updatedHistory, code: updatedCode } : null);
  };

  const handleReset = () => {
    setCurrentProject(null);
  };

  const handleDownloadCli = () => {
    const script = generateCliScript();
    downloadFile('lazy-coder-cli.js', script);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-primary-200 h-16 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
            LC
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-900 tracking-tight leading-none">Lazy Coder</h1>
            <span className="text-xs text-primary-500 font-medium">Enterprise Edition</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleDownloadCli} title="Download CLI">
             CLI Tool
          </Button>
          {currentProject && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              New Project
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {!currentProject ? (
          // Empty State
          <div className="h-full overflow-y-auto bg-gradient-to-br from-primary-50 to-white">
            <div className="max-w-4xl mx-auto py-12 px-6">
              <div className="mb-10 text-center">
                 <h2 className="text-4xl font-extrabold text-primary-900 mb-4">
                   Infrastructure from Imagination
                 </h2>
                 <p className="text-xl text-primary-700 max-w-2xl mx-auto">
                   Multi-Agent AI that Converts Diagrams to Code.
                   <br/>
                   <span className="text-sm mt-2 block text-primary-500">
                     Includes FinOps Costing, DevSecOps Auditing, and Automated Documentation.
                   </span>
                 </p>
              </div>
              
              <UploadZone onStart={startProject} />
              
              <AgentSettings config={agentConfig} onChange={setAgentConfig} />
            </div>
          </div>
        ) : (
          // Project View
          <div className="h-full flex flex-col md:flex-row">
            
            {/* Left Sidebar */}
            <div className="w-full md:w-80 lg:w-96 bg-white border-r border-primary-200 flex flex-col h-full overflow-hidden shrink-0 z-20">
              {/* Image Preview */}
              <div className="p-4 border-b border-primary-100 shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-primary-900">Source</h3>
                  <span className="text-[10px] uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-1 rounded border border-primary-100">
                    {currentProject.config.template}
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-primary-100 bg-gray-50 aspect-video group cursor-pointer shadow-inner">
                  {currentProject.imageUrl && (
                    <img 
                      src={currentProject.imageUrl} 
                      alt="Architecture" 
                      className="w-full h-full object-contain" 
                    />
                  )}
                </div>
                {/* RAG Status */}
                {currentProject.customModules.length > 0 && (
                   <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Using {currentProject.customModules.length} Custom Modules
                   </div>
                )}
              </div>
              
              {/* Pipeline Status */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="p-4">
                  <h3 className="font-semibold text-primary-900 mb-2">Agents</h3>
                  <PipelineVisualizer status={currentProject.status} />
                </div>

                {/* Logs */}
                <div className="flex-1 bg-gray-900 p-4 font-mono text-[10px] leading-relaxed text-green-400 overflow-y-auto border-t border-gray-700">
                   <div className="mb-2 text-gray-500 font-bold uppercase tracking-wider">System Kernel</div>
                   {currentProject.logs.map((log, i) => (
                     <div key={i} className="mb-1 break-words">
                       <span className="opacity-40 mr-1">{i+1}.</span>
                       {log}
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Right Workspace (Dashboard) */}
            <div className="flex-1 flex flex-col h-full bg-primary-50 p-4 gap-4 overflow-hidden relative">
              
              {/* Error State - Prioritized */}
              {currentProject.status === ProjectStatus.ERROR ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8">
                     <div className="text-center bg-white rounded-xl shadow-lg border border-red-200 max-w-lg w-full p-8">
                       <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                         <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       </div>
                       <h3 className="text-xl font-bold text-red-600 mb-2">Process Interrupted</h3>
                       <p className="text-gray-600 mb-6">{currentProject.error}</p>
                       
                       <div className="text-left bg-gray-900 rounded-lg p-4 mb-6 overflow-hidden">
                         <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Last Logs</span>
                         </div>
                         <div className="font-mono text-xs text-red-300 max-h-48 overflow-y-auto custom-scrollbar">
                           {currentProject.logs.slice(-5).map((log, i) => (
                             <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                               {log}
                             </div>
                           ))}
                         </div>
                       </div>
                       
                       <div className="flex gap-4 justify-center">
                         <Button onClick={handleReset} variant="outline">Back to Start</Button>
                         <Button onClick={() => window.location.reload()} variant="primary">Reload App</Button>
                       </div>
                     </div>
                 </div>
              ) : currentProject.code.length > 0 ? (
                // Success / Viewer State
                <div className="flex-1 h-full min-h-0">
                  <CodeViewer 
                    files={currentProject.code}
                    cost={currentProject.cost}
                    security={currentProject.security}
                    diagram={currentProject.mermaidDiagram}
                    chatHistory={currentProject.chatHistory}
                    status={currentProject.status}
                    onDownload={downloadFile}
                    onDownloadAll={downloadZip}
                    onChat={handleChat}
                  />
                </div>
              ) : (
                // Loading State
                <div className="flex-1 flex flex-col items-center justify-center text-primary-400">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-lg font-medium text-primary-900 animate-pulse">
                       {currentProject.status === ProjectStatus.ANALYZING && "Analyzing Architecture..."}
                       {currentProject.status === ProjectStatus.GENERATING && "Drafting Terraform Code..."}
                       {currentProject.status === ProjectStatus.REVIEWING && "Validating Configuration..."}
                       {currentProject.status === ProjectStatus.FINALIZING && "Finalizing Code..."}
                       {currentProject.status === ProjectStatus.POST_PROCESSING && "Generating Extras (Docs, Diagrams, Security)..."}
                    </h3>
                    <p className="text-sm mt-2 opacity-75 max-w-xs text-center text-gray-500">
                       {currentProject.logs[currentProject.logs.length - 1]}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
