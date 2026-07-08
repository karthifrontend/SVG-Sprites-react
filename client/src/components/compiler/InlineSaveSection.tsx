// Inline "save to library" panel shown below the drop zone.
// Mirrors the "react app with MS" reference: a top-level toggle
// for "save to library", a "Save as new library instead" sub-toggle
// that only appears in update mode, and a name input with live
// conflict detection. When the toggle is on, saving always creates
// a new version of the bundle (server-side), so the user can keep
// iterating on the same sprite without typing a new name.
import { useEffect, useState } from "react";

type InlineSaveValue = {
  enabled: boolean;
  name: string;
  saveAsNew: boolean;
  hasNameConflict: boolean;
};

type InlineSaveSectionProps = {
  isVisible: boolean;
  isUpdateMode: boolean;
  activeBundleName: string;
  existingLibraryNames: string[];
  value: InlineSaveValue;
  onLibraryNameChange: (next: InlineSaveValue) => void;
  onToggle: (enabled: boolean) => void;
};

function InlineSaveSection({
  isVisible,
  isUpdateMode,
  activeBundleName,
  existingLibraryNames,
  value,
  onLibraryNameChange,
  onToggle,
}: InlineSaveSectionProps) {
  const [name, setName] = useState(value?.name || "");
  const [saveAsNew, setSaveAsNew] = useState(value?.saveAsNew || false);

  useEffect(() => {
    if (value?.name !== undefined) setName(value.name);
  }, [value?.name]);

  useEffect(() => {
    if (value?.saveAsNew !== undefined) setSaveAsNew(value.saveAsNew);
  }, [value?.saveAsNew]);

  if (!isVisible) return null;

  // In update mode we keep the active bundle's name pre-filled and
  // the "save as new" toggle off by default — saving will create
  // a new version of the same bundle automatically.
  const showNameInput = isUpdateMode
    ? value?.enabled && saveAsNew
    : value?.enabled;
  const showSaveAsNewToggle = isUpdateMode && !!value?.enabled;
  const trimmed = name.trim().toLowerCase();
  const activeKey = activeBundleName.trim().toLowerCase();
  const isActiveBundle = trimmed.length > 0 && trimmed === activeKey;
  const hasNameConflict =
    trimmed.length > 0 &&
    existingLibraryNames.includes(trimmed) &&
    !isActiveBundle;
  const toggleLabel = isUpdateMode
    ? "Save new version to library"
    : "Save to library";
  const placeholder =
    isUpdateMode && activeBundleName
      ? activeBundleName
      : "New Sprite " + new Date().toLocaleDateString();
  const helperText = isUpdateMode
    ? isActiveBundle
      ? "Saving creates the next version of this bundle automatically."
      : "Pick the bundle name to attach this save to."
    : "Give this sprite a name so you can find it in the library later.";

  function handleToggle(next: boolean) {
    onToggle?.(next);
    onLibraryNameChange?.({
      name,
      saveAsNew,
      enabled: next,
      hasNameConflict,
    });
  }

  function handleName(next: string) {
    setName(next);
    onLibraryNameChange?.({
      name: next,
      saveAsNew,
      enabled: value?.enabled,
      hasNameConflict: false,
    });
  }

  function handleSaveAsNew(next: boolean) {
    setSaveAsNew(next);
    onLibraryNameChange?.({
      name,
      saveAsNew: next,
      enabled: value?.enabled,
      hasNameConflict,
    });
  }

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label className="group flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            checked={!!value?.enabled}
            onChange={(event) => handleToggle(event.target.checked)}
            className="peer sr-only"
          />
          <div className="block h-6 w-10 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-500" />
          <div className="dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </div>
        <div className="flex-1 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-900">
          {toggleLabel}
        </div>
      </label>

      {value?.enabled && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {helperText}
        </p>
      )}

      {showSaveAsNewToggle && (
        <div className="mt-4 border-t border-slate-200/60 pt-3">
          <label className="group flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                checked={saveAsNew}
                onChange={(event) => handleSaveAsNew(event.target.checked)}
                className="peer sr-only"
              />
              <div className="block h-6 w-10 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-500" />
              <div className="dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-900">
              Save as a new library instead
            </span>
          </label>
        </div>
      )}

      {showNameInput && (
        <div className="mt-4">
          <label
            htmlFor="library-name"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Library Name
          </label>
          <input
            id="library-name"
            type="text"
            value={name}
            onChange={(event) => handleName(event.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
              hasNameConflict
                ? "border-rose-500 focus:ring-rose-500"
                : "border-slate-200 focus:ring-indigo-500"
            }`}
          />
          {hasNameConflict && (
            <p className="mt-1.5 text-xs font-medium text-rose-500">
              A library with this name already exists. Pick a different name.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export type { InlineSaveValue };
export default InlineSaveSection;
