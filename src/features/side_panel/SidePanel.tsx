import { useCallback, useEffect, useRef, useState } from "react";
import { AIService, SessionStats } from "../shared/services/ai_service";
import { ContentService } from "../shared/services/content_service";
import { RelationshipService } from "../shared/services/relationship_service";
import DiagramComponent from "./components/DiagramComponent";
import { Relationship } from "./types/relationship";
import AIDetails from "./components/AIDetails";
import RelationshipTile from "./components/RelationshipTile";
import { getShade } from "./utils/entity_utils";

function SidePanel() {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entities, setEntities] = useState<{ name: string; count: number }[]>(
    []
  );
  const [minimumEntityCount, setMinimumEntityCount] = useState<number>(2);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<string>("");
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [tab, setTab] = useState<"diagram" | "relationships">("diagram");
  const [supportInfo, setSupportInfo] = useState<{
    hasLanguageModel: boolean;
    hasSummarizer: boolean;
    languageModelStatus: string;
    summarizerStatus: string;
  } | null>(null);

  const relationshipServiceRef = useRef(new RelationshipService());
  const relationshipService = relationshipServiceRef.current;
  const aiServiceRef = useRef(new AIService());
  const aiService = aiServiceRef.current;

  useEffect(() => {
    const initializeAI = async () => {
      try {
        await aiService.initialize(0.7, 40);
        const stats = aiService.getSessionStats();
        console.log("AI Service Initialized:", stats);

        const support = await aiService.checkSupport();
        setSupportInfo(support);
      } catch (error) {
        console.error("AIService initialization failed:", error);
      }
    };

    initializeAI();

    return () => {
      aiService.destroy();
    };
  }, []); // aiService doesn't need to be in dependencies

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
      .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
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
      mermaidCode += `    ${safeEntity1}: ${entity1}\n`;
      mermaidCode += `    ${safeEntity2}: ${entity2}\n`;
      mermaidCode += `    ${safeEntity1}:::${classOne}\n`;
      mermaidCode += `    ${safeEntity2}:::${classTwo}\n`;
      mermaidCode += `    ${safeEntity1} -->|${safeDescription}| ${safeEntity2}\n`;
    });

    console.log("Mermaid code:", mermaidCode);
    return mermaidCode;
  };


  const renderMermaidDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = "graph LR\n";
    relationships.forEach((rel) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = sanitizeMermaidText(entity1);
      const safeEntity2 = sanitizeMermaidText(entity2);
      const safeDescription = sanitizeMermaidText(description);
      mermaidCode += `    ${safeEntity1}[${entity1}] -->|${safeDescription}| ${safeEntity2}[${entity2}]\n`;

      //mermaidCode += `    ${safeEntity1} -->|${safeDescription}| ${safeEntity2}\n`;
    });
    return mermaidCode;
  };

  const MAX_RETRIES = 5;

  const analyzePageContent = useCallback(
    async (options = { shouldSummarize: true }) => {
      try {
        relationshipService.reset();
        setDiagram("");
        setLoading(true);
        setError(null);
        setMessage("Analyzing page content...");

        let pageContent = await ContentService.getPageContent();
        const chunks = ContentService.splitIntoChunks(pageContent);
        let allRelationshipsText = "";
        const pageUrl = window.location.href;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          let retryCount = 0;
          let success = false;

          while (!success && retryCount < MAX_RETRIES) {
            try {
              setMessage(
                allRelationshipsText +
                  `\n\nAnalyzing chunk ${i + 1} of ${chunks.length}...\n` +
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
                  throw new Error(
                    `Failed to analyze chunk after ${MAX_RETRIES} attempts`
                  );
                }
                // Clear current chunk results
                setMessage(
                  allRelationshipsText +
                    `\n\nError analyzing chunk ${i + 1}. Retrying...`
                );
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
        setLoading(false);
        setStats(aiService.getSessionStats());
      }
    },
    [aiService]
  );

  const handleDiagramNodeClick = (entity: string) => {
    console.log("Diagram node clicked:", entity);
    handleEntityClick(entity);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold py-4">Docagram</h2>
      <div
        className="text-white text-xl p-4 mb-4 bg-blue-600 shadow-md rounded-md cursor-pointer"
        onClick={() => {
          analyzePageContent();
        }}
      >
        Visualize
      </div>
      {error && (
        <div className="text-red-600 p-4 mb-4 border border-red-800 rounded-md">
          {error}
        </div>
      )}
      {entities.length > 0 && (
        <div className="entities-list">
          <div className="flex flex-row gap-4 items-center">
            <h3 className="text-lg font-bold my-1">Entities</h3>

            {/* Minimum Entity Count Selector */}
            <div className="flex items-center">
              <label htmlFor="min-entity-count" className="mr-2 text-sm">
                Min Count:
              </label>
              <input
                type="number"
                id="min-entity-count"
                min="1"
                value={minimumEntityCount}
                onChange={(e) => setMinimumEntityCount(Number(e.target.value))}
                className="w-20 p-1 border rounded"
                placeholder="2"
              />
            </div>

            {selectedEntity && (
              <div>
                <button
                  className="text-blue-400"
                  onClick={handleShowAllRelationships}
                >
                  Show All Relationships
                </button>
              </div>
            )}
          </div>
          <div className="chips-container mb-4 flex flex-wrap">
            {entities
              .sort((a, b) => b.count - a.count)
              .filter((entity) => entity.count >= minimumEntityCount)
              .map((entity) => (
                <button
                  key={entity.name}
                  className="chip-button border rounded-sm px-2 py-1 mr-1 my-1 flex items-center hover:bg-gray-800 hover:text-white"
                  style={{
                    backgroundColor:
                      entity.name === selectedEntity
                        ? "green"
                        : getShade(entity.count),
                    color: entity.name === selectedEntity ? "white" : "inherit",
                  }}
                  onClick={() => handleEntityClick(entity.name)}
                >
                  {entity.name}{" "}
                  <span className="ml-1 text-sm">({entity.count})</span>
                </button>
              ))}
          </div>
        </div>
      )}
      <div className="tabs flex flex-row gap-2 mb-2">
        <button
          className={`
            border rounded-lg p-2
            transition-colors duration-200 ease-in-out
            ${
              tab === "diagram"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
            }
          `}
          onClick={() => setTab("diagram")}
        >
          Diagram
        </button>
        <button
          className={`
            border rounded-lg p-2
            transition-colors duration-200 ease-in-out
            ${
              tab === "relationships"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
            }
          `}
          onClick={() => setTab("relationships")}
        >
          Relationships
        </button>
      </div>
      {tab === "diagram" && (
        <>
          {diagram && (
            <DiagramComponent
              diagramDefinition={diagram}
              onNodeClick={handleDiagramNodeClick}
            />
          )}
        </>
      )}
      {tab === "relationships" && (
        <div
          className="relationships-list overflow-y-auto my-4"
          style={{ overflowY: "auto", maxHeight: "400px" }}
        >
          {relationships.map((rel, index) => (
            <div key={index} className="relationship-item p-2">
              <RelationshipTile relationship={rel} />
            </div>
          ))}
        </div>
      )}
      {message && (
        <div className="text-gray-800 p-4 mb-4 bg-gray-300 rounded-md">
          {message}
        </div>
      )}
      <div className="mt-8">
        <AIDetails stats={stats} supportInfo={supportInfo} />
      </div>
    </div>
  );
}

export default SidePanel;
