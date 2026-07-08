import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { ReactNode } from "react";

type NavbarProps = {
  onOpenLogin: () => void;
  libraryToggleSlot?: ReactNode;
};

function Navbar({ onOpenLogin, libraryToggleSlot }: NavbarProps) {
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully", "success");
  }

  const initials = (currentUser?.displayName || currentUser?.email || "?")
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "?";

  return (
    <nav className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {libraryToggleSlot}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-slate-800">
            SVG Sprite Compiler
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 py-1 pl-1 pr-3 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
                {initials}
              </span>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-slate-700">
                  {currentUser.displayName || currentUser.email}
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentUser.isDemoAccount
                    ? "Demo account"
                    : currentUser.provider === "microsoft"
                      ? "Microsoft"
                      : "Signed in"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700"
          >
            Sign in / sign up
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
