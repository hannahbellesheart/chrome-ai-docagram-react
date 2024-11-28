import { DEFAULT_OPTIONS } from "@/features/options/Options";
import { Relationship } from "@/features/side_panel/types/relationship";

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
  private writer: AIWriter | null;
  private isInitialized: boolean;
  private ai = self.ai;

  constructor() {
    this.model = null;
    this.summarizeSession = null;
    this.writer = null;
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
  async initialize(): Promise<AILanguageModel> {
    try {
      const result = await chrome.storage.sync.get("docagramOptions");
      const options = result.docagramOptions || DEFAULT_OPTIONS;

      await this.destroy();

      const support = await this.checkSupport();

      if (!support.hasLanguageModel) {
        throw new Error("Language model not available on this device");
      }

      this.model = await this.ai.languageModel.create({
        temperature: options.temperature,
        topK: options.topK,
        systemPrompt: options.systemPrompt,
      });

      if (!support.hasSummarizer) {
        this.isInitialized = true;
        return this.model!;
      }

      this.summarizeSession = await this.ai.summarizer.create({
        length: "short",
        format: "markdown",
        type: "key-points",
      });

      this.writer = await this.ai.writer.create({
        format: "plain-text",
        length: "medium",
        tone: "formal",
        sharedContext:
          "Write informative paragraphs based on the provided content.",
      });
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
  async summarizeContent(
    content: string,
    minLength = 1000,
    maxRetries = 3
  ): Promise<string> {
    console.log("Length of content: " + content.length);

    if (!content || content.length <= minLength) {
      console.log("Content does not need to be summarized");
      return "";
    }

    if (!this.summarizeSession) {
      console.warn("Summarizer not available");
      return "Summarizer not available";
    }

    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        const summary = await this.summarizeSession.summarize(content);
        return summary;
      } catch (error) {
        attempts++;

        // If session is invalid, try to reinitialize summarizer
        if (
          error instanceof DOMException &&
          error.name === "InvalidStateError"
        ) {
          try {
            const support = await this.checkSupport();
            if (support.hasSummarizer) {
              this.summarizeSession = await self.ai!.summarizer!.create();
              // Retry immediately after reinitialization
              continue;
            } else {
              console.warn("Summarizer not available, using original content");
              return "";
            }
          } catch (reinitError) {
            console.warn("Failed to reinitialize summarizer:", reinitError);
          }
        }

        // Log the attempt number
        console.warn(
          `Summarization attempt ${attempts}/${maxRetries} failed:`,
          error
        );

        // If we haven't reached max retries, add a small delay before retrying
        if (attempts < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempts), 5000); // Exponential backoff with 5s cap
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.warn("All retry attempts failed");
          return "Failed";
        }
      }
    }

    return "Failed";
  }

  /**
   * Streams analysis of a text chunk using the language model.
   *
   * @param {string} chunk - The text chunk to analyze.
   * @param {number} chunkIndex - The index of the current chunk.
   * @param {number} totalChunks - The total number of chunks.
   * @returns {Promise<ReadableStream<string>>} An async iterable of the analysis results.
   */
  async streamAnalysis(chunk: string): Promise<ReadableStream<string>> {
    if (!this.model) {
      /* console.error("Language model session not initialized");

      await this.destroy();
      const result = await chrome.storage.sync.get("docagramOptions");
      const options = result.docagramOptions || DEFAULT_OPTIONS;

      this.model = await this.ai.languageModel.create({
        temperature: options.temperature,
        topK: options.topK,
        systemPrompt: options.systemPrompt,
      }); */
    } else {
    }

    const result = await chrome.storage.sync.get("docagramOptions");
    const options = result.docagramOptions || DEFAULT_OPTIONS;

    // const prompt = `${options.systemPrompt}: ${chunk}`;
    const prompt = ` ${chunk}`;

    try {
      return this.model.promptStreaming(prompt);
    } catch (error) {
      console.error("Error streaming analysis:", error);
      // If session is invalid, try to reinitialize once
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        const capabilities = await this.getCapabilities();
        if (capabilities.available !== "no") {
          await this.initialize();
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
        this.model.destroy();
      } catch (error) {
        console.warn("Error destroying language model session:", error);
      }
      this.model = null;
    }

    if (this.summarizeSession) {
      try {
        this.summarizeSession.destroy();
      } catch (error) {
        console.warn("Error destroying summarizer session:", error);
      }
      this.summarizeSession = null;
    }

    this.isInitialized = false;
  }

  async writeAbout(entity: string): Promise<string> {
    // Doesn't work while page is being analyzed, Prompt API calls cannot run in parallel
    /* const output = await this.model?.prompt(
      "Write an informational paragraph based on these relationships: " +
        relationships
          .map((rel) => {
            return `${rel.entity1} to ${rel.entity2} (${rel.description})`;
          })
          .join("\n")
    );

    return output || ""; */

    if (!this.writer) {
      throw new Error("Writer not available");
    }

    try {
      const rewritten = await this.writer.write(entity, {
        context: "Write an informational paragraph about this entity.",
      });

      return rewritten;
    } catch (error) {
      console.error("Error rewriting relationships:", error);
      throw error;
    }
  }
}
