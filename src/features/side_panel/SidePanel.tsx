import { useEffect, useRef, useState } from "react";
import { AIService, SessionStats } from "../shared/services/ai_service";
import AIDetails from "./components/AIDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummarizeTab } from "./components/SummarizeTab";
import { VisualizeTab } from "./components/VisualizeTab";
import CombinedTab from "./components/CombinedTab";

function SidePanel() {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [supportInfo, setSupportInfo] = useState<{
    hasLanguageModel: boolean;
    hasSummarizer: boolean;
    languageModelStatus: string;
    summarizerStatus: string;
  } | null>(null);

  const aiServiceRef = useRef(new AIService());
  const aiService = aiServiceRef.current;

  useEffect(() => {
    const initializeAI = async () => {
      try {
        await aiService.initialize();
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

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Docagram 3</h2>

      <Tabs defaultValue="visualize" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visualize">Visualize</TabsTrigger>
          <TabsTrigger value="summarize">Summarize</TabsTrigger>
          <TabsTrigger value="combined">Combined</TabsTrigger>
        </TabsList>

        <TabsContent value="visualize">
          <VisualizeTab loading={loading} aiService={aiService} />
        </TabsContent>

        <TabsContent value="summarize">
          <SummarizeTab loading={loading} aiService={aiService} />
        </TabsContent>

        <TabsContent value="combined">
          <CombinedTab loading={loading} aiService={aiService} />
        </TabsContent>
      </Tabs>

      {/* <div className="mt-8">
        <AIDetails stats={stats} supportInfo={supportInfo} />
      </div> */}
    </div>
  );
}

export default SidePanel;
