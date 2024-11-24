const highlightText = (searchText: string) => {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const span = document.createElement("span");
  span.className = "docagram-highlight";

  let node;
  const nodes: Text[] = [];

  // First, collect all text nodes
  while ((node = walker.nextNode())) {
    nodes.push(node as Text);
  }

  // Then process them (to avoid tree walker issues)
  nodes.forEach((textNode) => {
    const content = textNode.textContent || "";
    if (content.includes(searchText)) {
      const parts = content.split(new RegExp(`(${searchText})`, "gi"));
      const fragment = document.createDocumentFragment();

      parts.forEach((part) => {
        if (part.toLowerCase() === searchText.toLowerCase()) {
          const highlight = span.cloneNode() as HTMLElement;
          highlight.textContent = part;
          fragment.appendChild(highlight);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });

      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  });
};

// Remove existing highlights
const removeHighlights = () => {
  document.querySelectorAll(".docagram-highlight").forEach((el) => {
    const text = el.textContent || "";
    el.parentNode?.replaceChild(document.createTextNode(text), el);
  });
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlight") {
    removeHighlights();
    highlightText(request.entity);
    sendResponse({ success: true });
  }
  return true; // Required for async response
});

// Insert styles
const style = document.createElement("style");
style.textContent = `
    .docagram-highlight {
      background-color: #fef08a;
      border-radius: 2px;
      transition: background-color 0.2s;
    }
    .docagram-highlight:hover {
      background-color: #fde047;
    }
  `;
document.head.appendChild(style);
