
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, TerraformFile, ValidationResult, AgentConfig, CostEstimate, SecurityFinding, ChatMessage, Project } from "../types";
import { cleanAndParseJSON, sanitizeMermaidCode } from "../utils/helpers";

// Initialize AI Client with safe check
const getAI = () => {
  // @ts-ignore
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
  
  if (!apiKey) {
    throw new Error("Critical Error: API_KEY is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

// Thinking Budget Configuration
const getThinkingBudget = (level: 'low' | 'medium' | 'high') => {
  switch (level) {
    case 'low': return 4096;
    case 'medium': return 16384;
    case 'high': return 32768; // Max for 2.5/3 Pro
    default: return 16384;
  }
};

/**
 * AGENT 1: ARCHITECT (Analysis)
 * Analyzes the image to identify resources, provider, and region.
 */
export const analyzeArchitectureImage = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const ai = getAI();
    
    const prompt = `
      You are an Expert Cloud Architect. Analyze this architecture diagram in extreme detail.
      Identify the Cloud Provider (AWS, Azure, GCP), the Region (if inferred), and list every single resource.
      Pay attention to arrows/connections to understand relationships.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Good for vision
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            provider: { type: Type.STRING },
            region: { type: Type.STRING },
            resources: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "provider", "resources"]
        }
      }
    });

    if (!response.text) throw new Error("Received empty response from Agent 1 (Analysis).");
    return cleanAndParseJSON<AnalysisResult>(response.text);
  } catch (error: any) {
    console.error("Agent 1 Error:", error);
    throw new Error(`Agent 1 (Architect) failed: ${error.message}`);
  }
};

/**
 * AGENT 2: GENERATOR (Coding + RAG)
 * Writes Terraform code, optionally using custom modules.
 */
export const generateTerraformCode = async (
  analysis: AnalysisResult, 
  config: AgentConfig,
  customModules: TerraformFile[] = []
): Promise<TerraformFile[]> => {
  try {
    const ai = getAI();

    // Prepare RAG Context
    let ragContext = "";
    if (customModules.length > 0) {
      ragContext = "STRICT INSTRUCTION: The user has provided the following custom Terraform modules. You MUST use these modules instead of raw resources where applicable. Do not reinvent the wheel.\n\n";
      customModules.forEach(file => {
        // Limit context size if necessary, but 1M tokens allows for a lot.
        ragContext += `--- MODULE FILE: ${file.filename} ---\n${file.content}\n\n`;
      });
    }

    const prompt = `
      You are a Senior DevOps Engineer. Write a complete, production-ready Terraform project for this infrastructure:
      ${JSON.stringify(analysis)}

      CONFIGURATION:
      - Template: ${config.template} (e.g., if microservices, separate state/modules)
      - Instructions: ${config.customInstructions || "None"}
      
      ${ragContext}

      REQUIREMENTS:
      1. Code must be strictly formatted in HCL (Terraform \`fmt\` standard).
      2. Split code into logical files: main.tf, variables.tf, outputs.tf, provider.tf.
      3. Use comments to explain complex logic.
      
      Output strictly valid JSON where keys are filenames and values are the file content strings.
      Example: { "main.tf": "resource...", "variables.tf": "variable..." }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // High logic capability
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: getThinkingBudget(config.thinkingLevel) }
      }
    });

    if (!response.text) throw new Error("Received empty response from Agent 2 (Generation).");
    
    const result = cleanAndParseJSON<Record<string, string>>(response.text);

    // Convert object to array
    return Object.entries(result).map(([filename, content]) => ({ 
      filename, 
      content: String(content) 
    }));
  } catch (error: any) {
    console.error("Agent 2 Error:", error);
    throw new Error(`Agent 2 (Generator) failed: ${error.message}`);
  }
};

/**
 * AGENT 3: VALIDATOR (Review)
 * Checks the code for syntax errors, logical flaws, and best practices.
 */
export const validateTerraformCode = async (files: TerraformFile[]): Promise<ValidationResult> => {
  try {
    const ai = getAI();
    const codeContext = files.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      You are a Terraform Code Reviewer. Review the following code for:
      1. HCL Syntax Errors
      2. Missing variables or outputs
      3. Security risks (e.g., open security groups)
      4. Logical gaps (e.g., missing subnets in VPC)
      
      Code to Review:
      ${codeContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            score: { type: Type.NUMBER },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["isValid", "score", "issues", "suggestions"]
        }
      }
    });

    if (!response.text) throw new Error("Received empty response from Agent 3 (Validation).");
    return cleanAndParseJSON<ValidationResult>(response.text);
  } catch (error: any) {
    console.error("Agent 3 Error:", error);
    throw new Error(`Agent 3 (Validator) failed: ${error.message}`);
  }
};

/**
 * AGENT 4: FINALIZER (Fixer)
 * Applies fixes to the code based on validation results.
 */
export const finalizeTerraformCode = async (
  files: TerraformFile[], 
  validation: ValidationResult, 
  config: AgentConfig
): Promise<TerraformFile[]> => {
  try {
    const ai = getAI();
    const codeContext = files.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      You are a Code Fixer Agent. 
      The following Terraform code has issues:
      ${JSON.stringify(validation.issues)}

      Please rewrite the code to fix all issues and apply these suggestions:
      ${JSON.stringify(validation.suggestions)}

      IMPORTANT: ensure strictly formatted HCL code (indentation, alignment).
      Return the FULL set of files in JSON format (filename -> content).
      
      Original Code:
      ${codeContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: getThinkingBudget(config.thinkingLevel) }
      }
    });

    if (!response.text) throw new Error("Received empty response from Agent 4 (Finalizer).");
    
    const result = cleanAndParseJSON<Record<string, string>>(response.text);
    
    return Object.entries(result).map(([filename, content]) => ({ 
      filename, 
      content: String(content) 
    }));
  } catch (error: any) {
    console.error("Agent 4 Error:", error);
    throw new Error(`Agent 4 (Finalizer) failed: ${error.message}`);
  }
};

/**
 * AGENT 5: DOCUMENTOR (Documentation)
 * Generates a comprehensive README.md.
 */
export const generateProjectDocumentation = async (files: TerraformFile[], analysis: AnalysisResult): Promise<TerraformFile> => {
  try {
    const ai = getAI();
    const codeContext = files.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      Create a professional README.md for this Terraform project.
      Project Summary: ${analysis.summary}
      
      Include:
      - Architecture Diagram description
      - Prerequisites (Terraform version, providers)
      - How to Deploy (init, plan, apply)
      - Inputs (Variables) and Outputs
      - Resources Created

      Code:
      ${codeContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Fast, good for text generation
      contents: prompt
    });

    return {
      filename: "README.md",
      content: response.text || "# Project Documentation\n\nGeneration failed."
    };
  } catch (e) {
    console.warn("Agent 5 failed silently:", e);
    return { filename: "README.md", content: "# Documentation Error\nCould not generate documentation." };
  }
};

/**
 * AGENT 6: FINOPS (Cost Estimation)
 * Estimates monthly cost based on resources.
 */
export const estimateProjectCost = async (files: TerraformFile[]): Promise<CostEstimate> => {
  try {
    const ai = getAI();
    const codeContext = files.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      You are a FinOps Cloud Economist. 
      Analyze the following Terraform code and estimate the MONTHLY cost in USD.
      Use your knowledge of standard cloud pricing (AWS/Azure/GCP).
      Assumptions: 730 hours/month (24/7 running), standard region (us-east-1 equivalent).
      
      Return JSON.
      
      Code:
      ${codeContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalMonthlyCost: { type: Type.STRING, description: "e.g. $1,250.00" },
            currency: { type: Type.STRING, description: "USD" },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  resource: { type: Type.STRING },
                  cost: { type: Type.STRING },
                  notes: { type: Type.STRING }
                }
              }
            }
          },
          required: ["totalMonthlyCost", "breakdown"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return cleanAndParseJSON<CostEstimate>(response.text);
  } catch (e) {
    console.warn("Agent 6 failed silently:", e);
    return { totalMonthlyCost: "N/A", currency: "USD", breakdown: [] };
  }
};

/**
 * AGENT 7: SENTINEL (Security Audit)
 * Checks for compliance and security vulnerabilities.
 */
export const performSecurityAudit = async (files: TerraformFile[]): Promise<SecurityFinding[]> => {
  try {
    const ai = getAI();
    const codeContext = files.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      You are a DevSecOps Auditor. Scan this Terraform code for security vulnerabilities.
      Check against CIS Benchmarks, HIPAA, PCI-DSS best practices.
      Look for:
      - Open ports (0.0.0.0/0)
      - Unencrypted storage
      - Missing logging/monitoring
      - Over-permissive IAM
      
      Code:
      ${codeContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              compliance: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["severity", "title", "description"]
          }
        }
      }
    });

    if (!response.text) return [];
    return cleanAndParseJSON<SecurityFinding[]>(response.text, []);
  } catch (e) {
    console.warn("Agent 7 failed silently:", e);
    return [];
  }
};

/**
 * AGENT 8: VISUALIZER (Mermaid Diagram)
 * Reverse engineers code to diagram.
 */
export const generateMermaidDiagram = async (files: TerraformFile[]): Promise<string> => {
  try {
    const ai = getAI();
    const codeContext = files.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      Analyze this Terraform code and generate a Mermaid.js Graph diagram (flowchart TB or graph TD) representing the architecture.
      Use standard mermaid syntax. Return ONLY the string code for the diagram. Do not include markdown ticks.
      
      Code:
      ${codeContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return sanitizeMermaidCode(response.text || "");
  } catch (e) {
    console.warn("Agent 8 failed silently:", e);
    return "";
  }
};

/**
 * AGENT 9: DEVOPS (CI/CD & Ansible)
 * Generates auxiliary automation files.
 */
export const generateDevOpsFiles = async (files: TerraformFile[], config: AgentConfig): Promise<TerraformFile[]> => {
  if (!config.generateCICD && !config.generateAnsible) return [];

  try {
    const ai = getAI();
    const prompt = `
      Based on this Terraform project, generate DevOps automation files.
      ${config.generateCICD ? "- Create a GitHub Actions workflow (.github/workflows/deploy.yml) to plan/apply." : ""}
      ${config.generateAnsible ? "- Create an Ansible playbook (playbook.yml) to configure the generated instances." : ""}
      
      Return JSON object: { filename: content, ... }
      
      Terraform Code Context:
      ${files.slice(0, 3).map(f => f.content).join("\n").substring(0, 5000)}...
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) return [];
    
    const result = cleanAndParseJSON<Record<string, string>>(response.text, {});
    
    return Object.entries(result).map(([filename, content]) => ({ 
      filename, 
      content: String(content) 
    }));
  } catch (e) {
    console.warn("Agent 9 failed silently:", e);
    return [];
  }
};

/**
 * AGENT 10: REFINER (Chat)
 * Interactive chat to modify code.
 */
export const chatWithAgent = async (
  history: ChatMessage[], 
  currentFiles: TerraformFile[], 
  userMessage: string
): Promise<{ text: string, files: TerraformFile[] }> => {
  try {
    const ai = getAI();
    const codeContext = currentFiles.map(f => `--- ${f.filename} ---\n${f.content}`).join("\n");

    const prompt = `
      You are a Coding Assistant helping a user refine their Terraform project.
      
      Current Code:
      ${codeContext}

      User Request: ${userMessage}

      If the user's request requires code changes:
      1. Explain what you are changing.
      2. Provide the UPDATED full content of the affected files in a JSON block at the end of your response.
      
      Format:
      [Explanation text...]
      
      JSON_START
      { "filename.tf": "new content..." }
      JSON_END

      If no code changes are needed, just answer the question.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });

    const rawText = response.text || "";
    let finalText = rawText;
    let files: TerraformFile[] = [];

    // Parse JSON if present
    const jsonStart = rawText.indexOf("JSON_START");
    const jsonEnd = rawText.lastIndexOf("JSON_END");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      finalText = rawText.substring(0, jsonStart).trim();
      try {
        const jsonStr = rawText.substring(jsonStart + 10, jsonEnd).trim();
        const fileObj = cleanAndParseJSON<Record<string, string>>(jsonStr);
        files = Object.entries(fileObj).map(([filename, content]) => ({ 
          filename, 
          content: String(content) 
        }));
      } catch (e) {
        console.error("Failed to parse chat code update:", e);
        finalText += "\n(Error applying code changes automatically)";
      }
    }

    return { text: finalText, files };
  } catch (error: any) {
    console.error("Chat Error:", error);
    return { 
      text: "I encountered an error trying to process your request. Please try again.", 
      files: [] 
    };
  }
};
