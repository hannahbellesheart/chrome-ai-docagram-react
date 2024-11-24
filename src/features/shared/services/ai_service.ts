export const systemPrompt = `You are a helpful assistant that analyzes text to identify key entities and their relationships. 
For each relationship, explain the connection between entities in a clear and concise way. 
Focus on the most important and meaningful relationships.
Keep entity names concise and relationship descriptions brief but clear.
Only include relationships that are explicitly stated or strongly implied in the text.`;

interface ProgressEvent {
  loaded: number;
  total: number;
}

interface Monitor {
  addEventListener(
    event: "downloadprogress",
    callback: (e: ProgressEvent) => void
  ): void;
}

export interface SessionStats {
  maxTokens: number;
  temperature: number;
  tokensLeft: number;
  tokensSoFar: number;
  topK: number;
  hasSummarizer: boolean;
  isInitialized: boolean;
}

export class AIService {
  private model: AILanguageModel | null;
  private summarizeSession: AISummarizer | null;
  private isInitialized: boolean;
  private ai = self.ai;

  constructor() {
    this.model = null;
    this.summarizeSession = null;
    this.isInitialized = false;
  }

  /**
   * Checks the support for AI capabilities including language model and summarizer.
   *
   * @returns {Promise<Object>} An object containing the support status and availability of the language model and summarizer.
   */
  async checkSupport(): Promise<{
    hasLanguageModel: boolean;
    hasSummarizer: boolean;
    languageModelStatus: string;
    summarizerStatus: string;
  }> {
    try {
      const languageModelCapabilities =
        await self.ai?.languageModel?.capabilities();
      const summarizerCapabilities = await self.ai?.summarizer?.capabilities();

      return {
        hasLanguageModel: languageModelCapabilities?.available !== "no",
        hasSummarizer: summarizerCapabilities?.available !== "no",
        languageModelStatus: languageModelCapabilities?.available || "no",
        summarizerStatus: summarizerCapabilities?.available || "no",
      };
    } catch (error) {
      console.error("Error checking AI capabilities:", error);
      return {
        hasLanguageModel: false,
        hasSummarizer: false,
        languageModelStatus: "no",
        summarizerStatus: "no",
      };
    }
  }

  /**
   * Initializes the AIService by setting up language model and summarizer sessions.
   *
   * @param {number} temperature - The temperature setting for the language model.
   * @param {number} topK - The topK setting for the language model.
   * @returns {Promise<AILanguageModel>} The initialized language model session.
   */
  async initialize(
    temperature: number,
    topK: number
  ): Promise<AILanguageModel> {
    try {
      await this.destroy();

      const support = await this.checkSupport();

      if (!support.hasLanguageModel) {
        throw new Error("Language model not available on this device");
      }

      this.model = await this.ai.languageModel.create({
        temperature,
        topK,
      });

      if (!support.hasSummarizer) {
        this.isInitialized = true;
        return this.model!;
      }

      this.summarizeSession = await this.ai.summarizer.create();
      this.isInitialized = true;
      return this.model!;
    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Summarizes the content if it exceeds the maximum length.
   *
   * @param {string} content - The content to summarize.
   * @param {number} minLength - The maximum allowed length.
   * @returns {Promise<string>} The summarized content or original content.
   */
  async summarizeContent(content: string, minLength = 1000): Promise<string> {
    console.log("Summarizing content..." + content);
    console.log("Length of content: " + content.length);

    if (!content || content.length <= minLength) {
      console.log("Content does not need to be summarized");
      return '';
    }

    if (!this.summarizeSession) {
      console.warn("Summarizer not available");
      return 'Summarizer not available';
    }

    try {
      const summary = await this.summarizeSession.summarize(content);
      return summary;
    } catch (error) {
      // If session is invalid, try to reinitialize summarizer
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        try {
          const support = await this.checkSupport();
          if (support.hasSummarizer) {
            this.summarizeSession = await self.ai!.summarizer!.create();
            return await this.summarizeSession.summarize(content);
          } else {
            console.warn("Summarizer not available, using original content");
            return '';
          }
        } catch (reinitError) {
          console.warn("Failed to reinitialize summarizer:", reinitError);
        }
      }
      console.warn("Summarization failed, using original content:", error);
      return content;
    }
  }

  /**
   * Streams analysis of a text chunk using the language model.
   *
   * @param {string} chunk - The text chunk to analyze.
   * @param {number} chunkIndex - The index of the current chunk.
   * @param {number} totalChunks - The total number of chunks.
   * @returns {Promise<ReadableStream<string>>} An async iterable of the analysis results.
   */
  async streamAnalysis(
    chunk: string,
    chunkIndex: number,
    totalChunks: number
  ): Promise<ReadableStream<string>> {
    if (!this.model) {
      throw new Error("Language model session not initialized");
    } else {
    }

    const prompt = `
      Analyze this text chunk (${
        chunkIndex + 1
      } of ${totalChunks}) and identify key relationships between entities.
      Express each relationship using this format: Entity1 to Entity2 (Description of relationship)
      
      Format rules:
      1. Each line should be: Entity1 to Entity2 (Description)
      2. Keep entity names clear but concise
      3. Place the relationship description in parentheses
      4. Make descriptions brief and specific
      5. Only include relationships that are clear and meaningful
      
      Examples:
      Google to Chrome Browser (develops and maintains the browser)
      Chrome to Web Extensions (provides platform and APIs)
      Microsoft to Windows (develops and distributes operating system)
      
      Only output the relationships, no additional text or explanation.
      Each relationship should be on its own line.
      
      Text chunk to analyze: ${chunk}
    `;

    try {
      return this.model.promptStreaming(prompt);
    } catch (error) {
      console.error("Error streaming analysis:", error);
      // If session is invalid, try to reinitialize once
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        const capabilities = await this.getCapabilities();
        if (capabilities.available !== "no") {
          await this.initialize(this.model.temperature, this.model.topK);
          return this.model.promptStreaming(prompt);
        }
      }
      throw error;
    }
  }

  /**
   * Retrieves the capabilities of the language model.
   *
   * @returns {Promise<Capabilities>} The capabilities of the language model.
   */
  async getCapabilities(): Promise<AILanguageModelCapabilities> {
    try {
      return await self.ai!.languageModel!.capabilities();
    } catch (error) {
      console.error("Error getting language model capabilities:", error);
      return {
        available: "no",
        defaultTopK: 0,
        maxTopK: 0,
        defaultTemperature: 0,
        supportsLanguage: () => "readily",
      };
    }
  }

  /**
   * Retrieves the session statistics.
   *
   * @returns {SessionStats | null} The session statistics or null if no session exists.
   */
  getSessionStats(): SessionStats | null {
    if (!this.model) return null;

    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } =
      this.model;
    return {
      maxTokens,
      temperature,
      tokensLeft,
      tokensSoFar,
      topK,
      hasSummarizer: !!this.summarizeSession,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Destroys the language model and summarizer sessions.
   *
   * @returns {Promise<void>}
   */
  async destroy(): Promise<void> {
    console.log("Destroying AI service...");
    if (this.model) {
      try {
        await this.model.destroy();
      } catch (error) {
        console.warn("Error destroying language model session:", error);
      }
      this.model = null;
    }

    if (this.summarizeSession) {
      try {
        await this.summarizeSession.destroy();
      } catch (error) {
        console.warn("Error destroying summarizer session:", error);
      }
      this.summarizeSession = null;
    }

    this.isInitialized = false;
  }
}
