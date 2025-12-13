import React, { useRef, useState } from 'react';
import { Button } from './Button';

interface UploadZoneProps {
  onStart: (imageFile: File, moduleFile?: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onStart }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const moduleInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onStart(file, moduleFile || undefined);
      } else if (file.name.endsWith('.zip')) {
        setModuleFile(file);
      } else {
        alert('Please drop an image file to start, or a ZIP file for modules.');
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onStart(e.target.files[0], moduleFile || undefined);
    }
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.zip')) {
        setModuleFile(file);
      } else {
        alert('Please select a .zip file for custom modules');
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto text-center space-y-6">
      
      {/* Optional Module Upload */}
      <div className="flex items-center justify-center gap-4 bg-white p-4 rounded-lg border border-primary-200 shadow-sm">
        <div className="text-left flex-1">
          <h4 className="text-sm font-semibold text-primary-900">Custom Modules (RAG)</h4>
          <p className="text-xs text-primary-600">
            {moduleFile 
              ? `Selected: ${moduleFile.name}`
              : "Optional: Upload a .zip containing your company's Terraform modules."
            }
          </p>
        </div>
        <input
          type="file"
          ref={moduleInputRef}
          onChange={handleModuleChange}
          accept=".zip"
          className="hidden"
        />
        {moduleFile ? (
          <Button variant="ghost" size="sm" onClick={() => setModuleFile(null)} className="text-red-500 hover:bg-red-50">
            Remove
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => moduleInputRef.current?.click()}>
            Upload ZIP
          </Button>
        )}
      </div>

      {/* Main Image Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-12 transition-all duration-300
          flex flex-col items-center justify-center gap-4 cursor-pointer
          ${isDragging 
            ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
            : 'border-primary-200 bg-white hover:border-primary-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => imageInputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-primary-900">
          Upload Architecture Diagram
        </h3>
        <p className="text-primary-600 max-w-md">
          Drag and drop your AWS, Azure, or GCP diagram here to start.
        </p>

        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />
        
        <Button size="lg" className="mt-4 pointer-events-none">
          Select Image
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {[
          { icon: '🔍', title: '1. Analyze', desc: 'Agent 1 detects resources from your image.' },
          { icon: '⚙️', title: '2. Generate', desc: 'Agent 2 writes code using your modules.' },
          { icon: '🛡️', title: '3. Validate', desc: 'Agents 3 & 7 check logic and security.' }
        ].map((step, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-primary-100 shadow-sm">
            <span className="text-2xl mb-2 block">{step.icon}</span>
            <h4 className="font-semibold text-primary-900">{step.title}</h4>
            <p className="text-sm text-primary-600">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};