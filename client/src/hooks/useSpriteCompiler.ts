import { useCallback, useEffect, useRef, useState } from "react";
import { buildDemoHtml, buildSpriteXml, extractSymbolsFromSprite, svgFileToSymbol, type SpriteSymbol } from "../utils/sprite";

type CompilerState = {
  generating: boolean;
  spriteUrl: string | null;
  spriteXml: string | null;
  symbolIds: string[];
  error: string | null;
  copied: boolean;
};

type CompilerActions = {
  generate: (files: File[], options?: { existingContent?: string }) => Promise<void>;
  copy: () => Promise<void>;
  openDemo: () => void;
  reset: () => void;
  waitForSprite: () => Promise<{ xml: string; symbolIds: string[] }>;
  loadFromLibrary: (input: { xml: string; symbolIds: string[] }) => void;
};

const COPY_FEEDBACK_MS = 1500;

/**
 * Drives the sprite-generation pipeline: turn staged files into a sprite
 * document, build a blob URL for download, and expose copy/demo actions.
 */
export function useSpriteCompiler(): CompilerState & CompilerActions {
  const [generating, setGenerating] = useState(false);
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);
  const [spriteXml, setSpriteXml] = useState<string | null>(null);
  const [symbolIds, setSymbolIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Keep a ref to the latest blob URL so we can revoke it on unmount/replace.
  const urlRef = useRef<string | null>(null);
  // Mirror of spriteXml/symbolIds so consumers outside the render cycle
  // (e.g. async save flows) can read the freshest values.
  const xmlRef = useRef<string | null>(null);
  const symbolIdsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const replaceUrl = useCallback((next: string | null) => {
    if (urlRef.current && urlRef.current !== next) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = next;
    setSpriteUrl(next);
  }, []);

  const generate = useCallback(
    async (files: File[], options?: { existingContent?: string }) => {
      if (files.length === 0 && !options?.existingContent) return;
      setGenerating(true);
      setError(null);
      setSpriteXml(null);
      setSymbolIds([]);
      xmlRef.current = null;
      symbolIdsRef.current = [];
      replaceUrl(null);
      try {
        const newSymbols = await Promise.all(files.map(svgFileToSymbol));

        // In update mode, pull the existing symbols out of the base
        // sprite and merge them with the new ones. New symbols win
        // when ids collide.
        const existingSymbols = options?.existingContent
          ? extractSymbolsFromSprite(options.existingContent)
          : [];
        const seen = new Set<string>();
        const merged: SpriteSymbol[] = [];
        for (const s of [...existingSymbols, ...newSymbols]) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          merged.push(s);
        }

        const xml = buildSpriteXml(merged);
        const blob = new Blob([xml], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        replaceUrl(url);
        setSpriteXml(xml);
        setSymbolIds(merged.map(s => s.id));
        xmlRef.current = xml;
        symbolIdsRef.current = merged.map(s => s.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate sprite.");
      } finally {
        setGenerating(false);
      }
    },
    [replaceUrl]
  );

  const flashCopied = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, []);

  const copy = useCallback(async () => {
    if (!spriteXml) return;
    try {
      await navigator.clipboard.writeText(spriteXml);
      flashCopied();
    } catch {
      // Fallback for older browsers / insecure contexts.
      const ta = document.createElement("textarea");
      ta.value = spriteXml;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
      flashCopied();
    }
  }, [spriteXml, flashCopied]);

  const openDemo = useCallback(() => {
    if (!spriteXml) return;
    const html = buildDemoHtml(symbolIds, spriteXml);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
  }, [spriteXml, symbolIds]);

  const reset = useCallback(() => {
    setError(null);
    setSpriteXml(null);
    setSymbolIds([]);
    xmlRef.current = null;
    symbolIdsRef.current = [];
    replaceUrl(null);
  }, [replaceUrl]);

  /**
   * Replace the current sprite output with one loaded from the library.
   * Builds a fresh blob URL for download and updates the refs so the
   * "save to library" flow reads the same data.
   */
  const loadFromLibrary = useCallback(
    (input: { xml: string; symbolIds: string[] }) => {
      setError(null);
      setCopied(false);
      const blob = new Blob([input.xml], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      replaceUrl(url);
      setSpriteXml(input.xml);
      setSymbolIds(input.symbolIds);
      xmlRef.current = input.xml;
      symbolIdsRef.current = input.symbolIds;
    },
    [replaceUrl]
  );

  /**
   * Resolve with the freshly generated sprite XML once it lands in the
   * hook. Used by consumers that need the latest value immediately after
   * calling `generate()` (e.g. the "save to library" flow).
   */
  const waitForSprite = useCallback(
    () =>
      new Promise<{ xml: string; symbolIds: string[] }>(resolve => {
        const check = () => {
          if (xmlRef.current) {
            resolve({ xml: xmlRef.current, symbolIds: symbolIdsRef.current });
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      }),
    []
  );

  return {
    generating,
    spriteUrl,
    spriteXml,
    symbolIds,
    error,
    copied,
    generate,
    copy,
    openDemo,
    reset,
    waitForSprite,
    loadFromLibrary,
  };
}
