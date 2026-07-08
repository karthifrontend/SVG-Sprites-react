// Left-hand library sidebar. Shows the signed-out CTA when no
// user is authenticated and a grouped list of saved libraries
// (with load / refresh / rename / delete actions) when signed in.
// UI mirrors the "react app with MS" reference, with collapse/
// expand behavior owned by the parent.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLibrary } from "../../hooks/useLibrary";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatSize } from "../../utils/sprite";
import type { SpriteSummary } from "../../api/sprites";
import Modal from "../Modal";

type LibraryGroupVersion = {
  id: string;
  version: number;
  symbolCount: number;
  updatedAt?: string;
  summary: SpriteSummary;
};

type LibraryGroup = {
  bundleName: string;
  versions: LibraryGroupVersion[];
};

type LibraryPanelProps = {
  isOpen: boolean;
  onCollapseToggle: () => void;
  onOpenLogin: () => void;
  onLoadToUpdate?: (sprite: SpriteSummary) => void;
  /**
   * Fired after a library is renamed. The parent can use this to
   * keep in-flight references (e.g. the active bundle name in the
   * compiler) in sync with the new MongoDB name.
   */
  onLibraryRenamed?: (info: { oldName: string; newName: string }) => void;
  /**
   * Fired after a library is deleted. The parent can use this to
   * clear any UI that was pointing at the removed bundle.
   */
  onLibraryDeleted?: (info: { name: string }) => void;
};

function LibrarySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="skeleton-shimmer mb-4 h-4 w-1/2 rounded" />
          <div className="space-y-3 border-l-2 border-slate-100 pl-3">
            <div className="skeleton-shimmer h-3 w-3/4 rounded" />
            <div className="mt-2 flex gap-2">
              <div className="skeleton-shimmer h-7 flex-1 rounded" />
              <div className="skeleton-shimmer h-7 w-7 rounded" />
              <div className="skeleton-shimmer h-7 w-7 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UnlockIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
      />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0114-3M20 14a8 8 0 01-14 3"
      />
    </svg>
  );
}

function ChevronDoubleLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );
}

function LibraryCardIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}

function PencilIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
    </svg>
  );
}

