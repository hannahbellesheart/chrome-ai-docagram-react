import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Relationship } from "../types/relationship";
import {
  sanitizeMermaidText,
  sanitizeMermaidLabel,
} from "../utils/diagram_utils";
import DirectionSelector from "./DirectionSelector";

interface DiagramComponentProps {
  relationships: Relationship[];
  onNodeClick?: (entity: string) => void;
}

const DiagramComponent: React.FC<DiagramComponentProps> = ({
  relationships,
  onNodeClick,
}) => {
  const [direction, setDirection] = useState<"LR" | "RL" | "TD" | "BT">("LR");

  const [diagramDefinition, setDiagramDefinition] = useState<string>("");

  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDiagramDefinition(renderMermaidDiagram(relationships));
  }, [relationships, direction]);

  const renderMermaidDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = `---\n
config:\n
  look: handDrawn\n
  theme: dark\n
---\ngraph ${direction}\n`;
    relationships.forEach((rel) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = sanitizeMermaidText(entity1);
      const safeEntity2 = sanitizeMermaidText(entity2);
      const safeDescription = sanitizeMermaidText(description);
      mermaidCode += `    ${safeEntity1}[${sanitizeMermaidLabel(
        entity1
      )}] -->${safeDescription}(${sanitizeMermaidLabel(
        description
      )}) -->${safeEntity2}[${sanitizeMermaidLabel(entity2)}]\n`;
      mermaidCode += `    style ${safeEntity1} fill:2563eb,stroke:#ffffff, color:#ffffff\n`;
      mermaidCode += `    style ${safeEntity2} fill:2563eb,stroke:#ffffff, color:#ffffff\n`;
      mermaidCode += `    style ${safeDescription} fill:#ffffff50,stroke-dasharray: 5 5,fontWeight: 12,stroke:#ffffff,color:#ffffff\n`;
    });
    // Set all links (arrows) to white
    mermaidCode += `    linkStyle default stroke:#ffffff\n`;
    return mermaidCode;
  };

  useEffect(() => {
    // Initialize Mermaid only once
    mermaid.initialize({ startOnLoad: false });
  }, []);

  useEffect(() => {
    const renderMermaidDiagram = async () => {
      if (diagramRef.current && diagramRef.current !== null) {
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
          const nodes = diagramRef.current.querySelectorAll("g.rough-node");
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
  }, [diagramDefinition, direction, onNodeClick]);

  if (!diagramDefinition) {
    return null;
  }

  return (
    <div>
      <DirectionSelector
        direction={direction}
        onDirectionChange={setDirection}
      />
      <div
        className="mt-4 p-2 rounded-md transition-opacity duration-300 bg-blue-600 text-white"
        ref={diagramRef}
      ></div>
    </div>
  );
};

export default DiagramComponent;
