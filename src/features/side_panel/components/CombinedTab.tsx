// CombinedTab.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemStatus } from "./SystemStatus";
import { Relationship } from "../types/relationship";
import { useState, useCallback, useEffect } from "react";
import { RelationshipService } from "@/features/shared/services/relationship_service";
import { ContentService } from "@/features/shared/services/content_service";
import DiagramComponent from "./DiagramComponent";
import Markdown from "react-markdown";
import {
  sanitizeMermaidLabel,
  sanitizeMermaidText,
} from "../utils/diagram_utils";
import { AIService } from "@/features/shared/services/ai_service";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EntityList } from "./EntityList";
import { tab } from "@testing-library/user-event/dist/tab";

interface SectionData {
  summary: string;
  relationships: Relationship[];
  message: string;
}

interface CombinedTabProps {
  loading: boolean;
  aiService: AIService;
  relationshipService: RelationshipService;
}

export default function CombinedTab({
  loading,
  aiService,
  relationshipService,
}: CombinedTabProps) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [showSummaries, setShowSummaries] = useState<boolean>(true);
  const [showDiagrams, setShowDiagrams] = useState<boolean>(true);

  // Combined Diagram and Entities
  const [combinedRelationships, setCombinedRelationships] = useState<
    Relationship[]
  >([]);
  const [combinedEntities, setCombinedEntities] = useState<
    { name: string; count: number }[]
  >([]);
  const [selectedCombinedTab, setSelectedCombinedTab] =
    useState<string>("diagram");

  // Entity interactions
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [minimumEntityCount, setMinimumEntityCount] = useState<number>(1);

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

  const analyzeSummaryAndContent = useCallback(async () => {
    try {
      relationshipService.reset();
      setSections([]);
      setError(null);
      setStatus("Analyzing page content...");
      setCombinedRelationships([]);
      setCombinedEntities([]);
      setSelectedEntity(null);

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

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: "highlight",
          entity: entity === selectedEntity ? "" : entity,
        });
      }
    } catch (error) {
      console.error("Failed to send highlight message:", error);
    }
  };

  const handleEntityClick = (entity: string) => {
    if (entity === selectedEntity) {
      setSelectedEntity(null);
    } else {
      setSelectedEntity(entity);
      // Filter relationships to those involving the selected entity
      const filteredRelationships = combinedRelationships.filter(
        (rel) => rel.entity1 === entity || rel.entity2 === entity
      );
      setCombinedRelationships(filteredRelationships);
    }
  };

  const handleShowAllRelationships = () => {
    setSelectedEntity(null);
  };

  const deleteEntity = (entity: string) => {
    // Remove entity from combinedRelationships
    const updatedRelationships = combinedRelationships.filter(
      (rel) => rel.entity1 !== entity && rel.entity2 !== entity
    );
    setCombinedRelationships(updatedRelationships);

    // Update combinedEntities
    const updatedEntities = combinedEntities.filter((e) => e.name !== entity);
    setCombinedEntities(updatedEntities);

    // If the deleted entity was selected, reset selection
    if (selectedEntity === entity) {
      setSelectedEntity(null);
    }
  };

  const handleDiagramNodeClick = (entity: string) => {
    handleNodeClick(entity);
    handleEntityClick(entity);
  };

  const combineAllDiagrams = () => {
    // Collect all relationships from all sections
    const allRelationships = sections.flatMap(
      (section) => section.relationships
    );
    // Generate mermaid diagram
    setCombinedRelationships(allRelationships);

    // Collect entities and their counts
    const entityCounts = new Map<string, number>();
    allRelationships.forEach((rel) => {
      entityCounts.set(rel.entity1, (entityCounts.get(rel.entity1) || 0) + 1);
      entityCounts.set(rel.entity2, (entityCounts.get(rel.entity2) || 0) + 1);
    });
    const entities = Array.from(entityCounts.entries()).map(
      ([name, count]) => ({
        name,
        count,
      })
    );
    setCombinedEntities(entities);
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-0">
        {/* Sticky Header */}
        <div
          className="sticky top-0 bg-white z-10 border-b"
          style={{ borderBottom: "1px solid #e5e7eb" }}
        >
          <div className="flex flex-wrap items-center gap-2 p-2 md:p-4">
            <Button
              onClick={analyzeSummaryAndContent}
              disabled={loading}
              className="mr-4"
            >
              Analyze
            </Button>
            <Button
              className="block md:hidden"
              onClick={combineAllDiagrams}
              disabled={sections.length === 0}
              variant="outline"
            >
              Combine All Diagrams
            </Button>

            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center">
                <Switch
                  id="show-summaries"
                  checked={showSummaries}
                  onCheckedChange={setShowSummaries}
                />
                <Label htmlFor="show-summaries" className="ml-2 mr-4">
                  Show Summaries
                </Label>
              </div>
              <div className="flex items-center">
                <Switch
                  id="show-diagrams"
                  checked={showDiagrams}
                  onCheckedChange={setShowDiagrams}
                />
                <Label htmlFor="show-diagrams" className="ml-2 mr-4">
                  Show Diagrams
                </Label>
              </div>
              <Button
                className="hidden md:block"
                onClick={combineAllDiagrams}
                disabled={sections.length === 0}
                variant="outline"
              >
                Combine All Diagrams
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6 pt-6">
          <SystemStatus status={status} error={error} />

          {combinedRelationships && combinedRelationships.length > 0 && (
            <Card className="mb-6">
              <CardContent>
                <Tabs
                  value={selectedCombinedTab}
                  onValueChange={setSelectedCombinedTab}
                >
                  <div className="flex gap-8 pt-4">
                    <h2 className="text-xl font-bold">Combined Diagram</h2>
                    <TabsList>
                      <TabsTrigger value="diagram">Diagram</TabsTrigger>
                      <TabsTrigger value="entities">Entities</TabsTrigger>
                    </TabsList>
                    {selectedEntity && (
                      <Button
                        variant={"outline"}
                        onClick={handleShowAllRelationships}
                      >
                        Show All
                      </Button>
                    )}
                  </div>
                  <TabsContent value="diagram">
                    <DiagramComponent
                      relationships={combinedRelationships}
                      onNodeClick={handleDiagramNodeClick}
                    />
                  </TabsContent>
                  <TabsContent value="entities">
                    <EntityList
                      entities={combinedEntities}
                      minimumEntityCount={minimumEntityCount}
                      setMinimumEntityCount={setMinimumEntityCount}
                      selectedEntity={selectedEntity}
                      handleShowAllRelationships={handleShowAllRelationships}
                      handleEntityClick={(entity) => {
                        handleEntityClick(entity);
                        setSelectedCombinedTab("diagram");
                      }}
                      deleteEntity={deleteEntity}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {sections.map((section, index) => (
            <Card key={index} className="mb-6">
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold pt-4">Section {index + 1}</h2>

                {showSummaries && (
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      <Markdown>{section.summary}</Markdown>
                    </p>
                  </div>
                )}

                {showDiagrams && (
                  <DiagramComponent
                    relationships={section.relationships}
                    onNodeClick={handleNodeClick}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
