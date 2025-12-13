import JSZip from 'jszip';
import { TerraformFile } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the Data-URL declaration (e.g., "data:image/png;base64,")
        const base64Content = reader.result.split(',')[1];
        resolve(base64Content);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const downloadFile = (filename: string, content: string) => {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const downloadZip = async (filename: string, files: TerraformFile[]) => {
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.filename, file.content);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const element = document.createElement('a');
  element.href = URL.createObjectURL(content);
  element.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const extractTextFilesFromZip = async (file: File): Promise<TerraformFile[]> => {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const files: TerraformFile[] = [];

    // Iterate through each file in the zip
    for (const [filename, fileEntry] of Object.entries(loadedZip.files)) {
      // Skip directories and MacOS hidden files
      if (fileEntry.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) continue;

      // Only read text-based files relevant to Terraform modules
      if (filename.endsWith('.tf') || filename.endsWith('.md') || filename.endsWith('.json') || filename.endsWith('.yaml') || filename.endsWith('.txt')) {
        const content = await fileEntry.async('string');
        files.push({ filename, content });
      }
    }
    return files;
  } catch (error) {
    console.error("Error extracting zip:", error);
    throw new Error("Failed to extract custom modules. Please ensure it is a valid ZIP file.");
  }
};