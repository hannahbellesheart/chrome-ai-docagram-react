import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import DiagramComponent from "./DiagramComponent";
import RelationshipTile from "./RelationshipTile";
import { Relationship } from "../types/relationship";

interface DiagramViewProps {
  diagram: string;
  relationships: Relationship[];
  handleDiagramNodeClick: (entity: string) => void;
}

export function DiagramView({
  diagram,
  relationships,
  handleDiagramNodeClick,
}: DiagramViewProps) {
  return (
    <div className="space-y-4">
      {/* <div className="flex gap-2">
        <Button
          variant={tab === "diagram" ? "default" : "outline"}
          onClick={() => setTab("diagram")}
        >
          Diagram
        </Button>
        <Button
          variant={tab === "relationships" ? "default" : "outline"}
          onClick={() => setTab("relationships")}
        >
          Relationships
        </Button>
      </div> 
      {tab === "diagram" && diagram && ( */}
      {diagram && (
        <DiagramComponent
          diagramDefinition={diagram}
          onNodeClick={handleDiagramNodeClick}
        />
      )}
      {/*)}
       {tab === "relationships" && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {relationships.map((rel, index) => (
              <RelationshipTile key={index} relationship={rel} />
            ))}
          </div>
        </ScrollArea>
      )} */}
    </div>
  );
}
