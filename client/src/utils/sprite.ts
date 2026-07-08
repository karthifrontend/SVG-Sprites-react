export type SpriteSymbol = {
  id: string;
  viewBox: string;
  inner: string;
};

/** Lightweight, locale-aware date formatter used in the library panel. */
export function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

/** Human-readable byte size formatter used by the file list. */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Cross-browser clipboard copy that falls back to `execCommand` when
 * the modern Clipboard API is unavailable.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (text === undefined || text === null) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy shim below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse an uploaded SVG file into a symbol description that can be embedded
 * inside a sprite sheet. Symbol IDs are derived from the filename.
 */
export async function svgFileToSymbol(file: File): Promise<SpriteSymbol> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error(`Invalid SVG: ${file.name}`);

  // Prefer viewBox; fall back to width/height or 24x24.
  let viewBox = svg.getAttribute("viewBox") || "";
  if (!viewBox) {
    const w = svg.getAttribute("width") || "24";
    const h = svg.getAttribute("height") || "24";
    viewBox = `0 0 ${parseFloat(w)} ${parseFloat(h)}`;
  }

  // Concatenate all child nodes (element + text) into a single string.
  const inner = Array.from(svg.childNodes)
    .map(node => (node as Element).outerHTML ?? node.nodeValue ?? "")
    .join("")
    .trim();

  // Symbol id from filename (without extension), sanitized.
  const id = file.name
    .replace(/\.svg$/i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  return { id, viewBox, inner };
}

/** Build a complete sprite SVG document from a list of symbols. */
export function buildSpriteXml(symbols: SpriteSymbol[]): string {
  const symbolsXml = symbols
    .map(s => `<symbol id="${s.id}" viewBox="${s.viewBox}">${s.inner}</symbol>`)
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n  ${symbolsXml}\n</svg>`;
}

/**
 * Extract every <symbol> from an existing sprite XML string so it can
 * be merged with newly uploaded icons. Falls back to an empty list when
 * the document cannot be parsed.
 */
export function extractSymbolsFromSprite(xml: string): SpriteSymbol[] {
  if (!xml) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "image/svg+xml");
    if (doc.querySelector("parsererror")) return [];
    const symbolEls = Array.from(doc.getElementsByTagName("symbol"));
    return symbolEls
      .map((el) => {
        const id = el.getAttribute("id") || "";
        if (!id) return null;
        const viewBox =
          el.getAttribute("viewBox") ||
          el.getAttribute("data-viewBox") ||
          "0 0 24 24";
        const inner = Array.from(el.childNodes)
          .map((node) =>
            (node as Element).outerHTML ?? node.nodeValue ?? ""
          )
          .join("")
          .trim();
        return { id, viewBox, inner };
      })
      .filter((s): s is SpriteSymbol => s !== null);
  } catch {
    return [];
  }
}

/** Build a self-contained HTML demo page that renders every symbol with <use>. */
export function buildDemoHtml(symbolIds: string[], spriteXml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Sprite Demo</title>
<style>body{font-family:system-ui;background:#f8fafc;padding:24px;color:#0f172a}
.row{display:flex;flex-wrap:wrap;gap:18px}.cell{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:#475569}
svg.icon{width:48px;height:48px;color:#4f46e5}
</style></head><body>
<h2>Sprite Demo (${symbolIds.length} symbols)</h2>
<div class="row">${symbolIds
    .map(
      id =>
        `<div class="cell"><svg class="icon"><use href="#${id}"/></svg><span>${id}</span></div>`
    )
    .join("")}</div>
${spriteXml}
</body></html>`;
}
