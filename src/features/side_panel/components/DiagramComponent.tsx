// DiagramComponent.tsx

import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface DiagramComponentProps {
  diagramDefinition: string;
  onNodeClick: (entity: string) => void;
}

const DiagramComponent: React.FC<DiagramComponentProps> = ({
  diagramDefinition,
  onNodeClick,
}) => {
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Mermaid
    mermaid.initialize({ startOnLoad: false });

    const renderMermaidDiagram = async () => {
      if (diagramRef.current) {
        try {
          // Render the Mermaid diagram
          const { svg } = await mermaid.render(
            "mermaid-diagram",
            diagramDefinition
          );
          diagramRef.current.innerHTML = svg;

          // Add click listeners to nodes
          const nodes = diagramRef.current.querySelectorAll("g.node");
          nodes.forEach((node) => {
            (node as HTMLElement).style.cursor = "pointer";
            node.addEventListener("click", () => {
              const title = node.querySelector("title")?.textContent;
              if (title) {
                onNodeClick(title);
              }
            });
          });
        } catch (err) {
          console.error("Error rendering Mermaid diagram:", err);
        }
      }
    };

    renderMermaidDiagram();
  }, [diagramDefinition, onNodeClick]);

  return <div className="p-2" ref={diagramRef}></div>;
};

export default DiagramComponent;
