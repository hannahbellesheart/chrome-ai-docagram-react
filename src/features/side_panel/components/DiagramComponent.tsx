// DiagramComponent.tsx

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface DiagramComponentProps {
  diagramDefinition: string;
}

const DiagramComponent: React.FC<DiagramComponentProps> = ({ diagramDefinition }) => {
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Mermaid
    mermaid.initialize({ startOnLoad: false });

    const renderMermaidDiagram = async () => {
      if (diagramRef.current) {
        try {
          // Use renderAsync instead of render
          const { svg } = await mermaid.render('mermaid-diagram', diagramDefinition);
          diagramRef.current.innerHTML = svg;
        } catch (err) {
          console.error('Error rendering Mermaid diagram:', err);
        }
      }
    };

    renderMermaidDiagram();
  }, [diagramDefinition]);

  return <div className='p-2' ref={diagramRef}></div>;
};

export default DiagramComponent;