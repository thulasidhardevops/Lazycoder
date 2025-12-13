export enum ProjectStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  REVIEWING = 'REVIEWING',
  FINALIZING = 'FINALIZING',
  POST_PROCESSING = 'POST_PROCESSING', // New parallel step
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type ProjectTemplate = 'standard' | 'microservices' | 'serverless';
export type ThinkingLevel = 'low' | 'medium' | 'high';

export interface AgentConfig {
  template: ProjectTemplate;
  thinkingLevel: ThinkingLevel;
  customInstructions?: string;
  generateCICD?: boolean;
  generateAnsible?: boolean;
}

export interface AnalysisResult {
  summary: string;
  resources: string[];
  provider: string;
  region?: string;
}

export interface TerraformFile {
  filename: string;
  content: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
}

export interface CostEstimate {
  totalMonthlyCost: string;
  currency: string;
  breakdown: Array<{
    resource: string;
    cost: string;
    notes?: string;
  }>;
}

export interface SecurityFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  compliance: string[]; // e.g. ['HIPAA', 'PCI']
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  image: File | null;
  imageUrl: string | null;
  status: ProjectStatus;
  
  // Data
  analysis: AnalysisResult | null;
  code: TerraformFile[];
  customModules: TerraformFile[]; // RAG Context
  validation: ValidationResult | null;
  cost: CostEstimate | null;
  security: SecurityFinding[];
  mermaidDiagram: string | null; // Mermaid Code
  chatHistory: ChatMessage[];
  
  error?: string;
  logs: string[];
  config: AgentConfig;
}

export type Step = 'UPLOAD' | 'PREVIEW';