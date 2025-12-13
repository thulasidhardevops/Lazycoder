export const generateCliScript = () => {
  return `/**
 * Lazy Coder CLI (Enterprise Edition)
 * 
 * Usage:
 *   1. npm install @google/genai dotenv
 *   2. Set API_KEY in .env or environment variables
 *   3. node lazy-coder-cli.js --image <path-to-image> [--out <output-dir>]
 */

const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Error: API_KEY not found in environment variables.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Agent Logic ---

async function analyzeImage(imagePath) {
  console.log("Agent 1 (Architect): Analyzing topology...");
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const prompt = \`
    Analyze this architecture diagram.
    Return JSON with: summary, resources (array), provider, region.
  \`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    },
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text);
}

async function generateCode(analysis) {
  console.log("Agent 2 (Generator): Writing Infrastructure as Code...");
  const prompt = \`
    Write production Terraform code for: \${JSON.stringify(analysis)}.
    Strictly follow HCL formatting (2 space indent).
    Include comments.
    Return JSON object where keys are filenames and values are content.
  \`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 16384 },
      responseMimeType: "application/json",
    }
  });

  const result = JSON.parse(response.text);
  return result.files || result; 
}

async function generateDocs(codeFiles) {
  console.log("Agent 5 (Documentor): Generating README...");
  const codeContext = Object.values(codeFiles).join('\\n');
  const prompt = \`Write a README.md for this terraform code: \${codeContext.substring(0, 10000)}...\`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
}

// --- Main Execution ---

async function main() {
  const args = process.argv.slice(2);
  const imageArgIndex = args.indexOf('--image');
  const outArgIndex = args.indexOf('--out');

  if (imageArgIndex === -1) {
    console.log("Usage: node lazy-coder-cli.js --image <path>");
    return;
  }

  const imagePath = args[imageArgIndex + 1];
  const outDir = outArgIndex !== -1 ? args[outArgIndex + 1] : './output';

  try {
    if (!fs.existsSync(imagePath)) throw new Error("Image file not found");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const analysis = await analyzeImage(imagePath);
    console.log(\`Detected: \${analysis.provider} (\${analysis.resources.length} resources)\`);

    let files = await generateCode(analysis);
    
    // Normalize files structure
    let fileMap = {};
    if (Array.isArray(files)) {
        files.forEach(f => fileMap[f.filename] = f.content);
    } else {
        fileMap = files;
    }

    const readme = await generateDocs(fileMap);
    fileMap[readme.filename || "README.md"] = readme.content;

    // Write to disk
    Object.entries(fileMap).forEach(([name, content]) => {
        fs.writeFileSync(path.join(outDir, name), content);
    });

    console.log(\`\\nSuccess! \${Object.keys(fileMap).length} files generated in \${outDir}\`);

  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
`;
};