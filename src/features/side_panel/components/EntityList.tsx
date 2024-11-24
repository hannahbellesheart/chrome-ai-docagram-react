import { Button } from "@/components/ui/button";
import { getShade } from "../utils/entity_utils";

interface EntityListProps {
  entities: { name: string; count: number }[];
  minimumEntityCount: number;
  setMinimumEntityCount: (count: number) => void;
  selectedEntity: string | null;
  handleShowAllRelationships: () => void;
  handleEntityClick: (entity: string) => void;
}

export function EntityList({
  entities,
  minimumEntityCount,
  setMinimumEntityCount,
  selectedEntity,
  handleShowAllRelationships,
  handleEntityClick,
}: EntityListProps) {
  return (
    <div className="entities-list">
      <div className="flex flex-row gap-4 items-center">
        <h3 className="text-lg font-bold my-1">Entities</h3>
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
          <Button variant="link" onClick={handleShowAllRelationships}>
            Show All Relationships
          </Button>
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
                backgroundColor: entity.name === selectedEntity ? "green" : getShade(entity.count),
                color: entity.name === selectedEntity ? "white" : "inherit",
              }}
              onClick={() => handleEntityClick(entity.name)}
            >
              {entity.name} <span className="ml-1 text-sm">({entity.count})</span>
            </button>
          ))}
      </div>
    </div>
  );
}