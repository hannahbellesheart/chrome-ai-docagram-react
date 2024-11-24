import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface DiagramComponentProps {
  diagramDefinition: string;
  onNodeClick?: (entity: string) => void;
}

const DiagramComponent: React.FC<DiagramComponentProps> = ({
  diagramDefinition,
  onNodeClick,
}) => {
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Mermaid only once
    mermaid.initialize({ startOnLoad: false });
  }, []);

  useEffect(() => {
    const renderMermaidDiagram = async () => {
      if (diagramRef.current) {
        try {
          // Generate a unique ID for the diagram
          const uniqueId = `mermaid-diagram-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          // Render the Mermaid diagram and get bindFunctions
          const { svg, bindFunctions } = await mermaid.render(
            uniqueId,
            diagramDefinition
          );

          // Set the innerHTML of the diagram container
          diagramRef.current.innerHTML = svg;

          // Bind any predefined functions from Mermaid
          if (bindFunctions) {
            bindFunctions(diagramRef.current);
          }

          // Add custom click listeners to nodes
          const nodes = diagramRef.current.querySelectorAll("g.node");
          nodes.forEach((node) => {
            (node as HTMLElement).style.cursor = "pointer";
            node.addEventListener("click", () => {
              console.log("Node clicked:", node);

              // Try to get the entity name from the text content directly
              const textElement = node.querySelector(
                "foreignObject div span.nodeLabel"
              );
              let entityName = "";

              if (textElement) {
                entityName = textElement.textContent || "";
              } else {
                // Fallback to the 'title' element if 'textElement' is not found
                const titleElement = node.querySelector("title");
                if (titleElement) {
                  entityName = titleElement.textContent || "";
                }
              }

              if (entityName && onNodeClick) {
                onNodeClick(entityName);
              }
            });
          });
        } catch (err) {
          console.error("Error rendering Mermaid diagram:", err);
          console.log("Diagram definition:", diagramDefinition);
        }
      }
    };

    renderMermaidDiagram();
  }, [diagramDefinition, onNodeClick]);

  return (
    <div className="p-2 transition-opacity duration-300" ref={diagramRef}></div>
  );
};

export default DiagramComponent;
