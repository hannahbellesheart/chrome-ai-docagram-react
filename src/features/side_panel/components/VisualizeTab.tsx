import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Relationship } from "../types/relationship";
import { DiagramView } from "./DiagramView";
import { EntityList } from "./EntityList";
import { SystemStatus } from "./SystemStatus";
import { AIOutput } from "./AIOutput";
import { ContentService } from "@/features/shared/services/content_service";
import { useState, useCallback, useRef, useEffect } from "react";
import { RelationshipService } from "@/features/shared/services/relationship_service";
import { AIService } from "@/features/shared/services/ai_service";
import DirectionSelector from "./DirectionSelector";

interface VisualizeTabProps {
  loading: boolean;
  aiService: AIService;
}

export function VisualizeTab({ loading, aiService }: VisualizeTabProps) {
  const [tab, setTab] = useState<"diagram" | "relationships">("diagram");
  const [direction, setDirection] = useState<"LR" | "RL" | "TD" | "BT">("LR");
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entities, setEntities] = useState<{ name: string; count: number }[]>(
    []
  );
  const [minimumEntityCount, setMinimumEntityCount] = useState<number>(2);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  const relationshipServiceRef = useRef(new RelationshipService());
  const relationshipService = relationshipServiceRef.current;

  // Prevent diagram from redrawing if an entity is selected
  useEffect(() => {
    if (selectedEntity) {
      const entityRelationships =
        relationshipService.getEntityRelationships(selectedEntity);
      const mermaidDiagram = renderMermaidDiagram(entityRelationships);
      setDiagram(mermaidDiagram);
    } else {
      const mermaidDiagram = renderMermaidDiagram(relationships);
      setDiagram(mermaidDiagram);
    }
  }, [relationships, selectedEntity]);

  useEffect(() => {
    const entityList = relationshipService.getEntitiesList().map((entity) => ({
      name: entity,
      count: relationshipService.getEntityCount(entity),
    }));

    setEntities(entityList);
  }, [relationshipService, relationships, minimumEntityCount]);

  const handleEntityClick = (entity: string) => {
    if (entity === selectedEntity) {
      setSelectedEntity(null);
      setRelationships(relationshipService.getRelationships());
    } else {
      setSelectedEntity(entity);
      const rels = relationshipService.getEntityRelationships(entity);
      setRelationships(rels);
    }
  };

  const handleShowAllRelationships = () => {
    setSelectedEntity(null);
    setRelationships(relationshipService.getRelationships());
  };

  const sanitizeMermaidText = (text: string): string => {
    return text
      .replace(/[-–—]/g, "") // Remove hyphens and dashes
      .replace(/[,.'"!@#$%^&*()′″°+=\[\]{}|\\/<>:;_\s]/g, "_")
      .replace(/_+/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, "")
      .trim(); // Remove leading/trailing underscores
  };

  const renderMermaidStateDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = "stateDiagram\n"; // or "graph LR" based on your diagram type

    relationships.forEach((rel, index) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = sanitizeMermaidText(entity1);
      const safeEntity2 = sanitizeMermaidText(entity2);
      const safeDescription = sanitizeMermaidText(description);

      const classOne = `entityOne_${index}`;
      const classTwo = `entityTwo_${index}`;

      mermaidCode += `    classDef ${classOne} fill\n`;
      mermaidCode += `    classDef ${classTwo} fill\n`;
      mermaidCode += `    ${safeEntity1}: ${entity1.replace('’', '\'')}\n`;
      mermaidCode += `    ${safeEntity2}: ${entity2.replace('’', '\'')}\n`;
      mermaidCode += `    ${safeEntity1}:::${classOne}\n`;
      mermaidCode += `    ${safeEntity2}:::${classTwo}\n`;
      mermaidCode += `    ${safeEntity1} -->|${safeDescription}| ${safeEntity2}\n`;
    });

    console.log("Mermaid code:", mermaidCode);
    return mermaidCode;
  };

  const renderMermaidDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = `graph ${direction}\n`;
    relationships.forEach((rel) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = sanitizeMermaidText(entity1);
      const safeEntity2 = sanitizeMermaidText(entity2);
      const safeDescription = sanitizeMermaidText(description);
      mermaidCode += `    ${safeEntity1}[${entity1.trim()}] -->|${safeDescription}| ${safeEntity2}[${entity2.trim()}]\n`;
      mermaidCode += `    style ${safeEntity1} fill:#0077be,color:#fff\n`;
    });
    return mermaidCode;
  };

  const MAX_RETRIES = 3;

  const analyzePageContent = useCallback(
    async (options = { shouldSummarize: true }) => {
      try {
        relationshipService.reset();
        setDiagram("");
        setError(null);
        setStatus("Analyzing page content...");

        let pageContent = await ContentService.getPageContent();
        const chunks = await ContentService.splitIntoChunks(pageContent);
        let allRelationshipsText = "";
        const pageUrl = window.location.href;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          let retryCount = 0;
          let success = false;

          while (!success && retryCount < MAX_RETRIES) {
            try {
              setStatus("Analyzing chunk " + (i + 1) + " of " + chunks.length);
              setMessage(
                allRelationshipsText +
                  (retryCount > 0 ? `(Attempt ${retryCount + 1})` : "")
              );

              await new Promise((resolve) => setTimeout(resolve, 0));

              const stream = await aiService.streamAnalysis(
                chunk,
                i,
                chunks.length
              );
              let chunkResult = "";

              const reader = stream.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunkResult = value;
                setMessage(
                  allRelationshipsText +
                    `\n\nChunk ${i + 1} output:\n` +
                    chunkResult
                );

                const newEntities = relationshipService.getEntitiesList();
                relationshipService.parseRelationships(chunkResult, pageUrl);
                const entityList = newEntities.map((entity) => ({
                  name: entity,
                  count: relationshipService.getEntityCount(entity),
                }));
                setRelationships(relationshipService.getRelationships());

                await new Promise((resolve) => setTimeout(resolve, 0));
              }

              allRelationshipsText +=
                `\n\nChunk ${i + 1} results:\n` + chunkResult;
              success = true;
            } catch (error: any) {
              if (
                error.name === "NotReadableError" ||
                error.name === "NotSupportedError"
              ) {
                console.error("Error analyzing chunk:", error);
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                  console.warn(
                    `Skipping chunk ${
                      i + 1
                    } after ${MAX_RETRIES} failed attempts`
                  );
                  success = true;
                  break;
                }
                // Clear current chunk results
                setStatus("Error analyzing chunk " + (i + 1) + ". Retrying...");
                setMessage(allRelationshipsText);
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retry
              } else {
                throw error; // Rethrow other errors
              }
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        setRelationships(relationshipService.getRelationships());
        /* const entityList = relationshipService
                  .getEntitiesList()
                  .map((entity) => ({
                    name: entity,
                    count: relationshipService.getEntityCount(entity),
                  })); 
                setEntities(entityList);*/
      } catch (error: any) {
        console.error("Analysis failed:", error);
        setMessage(`Analysis failed: ${error.message} (${error.name})`);
        setError(error.message);
      } finally {
        setStatus("");
      }
    },
    [aiService]
  );

  const handleDiagramNodeClick = (entity: string) => {
    console.log("Diagram node clicked:", entity);
    handleEntityClick(entity);
  };
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex gap-4">
          <Button
            onClick={() => analyzePageContent({ shouldSummarize: false })}
            disabled={loading}
          >
            Generate Diagram
          </Button>
          <DirectionSelector
            direction={direction}
            onDirectionChange={setDirection}
          />
        </div>
        <SystemStatus status={status} error={error} />
        {entities.length > 0 && (
          <EntityList
            entities={entities}
            minimumEntityCount={minimumEntityCount}
            setMinimumEntityCount={setMinimumEntityCount}
            selectedEntity={selectedEntity}
            handleShowAllRelationships={handleShowAllRelationships}
            handleEntityClick={handleEntityClick}
          />
        )}
        <DiagramView
          tab={tab}
          setTab={setTab}
          diagram={diagram}
          relationships={relationships}
          handleDiagramNodeClick={handleDiagramNodeClick}
        />
        {message && <AIOutput message={message} />}
      </CardContent>
    </Card>
  );
}
