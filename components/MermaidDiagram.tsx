
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'neutral',
      securityLevel: 'loose',
      logLevel: 'error',
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!ref.current || !chart) return;
      setError(null);
      ref.current.innerHTML = ''; // Clear previous

      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        setError("Failed to render diagram. The generated syntax might be invalid.");
      }
    };

    renderChart();
  }, [chart]);

  if (!chart) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 italic">
        No diagram data available.
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-white p-4 flex items-center justify-center">
      {error ? (
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <details className="text-left text-xs text-red-400 font-mono mt-2 cursor-pointer">
            <summary>Raw Mermaid Code</summary>
            <pre className="mt-1 p-2 bg-red-100 rounded">{chart}</pre>
          </details>
        </div>
      ) : (
        <div ref={ref} className="mermaid" />
      )}
    </div>
  );
};
