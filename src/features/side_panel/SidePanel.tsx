import { useCallback, useEffect, useRef, useState } from "react";
import { AIService, SessionStats } from "../shared/services/ai_service";
import { ContentService } from "../shared/services/content_service";
import { RelationshipService } from "../shared/services/relationship_service";
import DiagramComponent from "./components/DiagramComponent";
import { Relationship } from "./types/relationship";

function SidePanel() {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<string>("");
  const [stats, setStats] = useState<SessionStats | null>();
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

  useEffect(() => {
    const mermaidDiagram = renderMermaidDiagram(relationships);
    setDiagram(mermaidDiagram);
  }, [relationships]);

  const handleEntityClick = (entity: string) => {
    setSelectedEntity(entity);
    const rels = relationshipService.getEntityRelationships(entity);
    setRelationships(rels);
  };

  const handleShowAllRelationships = () => {
    setSelectedEntity(null);
    setRelationships(relationshipService.getRelationships());
  };

  const renderMermaidDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = "graph LR\n";
    relationships.forEach((rel) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = entity1.replace(/\s+/g, "_");
      const safeEntity2 = entity2.replace(/\s+/g, "_");
      const safeDescription = description.replace(/["']/g, "");
      mermaidCode += `    ${safeEntity1} -->|${safeDescription}| ${safeEntity2}\n`;
    });
    return mermaidCode;
  };

  const analyzePageContent = useCallback(
    async (options = { shouldSummarize: true }) => {
      try {
        relationshipService.reset();
        setDiagram("");
        setLoading(true);
        setMessage("");

        let pageContent = await ContentService.getPageContent();

        // Optional summarization step
        if (options.shouldSummarize && pageContent.length > 2000) {
          setMessage("Summarizing content for analysis...\n");
          pageContent = await aiService.summarizeContent(pageContent);
          console.log("Summarized content:", pageContent);
          setMessage("Summarization complete. Starting analysis...\n");
        }

        const chunks = ContentService.splitIntoChunks(pageContent);
        let allRelationshipsText = "";

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          setMessage(
            allRelationshipsText +
              `\n\nAnalyzing chunk ${i + 1} of ${chunks.length}...\n`
          );

          // Yield control to update UI
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

            // Yield control to update UI
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          allRelationshipsText += `\n\nChunk ${i + 1} results:\n` + chunkResult;
          const pageUrl = window.location.href;

          relationshipService.getEntitiesList();
          relationshipService.parseRelationships(chunkResult, pageUrl);

          // Yield control to update UI
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        setRelationships(relationshipService.getRelationships());
        setEntities(relationshipService.getEntitiesList());
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
  return (
    <div className="p-4">
      <div
        className="text-white p-4 bg-blue-600 rounded-md cursor-pointer"
        onClick={() => {
          analyzePageContent();
        }}
      >
        Analyze Page Content
      </div>
      {loading && <div className="text-blue-600">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="text-white p-4 bg-blue-600 rounded-md">{message}</div>
      {entities.length > 0 && (
        <div className="entities-list">
          <h3>Entities</h3>
          <ul>
            {entities.map((entity) => (
              <li key={entity} onClick={() => handleEntityClick(entity)}>
                {entity}
              </li>
            ))}
          </ul>
          {selectedEntity && (
            <div>
              <button onClick={handleShowAllRelationships}>
                Show All Relationships
              </button>
            </div>
          )}
        </div>
      )}
      {diagram && <DiagramComponent diagramDefinition={diagram} />}
      {/* Expandable Section for AI Support Information and AI Session Statistics */}
      <div className="text-white p-4 bg-gray-800 rounded-md mt-4">
        <h3
          className="text-lg font-bold mb-2 cursor-pointer flex items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "▼" : "▶"}&nbsp;AI Details
        </h3>
        {isExpanded && (
          <>
            {/* Display AI Support Information */}
            {supportInfo && (
              <div className="mt-2">
                <h4 className="text-md font-semibold mb-1">
                  AI Support Information
                </h4>
                <p>
                  <strong>Language Model Available:</strong>{" "}
                  {supportInfo.languageModelStatus}
                </p>
                <p>
                  <strong>Summarizer Available:</strong>{" "}
                  {supportInfo.summarizerStatus}
                </p>
              </div>
            )}

            {/* Display AI Session Statistics */}
            {stats && (
              <div className="mt-2">
                <h4 className="text-md font-semibold mb-1">
                  AI Session Statistics
                </h4>
                <p>
                  <strong>Temperature:</strong> {stats.temperature}
                </p>
                <p>
                  <strong>Top K:</strong> {stats.topK}
                </p>
                <p>
                  <strong>Tokens Left:</strong> {stats.tokensLeft}
                </p>
                <p>
                  <strong>Tokens So Far:</strong> {stats.tokensSoFar}
                </p>
                <p>
                  <strong>Is Initialized:</strong>{" "}
                  {stats.isInitialized.toString()}
                </p>
                <p>
                  <strong>Has Summarizer:</strong>{" "}
                  {stats.hasSummarizer.toString()}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SidePanel;
