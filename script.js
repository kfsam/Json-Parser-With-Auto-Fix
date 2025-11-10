// JSON Parser Application with LocalStorage History

class JSONParser {
  constructor() {
    this.inputJson = document.getElementById("inputJson");
    this.output = document.getElementById("output");
    this.historyList = document.getElementById("historyList");

    this.initializeEventListeners();
    this.loadHistory();
  }

  initializeEventListeners() {
    // Button events
    document
      .getElementById("parseBtn")
      .addEventListener("click", () => this.parseJSON());
    document
      .getElementById("formatBtn")
      .addEventListener("click", () => this.formatJSON());
    document
      .getElementById("minifyBtn")
      .addEventListener("click", () => this.minifyJSON());
    document
      .getElementById("autoFixBtn")
      .addEventListener("click", () => this.autoFixJSON());
    document
      .getElementById("clearBtn")
      .addEventListener("click", () => this.clearInput());
    document
      .getElementById("copyBtn")
      .addEventListener("click", () => this.copyOutput());
    document
      .getElementById("clearHistoryBtn")
      .addEventListener("click", () => this.clearHistory());

    // Input change event for real-time error highlighting
    this.inputJson.addEventListener("input", () => this.highlightErrors());
  }

  parseJSON() {
    const input = this.inputJson.value.trim();

    if (!input) {
      this.showError("Please enter JSON data to parse");
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      const highlighted = this.syntaxHighlight(formatted);

      this.output.innerHTML = highlighted;
      this.output.className = "output-area success";

      // Save to history
      this.saveToHistory(input);
    } catch (error) {
      this.showError(`JSON Parse Error: ${error.message}`);
    }
  }

