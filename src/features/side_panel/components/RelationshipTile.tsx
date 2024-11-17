import React from "react";
import { Relationship } from "../types/relationship";

interface RelationshipTileProps {
  relationship: Relationship;
}

const RelationshipTile: React.FC<RelationshipTileProps> = ({
  relationship,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-200">
      {/* Entities Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-800">
          {relationship.entity1}
        </div>
        <div className="text-sm text-gray-500">↔️</div>
        <div className="text-sm font-medium text-gray-800">
          {relationship.entity2}
        </div>
      </div>

      {/* Description Section */}
      <div className="text-sm text-gray-600 border-t pt-2">
        {relationship.description}
      </div>

      {/* Source Link */}
      {relationship.sourceUrl !== window.location.href && (
        <a
          href={relationship.sourceUrl}
          className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source →
        </a>
      )}
    </div>
  );
};

export default RelationshipTile;
