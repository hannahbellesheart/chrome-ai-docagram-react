import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Relationship } from "../types/relationship";
import {
  sanitizeMermaidText,
  sanitizeMermaidLabel,
} from "../utils/diagram_utils";
import DirectionSelector from "./DirectionSelector";
import DiagramComponent from "./DiagramComponent";
import { ExternalLink, Github, Twitter, Youtube } from "lucide-react";

const Welcome: React.FC = () => {
  const relationships: Relationship[] = [
    {
      entity1: "Web Page",
      entity2: "Sections",
      description: "Separated into",
      sourceUrl: "",
    },
    {
      entity1: "Sections",
      entity2: "Relationships",
      description: "Analyzed with Prompt API to generate",
      sourceUrl: "",
    },
    {
      entity1: "Sections",
      entity2: "Summaries",
      description: "Summarized with Summary API",
      sourceUrl: "",
    },
    {
      entity1: "Relationships",
      entity2: "Section-specific Mermaid Diagram",
      description: "Converted to",
      sourceUrl: "",
    },
    {
      entity1: "Relationships",
      entity2: "Combined Mermaid Diagram",
      description: "Converted to",
      sourceUrl: "",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold">How does this work?</h2>
      <p className="mb-4 text-muted-foreground">
        Docagram uses Chrome's built-in AI tools to turn web pages into
        diagrams. To get started, open a new tab and click the "Analyze" button.
      </p>
      <DiagramComponent relationships={relationships} startingDirection="TD" />
      <div className="w-full flex justify-center gap-4 pt-4">
        <a
          href="https://github.com/jtmuller5/docagram-react"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="h-4 w-4 mr-1" />
          Source
        </a>
        <a
          href="https://twitter.com/code_ontherocks"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Twitter className="h-4 w-4 mr-1" />
          Code on the Rocks
        </a>
        <a
          href="https://yourusername.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Youtube className="h-4 w-4 mr-1" />
          Video
        </a>
      </div>
    </div>
  );
};

export default Welcome;
