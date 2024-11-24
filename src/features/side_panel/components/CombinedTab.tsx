import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemStatus } from "./SystemStatus";
import { Relationship } from "../types/relationship";
import { useState, useCallback, useRef, useEffect } from "react";
import { RelationshipService } from "@/features/shared/services/relationship_service";
import { ContentService } from "@/features/shared/services/content_service";
import { DiagramView } from "./DiagramView";
import DiagramComponent from "./DiagramComponent";
import Markdown from "react-markdown";
import {
  sanitizeMermaidLabel,
  sanitizeMermaidText,
} from "../utils/diagram_utils";

interface SectionData {
  summary: string;
  relationships: Relationship[];
  diagram: string;
  message: string;
}

interface CombinedTabProps {
  loading: boolean;
  aiService: any; // Replace with proper type
}

export default function CombinedTab({ loading, aiService }: CombinedTabProps) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [activeEntity, setActiveEntity] = useState<string | null>(null);

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entities, setEntities] = useState<{ name: string; count: number }[]>(
    []
  );
  const [minimumEntityCount, setMinimumEntityCount] = useState<number>(2);

  const relationshipServiceRef = useRef(new RelationshipService());
  const relationshipService = relationshipServiceRef.current;

  useEffect(() => {
    // Cleanup highlights when component unmounts
    return () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "highlight",
            entity: "",
          });
        }
      });
    };
  }, []);

  const renderMermaidDiagram = (relationships: Relationship[]): string => {
    let mermaidCode = "graph LR\n";
    relationships.forEach((rel) => {
      const { entity1, entity2, description } = rel;
      const safeEntity1 = sanitizeMermaidText(entity1);
      const safeEntity2 = sanitizeMermaidText(entity2);
      const safeDescription = sanitizeMermaidText(description);
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

  const analyzeSummaryAndContent = useCallback(async () => {
    try {
      relationshipService.reset();
      setSections([]);
      setError(null);
      setStatus("Analyzing page content...");

      const pageContent = await ContentService.getPageContent();
      const chunks = await ContentService.splitIntoChunks(pageContent);
      const pageUrl = window.location.href;
      const newSections: SectionData[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setStatus(`Processing section ${i + 1} of ${chunks.length}`);

        try {
          // Generate summary for the chunk
          const chunkSummary = await aiService.summarizeContent(chunk);

          // Analyze relationships in the chunk
          const stream = await aiService.streamAnalysis(
            chunkSummary,
            i,
            chunks.length
          );
          let chunkResult = "";

          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunkResult = value;

            // Create temporary RelationshipService for this section
            const sectionRelationshipService = new RelationshipService();
            sectionRelationshipService.parseRelationships(chunkResult, pageUrl);
            const sectionRelationships =
              sectionRelationshipService.getRelationships();

            // Create section data
            const sectionData: SectionData = {
              summary: chunkSummary,
              relationships: sectionRelationships,
              diagram: renderMermaidDiagram(sectionRelationships),
              message: chunkResult,
            };

            // Update sections
            newSections[i] = sectionData;
            setSections([...newSections]);
          }
        } catch (error: any) {
          console.error(`Error processing section ${i + 1}:`, error);
          setError(`Error processing section ${i + 1}: ${error.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      setError(error.message);
    } finally {
      setStatus("");
    }
  }, [aiService]);

  const handleNodeClick = async (entity: string) => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("tab", tab);
      if (tab.id) {
        setActiveEntity(entity === activeEntity ? null : entity);
        await chrome.tabs.sendMessage(tab.id, {
          action: "highlight",
          entity: entity === activeEntity ? "" : entity,
        });
      }
    } catch (error) {
      console.error("Failed to send highlight message:", error);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="space-y-6 pt-6">
        <Button
          onClick={analyzeSummaryAndContent}
          disabled={loading}
          className="mb-4"
        >
          Analyze & Visualize
        </Button>

        <SystemStatus status={status} error={error} />

        {sections.map((section, index) => (
          <Card key={index} className="mb-6">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-bold pt-4">Section {index + 1}</h2>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  <Markdown>{section.summary}</Markdown>
                </p>
              </div>

              <DiagramComponent
                diagramDefinition={section.diagram}
                onNodeClick={handleNodeClick}
              />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