  formatJSON() {
    const input = this.inputJson.value.trim();

    if (!input) {
      this.showError("Please enter JSON data to format");
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);

      this.inputJson.value = formatted;
      this.showSuccess("JSON formatted successfully!");

      // Save to history
      this.saveToHistory(formatted);
    } catch (error) {
      this.showError(`JSON Parse Error: ${error.message}`);
    }
  }

  minifyJSON() {
    const input = this.inputJson.value.trim();

    if (!input) {
      this.showError("Please enter JSON data to minify");
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);

      this.inputJson.value = minified;
      this.showSuccess("JSON minified successfully!");

      // Save to history
      this.saveToHistory(minified);
    } catch (error) {
      this.showError(`JSON Parse Error: ${error.message}`);
    }
  }

  clearInput() {
    this.inputJson.value = "";
    this.output.innerHTML = "";
    this.output.className = "output-area";
    document.getElementById("errorHighlight").innerHTML = "";
  }

  copyOutput() {
    const text = this.output.innerText;

    if (!text) {
      this.showError("No output to copy");
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.showSuccess("Copied to clipboard!");
      })
      .catch(() => {
        this.showError("Failed to copy to clipboard");
      });
  }

  syntaxHighlight(json) {
    json = json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key";
          } else {
            cls = "json-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return '<span class="' + cls + '">' + match + "</span>";
      }
    );
  }

  showError(message) {
    this.output.textContent = message;
    this.output.className = "output-area error";
  }

  showSuccess(message) {
    this.output.textContent = message;
    this.output.className = "output-area success";
  }

  // LocalStorage History Management
  saveToHistory(jsonData) {
    try {
      // Get existing history
      let history = this.getHistoryFromStorage();

      // Create new history item
      const historyItem = {
        id: Date.now(),
        data: jsonData,
        timestamp: new Date().toISOString(),
        preview: this.createPreview(jsonData),
      };

      // Add to beginning of array
      history.unshift(historyItem);

      // Limit to 50 items
      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      // Save to localStorage
      localStorage.setItem("jsonParserHistory", JSON.stringify(history));

      // Refresh history display
      this.loadHistory();
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  }

  getHistoryFromStorage() {
    try {
      const history = localStorage.getItem("jsonParserHistory");
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error("Error loading history:", error);
      return [];
    }
  }

  loadHistory() {
    const history = this.getHistoryFromStorage();

    if (history.length === 0) {
      this.historyList.innerHTML =
        '<div class="empty-history">No history yet<br>Parse some JSON to get started!</div>';
      return;
    }

    this.historyList.innerHTML = history
      .map(
        (item) => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-date">${this.formatDate(
                      item.timestamp
                    )}</span>
                    <button class="history-item-delete" data-id="${
                      item.id
                    }">✕</button>
                </div>
                <div class="history-item-preview">${item.preview}</div>
            </div>
        `
      )
      .join("");

    // Add click events to history items
    document.querySelectorAll(".history-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("history-item-delete")) {
          this.loadHistoryItem(parseInt(item.dataset.id));
        }
      });
    });

    // Add click events to delete buttons
    document.querySelectorAll(".history-item-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteHistoryItem(parseInt(btn.dataset.id));
      });
    });
  }

  loadHistoryItem(id) {
    const history = this.getHistoryFromStorage();
    const item = history.find((h) => h.id === id);

    if (item) {
      this.inputJson.value = item.data;
      this.parseJSON();
    }
  }

  deleteHistoryItem(id) {
    let history = this.getHistoryFromStorage();
    history = history.filter((h) => h.id !== id);

    localStorage.setItem("jsonParserHistory", JSON.stringify(history));
    this.loadHistory();
  }

  clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
      localStorage.removeItem("jsonParserHistory");
      this.loadHistory();
    }
  }

  createPreview(jsonData) {
    // Create a short preview of the JSON data
    const preview = jsonData.substring(0, 100);
    return preview.length < jsonData.length ? preview + "..." : preview;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return "Just now";
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    // Otherwise show date
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }

  // Error highlighting functionality
  highlightErrors() {
    const input = this.inputJson.value;
    const errorHighlight = document.getElementById("errorHighlight");

    if (!input.trim()) {
      errorHighlight.innerHTML = "";
      return;
    }

    try {
      JSON.parse(input);
      errorHighlight.innerHTML = "";
    } catch (error) {
      // Find error position
      const errorMatch = error.message.match(/position (\d+)/);
      if (errorMatch) {
        const errorPos = parseInt(errorMatch[1]);
        this.highlightErrorPosition(input, errorPos);
      } else {
        errorHighlight.innerHTML = "";
      }
    }
  }

  highlightErrorPosition(text, errorPos) {
    const errorHighlight = document.getElementById("errorHighlight");
    let highlightedText = "";

    for (let i = 0; i < text.length; i++) {
      if (i === errorPos) {
        highlightedText +=
          '<span class="error-char">' + this.escapeHtml(text[i]) + "</span>";
      } else {
        highlightedText += this.escapeHtml(text[i]);
      }
    }

    errorHighlight.innerHTML = highlightedText;
  }

  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // Auto-fix JSON functionality
  autoFixJSON() {
    const input = this.inputJson.value.trim();

    if (!input) {
      this.showError("Please enter JSON data to fix");
      return;
    }

    try {
      // First try to parse - if successful, no fix needed
      JSON.parse(input);
      this.showSuccess("JSON is already valid!");
      return;
    } catch (error) {
      // Try to fix common issues
      let fixed = this.attemptAutoFix(input);

      try {
        // Verify the fix worked
        JSON.parse(fixed);
        this.inputJson.value = JSON.stringify(JSON.parse(fixed), null, 2);
        this.showSuccess("JSON auto-fixed successfully!");
        this.saveToHistory(this.inputJson.value);
      } catch (e) {
        this.showError("Unable to auto-fix JSON. Error: " + e.message);
      }
    }
  }

  attemptAutoFix(json) {
    let fixed = json;

    // Fix single quotes to double quotes
    fixed = fixed.replace(/'/g, '"');

    // Fix unquoted keys
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Fix missing commas between properties
    fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');
    fixed = fixed.replace(/}\s*\n\s*"/g, '},\n"');
    fixed = fixed.replace(/]\s*\n\s*"/g, '],\n"');

    // Try to add missing quotes around values
    fixed = fixed.replace(
      /:(\s*)([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g,
      (match, space, value, end) => {
        if (value === "true" || value === "false" || value === "null") {
          return ":" + space + value + end;
        }
        return ":" + space + '"' + value + '"' + end;
      }
    );

    // Fix missing closing brackets/braces
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += "}";
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += "]";
    }

    return fixed;
  }
}

// Initialize the parser when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new JSONParser();
});