type RenameModalProps = {
  open: boolean;
  currentName: string;
  existingNames: string[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (next: string) => void;
};

function RenameLibraryModal({
  open,
  currentName,
  existingNames,
  busy,
  onCancel,
  onConfirm,
}: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [touched, setTouched] = useState(false);

  // Reset the field whenever the modal re-opens with a new target.
  useEffect(() => {
    if (open) {
      setName(currentName);
      setTouched(false);
    }
  }, [open, currentName]);

  const trimmed = name.trim();
  const isUnchanged = trimmed.toLowerCase() === currentName.trim().toLowerCase();
  const conflict = existingNames
    .filter(n => n.toLowerCase() !== currentName.trim().toLowerCase())
    .some(n => n.toLowerCase() === trimmed.toLowerCase());
  const isInvalid = trimmed.length === 0 || trimmed.length > 100 || conflict;
  const showError = touched && isInvalid;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (isInvalid || isUnchanged || busy) return;
    onConfirm(trimmed);
  }

  return (
    <Modal
      isOpen={open}
      onClose={busy ? () => undefined : onCancel}
      maxWidth="max-w-sm"
      ariaLabel="Rename library"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <PencilIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Rename library</h3>
            <p className="text-[11px] text-slate-500">
              The new name is applied to every version of this bundle.
            </p>
          </div>
        </div>

        <label className="mb-1 block text-[11px] font-semibold text-slate-600">
          Library name
        </label>
        <input
          type="text"
          value={name}
          autoFocus
          onChange={event => setName(event.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={100}
          disabled={busy}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
          placeholder="my-icon-library"
        />
        {showError && trimmed.length === 0 && (
          <p className="mt-1 text-[11px] text-rose-500">Name is required.</p>
        )}
        {showError && trimmed.length > 100 && (
          <p className="mt-1 text-[11px] text-rose-500">Name is too long.</p>
        )}
        {showError && conflict && (
          <p className="mt-1 text-[11px] text-rose-500">
            Another library already uses that name.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || isUnchanged || isInvalid}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {busy ? "Saving…" : "Rename"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type DeleteModalProps = {
  open: boolean;
  bundleName: string;
  versionCount: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteLibraryModal({
  open,
  bundleName,
  versionCount,
  busy,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={busy ? () => undefined : onCancel}
      maxWidth="max-w-sm"
      ariaLabel="Delete library"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <TrashIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Delete library?</h3>
            <p className="text-[11px] text-slate-500">
              This cannot be undone.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          You are about to delete{" "}
          <span className="font-semibold text-slate-900">
            “{bundleName}”
          </span>{" "}
          and all of its{" "}
          <span className="font-semibold text-slate-900">
            {versionCount} version{versionCount === 1 ? "" : "s"}
          </span>{" "}
          from your library.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LibraryPanel({
  isOpen,
  onCollapseToggle,
  onOpenLogin,
  onLoadToUpdate,
  onLibraryRenamed,
  onLibraryDeleted,
}: LibraryPanelProps) {
  const { currentUser } = useAuth();
  const {
    sprites,
    loading,
    error,
    refetch,
    renameBundle,
    deleteBundle,
  } = useLibrary(!!currentUser);
  const { showToast } = useToast();
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Pending rename: the version whose bundle the user wants to
  // rename. We keep both the id (for the API call) and the current
  // name (to pre-fill the input) here.
  const [pendingRename, setPendingRename] = useState<{
    id: string;
    currentName: string;
  } | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

  // Pending delete: the version whose bundle the user wants to
  // remove. We confirm via a modal so a stray click can't wipe a
  // whole library from MongoDB.
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    bundleName: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Show a brief skeleton only when a refresh is in flight, not on first
  // paint (the panel may render before the user signs in).
  useEffect(() => {
    if (loading && sprites.length === 0) {
      setShowSkeleton(true);
      return undefined;
    }
    const timer = setTimeout(() => setShowSkeleton(false), 350);
    return () => clearTimeout(timer);
  }, [loading, sprites.length]);

  const groups = useMemo<LibraryGroup[]>(() => {
    const byName = new Map<string, LibraryGroup>();
    for (const sprite of sprites) {
      const key = (sprite.bundleName || sprite.name || "").trim().toLowerCase();
      if (!key) continue;
      if (!byName.has(key)) {
        byName.set(key, { bundleName: sprite.bundleName || sprite.name, versions: [] });
      }
      byName.get(key)!.versions.push({
        id: sprite._id,
        version: sprite.version ?? 1,
        symbolCount: sprite.symbolCount,
        updatedAt: sprite.updatedAt,
        summary: sprite,
      });
    }
    // Make sure versions inside a group are sorted newest first.
    for (const group of byName.values()) {
      group.versions.sort((a, b) => b.version - a.version);
    }
    return Array.from(byName.values());
  }, [sprites]);

  const handleRefresh = () => {
    void refetch();
  };

  const handleLoad = (version: LibraryGroupVersion) => {
    onLoadToUpdate?.(version.summary);
    showToast(
      `Loaded ${version.summary.bundleName || version.summary.name} v${version.version}`,
      "success"
    );
  };

  // Names of every library used to detect rename collisions inside
  // the rename modal. Compared case-insensitively inside the modal.
  const existingLibraryNames = useMemo(
    () => groups.map(g => g.bundleName),
    [groups]
  );

  function openRenameModal(group: LibraryGroup) {
    if (group.versions.length === 0) return;
    setPendingRename({
      id: group.versions[0].id,
      currentName: group.bundleName,
    });
  }

  async function handleConfirmRename(next: string) {
    if (!pendingRename) return;
    setRenameBusy(true);
    try {
      const oldName = pendingRename.currentName;
      const newName = await renameBundle(pendingRename.id, next);
      showToast(`Renamed to “${newName}”.`, "success");
      onLibraryRenamed?.({ oldName, newName });
      setPendingRename(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to rename library.",
        "error"
      );
    } finally {
      setRenameBusy(false);
    }
  }

  function openDeleteModal(group: LibraryGroup) {
    if (group.versions.length === 0) return;
    setPendingDelete({
      id: group.versions[0].id,
      bundleName: group.bundleName,
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      const removed = await deleteBundle(pendingDelete.id);
      showToast(`Deleted “${removed}” from your library.`, "success");
      onLibraryDeleted?.({ name: removed });
      setPendingDelete(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete library.",
        "error"
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <aside
      aria-label="Organization Library"
      className={`${
        isOpen ? "w-80 flex" : "w-0 hidden"
      } sticky top-[57px] z-30 h-[calc(100vh-57px)] max-h-[calc(100vh-57px)] flex-col border-r border-slate-200 bg-slate-50 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out`}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200/50">
            <LibraryCardIcon className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Library</h2>
        </div>
        <div className="flex items-center gap-1">
          {currentUser && (
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="Refresh Library"
              aria-label="Refresh Library"
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onCollapseToggle}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="Collapse Library"
            aria-label="Collapse Library"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar relative flex-1 overflow-y-auto px-4 py-4">
        {!currentUser && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <UnlockIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-slate-900">Sign in required</h3>
            <p className="mb-4 text-xs text-slate-500">
              You need to log in to access the shared organization library.
            </p>
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Log In Now
            </button>
          </div>
        )}

        {currentUser && (
          <div className="flex h-full flex-col">
            {error && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                {error}
              </div>
            )}

            {showSkeleton ? (
              <LibrarySkeleton />
            ) : sprites.length === 0 ? (
              <p className="animate-fade-in-up py-10 text-center text-sm text-slate-500">
                No sprites found in library.
              </p>
            ) : (
              <div className="space-y-3 pb-4">
                {groups.map((group, groupIdx) => (
                  <div
                    key={group.bundleName}
                    className="animate-fade-in-up mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    style={{ animationDelay: `${groupIdx * 0.05}s` }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3
                        className="truncate text-sm font-bold text-slate-800"
                        title={group.bundleName}
                      >
                        {group.bundleName}
                      </h3>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {group.versions.length} version{group.versions.length === 1 ? "" : "s"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openRenameModal(group)}
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          title="Rename library"
                          aria-label={`Rename ${group.bundleName}`}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(group)}
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Delete library"
                          aria-label={`Delete ${group.bundleName}`}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.versions.map((version) => {
                        const isLatest = version === group.versions[0];
                        return (
                          <div
                            key={version.id}
                            className="group relative border-l-2 border-indigo-100 pl-3"
                          >
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                                    isLatest
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  v{version.version}
                                </span>
                                <span className="text-[11px] font-semibold text-indigo-600">
                                  {version.symbolCount} symbol
                                  {version.symbolCount === 1 ? "" : "s"}
                                </span>
                              </div>
                              <span className="ml-2 whitespace-nowrap font-mono text-[10px] text-slate-400">
                                {formatDate(version.updatedAt)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLoad(version)}
                              className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
                            >
                              Load to Update
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
              {sprites.length} version{sprites.length === 1 ? "" : "s"} ·{" "}
              {formatSize(sprites.reduce((sum, s) => sum + (s.symbolCount || 0) * 512, 0))}
            </div>
          </div>
        )}
      </div>

      <RenameLibraryModal
        open={!!pendingRename}
        currentName={pendingRename?.currentName ?? ""}
        existingNames={existingLibraryNames}
        busy={renameBusy}
        onCancel={() => {
          if (!renameBusy) setPendingRename(null);
        }}
        onConfirm={handleConfirmRename}
      />

      <DeleteLibraryModal
        open={!!pendingDelete}
        bundleName={pendingDelete?.bundleName ?? ""}
        versionCount={
          pendingDelete
            ? groups.find(
                g => g.bundleName.toLowerCase() === pendingDelete.bundleName.toLowerCase()
              )?.versions.length ?? 0
            : 0
        }
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </aside>
  );
}

export default LibraryPanel;
