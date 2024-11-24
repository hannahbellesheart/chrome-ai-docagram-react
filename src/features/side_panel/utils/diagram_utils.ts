export const sanitizeMermaidText = (text: string): string => {
  return text
    .replace(/[-–—]/g, "") // Remove hyphens and dashes
    .replace(/[,.'’"!@#$%^&*()′″°+=\[\]{}|\\/<>:;_\s]/g, "_")
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, "")
    .trim(); // Remove leading/trailing underscores
};

export const sanitizeMermaidLabel = (text: string): string => {
  return text
    .trim()
    .replace("©", "")
    .replace("*", "")
    .replace('"', "")
    .replace("’", "'")
    .replace("`", "");
};
