
/**
 * robust-json-parser
 * Helper to clean and parse JSON strings returned by LLMs, handling markdown blocks and formatting issues.
 */

export const cleanAndParseJSON = <T>(text: string, defaultVal?: T): T => {
  if (!text) {
    if (defaultVal !== undefined) return defaultVal;
    throw new Error("Received empty text for JSON parsing");
  }

  let cleaned = text.trim();

  // Remove Markdown code blocks (```json ... ``` or just ``` ... ```)
  // This regex matches the start ```(json)? and the end ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // Remove any text before the first '{' or '[' and after the last '}' or ']'
  const firstOpenBrace = cleaned.indexOf('{');
  const firstOpenBracket = cleaned.indexOf('[');
  let startIndex = -1;

  if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
    startIndex = Math.min(firstOpenBrace, firstOpenBracket);
  } else if (firstOpenBrace !== -1) {
    startIndex = firstOpenBrace;
  } else if (firstOpenBracket !== -1) {
    startIndex = firstOpenBracket;
  }

  if (startIndex !== -1) {
    // Find the end index
    let endIndex = -1;
    // We need to determine if we are looking for } or ] based on what started it
    const isObject = cleaned[startIndex] === '{';
    const lastCloseBrace = cleaned.lastIndexOf('}');
    const lastCloseBracket = cleaned.lastIndexOf(']');
    
    if (isObject) {
      endIndex = lastCloseBrace;
    } else {
      endIndex = lastCloseBracket;
    }

    if (endIndex !== -1 && endIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("JSON Parse Error. Content:", text);
    console.error("Cleaned Content:", cleaned);
    if (defaultVal !== undefined) return defaultVal;
    throw new Error(`Failed to parse AI response as JSON: ${(e as Error).message}`);
  }
};

export const sanitizeMermaidCode = (text: string): string => {
  if (!text) return "";
  // Remove markdown code blocks
  return text.replace(/```mermaid/g, "").replace(/```/g, "").trim();
};
