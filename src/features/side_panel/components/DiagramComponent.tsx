import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Relationship } from "../types/relationship";
import {
  sanitizeMermaidText,
  sanitizeMermaidLabel,
} from "../utils/diagram_utils";

interface DiagramComponentProps {
  relationships: Relationship[];
  onNodeClick?: (entity: string) => void;
}

const DiagramComponent: React.FC<DiagramComponentProps> = ({
  relationships,
  onNodeClick,
}) => {
  const [diagramDefinition, setDiagramDefinition] = useState<string>("");

  const diagramRef = useRef<HTMLDivElement>(null);

  const renderMermaidDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = "graph LR\n";
    relationships.forEach((rel) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = sanitizeMermaidText(entity1);
      const safeEntity2 = sanitizeMermaidText(entity2);
      const safeDescription = sanitizeMermaidLabel(description);
      mermaidCode += `    ${safeEntity1}[${sanitizeMermaidLabel(
        entity1
      )}] -->|${safeDescription}| ${safeEntity2}[${sanitizeMermaidLabel(
        entity2
      )}]\n`;
      mermaidCode += `    style ${safeEntity1} fill:#0077be,color:#fff\n`;
      mermaidCode += `    style ${safeEntity2} fill:#0077be,color:#fff\n`;
    });
    return mermaidCode;
  };

  useEffect(() => {
    // Initialize Mermaid only once
    mermaid.initialize({ startOnLoad: false });
    setDiagramDefinition(renderMermaidDiagram(relationships));
  }, [relationships]);

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

  if (!diagramDefinition) {
    return null;
  }

  return (
    <div className="p-2 transition-opacity duration-300" ref={diagramRef}></div>
  );
};

export default DiagramComponent;
