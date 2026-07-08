// Login modal – Microsoft sign-in / sign-up only. The same Microsoft
// account popup is used for both flows (Azure AD creates the account on
// first use). The rest of the UI (icon, headings, "Cancel / Continue
// as Guest" link) is unchanged.
import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ICON_BASE = {
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function LockIcon({ className = "w-8 h-8", strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      {...ICON_BASE}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function MicrosoftLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="8" height="8" fill="#F25022" />
      <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
      <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
      <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
    </svg>
  );
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { loginWithMicrosoft, signInWithEmailPassword } = useAuth();
  const { showToast } = useToast();
  const [microsoftSubmitting, setMicrosoftSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // === DEMO DUMMY CODE START - REMOVABLE ===
  // Local state for the demo email/password form. The form is only
  // shown for the demo@syncfusion.com flow and is fully removable.
  const [demoEmail, setDemoEmail] = useState("demo@syncfusion.com");
  const [demoPassword, setDemoPassword] = useState("");
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  // === DEMO DUMMY CODE END - REMOVABLE ===

  function reset() {
    setError("");
    setMessage("");
    setMicrosoftSubmitting(false);
    // === DEMO DUMMY CODE START - REMOVABLE ===
    setDemoSubmitting(false);
    // === DEMO DUMMY CODE END - REMOVABLE ===
  }

  function close() {
    reset();
    onClose?.();
  }

  async function handleMicrosoft() {
    setError("");
    setMessage("");
    setMicrosoftSubmitting(true);
    try {
      const user = await loginWithMicrosoft();
      setMessage(`Signed in as ${user.email}`);
      showToast(`Welcome, ${user.email}!`, "success");
      setTimeout(close, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microsoft sign-in cancelled.");
    } finally {
      setMicrosoftSubmitting(false);
    }
  }

  // === DEMO DUMMY CODE START - REMOVABLE ===
  // Demo sign-in handler. Logs the user in as demo@syncfusion.com with
  // any non-empty password, mirroring the rest of the signed-in UX
  // (welcome toast, modal close, library access, etc.).
  async function handleDemoLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDemoSubmitting(true);
    try {
      const user = await signInWithEmailPassword(demoEmail, demoPassword);
      setMessage(`Signed in as ${user.email}`);
      showToast(`Welcome, ${user.email}! (demo)`, "success");
      setTimeout(close, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign-in failed.");
    } finally {
      setDemoSubmitting(false);
    }
  }
  // === DEMO DUMMY CODE END - REMOVABLE ===

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      ariaLabel="Library Login"
      maxWidth="max-w-sm"
    >
      <div className="p-8 w-full text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <LockIcon className="w-8 h-8 text-indigo-600" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Library Login</h2>
        <p className="text-sm text-slate-500 mb-6">
          Sign in or sign up with your Microsoft account.
        </p>
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleMicrosoft}
            disabled={microsoftSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MicrosoftLogo className="w-5 h-5" />
            {microsoftSubmitting ? "Opening Microsoft…" : "Sign in with Microsoft"}
          </button>

          {/* === DEMO DUMMY CODE START - REMOVABLE === */}
          <div className="relative my-2 flex items-center text-xs text-slate-400">
            <span className="flex-1 border-t border-slate-200" />
            <span className="px-3 uppercase tracking-wider">or demo</span>
            <span className="flex-1 border-t border-slate-200" />
          </div>
          <form className="space-y-3" onSubmit={handleDemoLogin}>
            <input
              type="email"
              required
              placeholder="demo@syncfusion.com"
              value={demoEmail}
              onChange={(event) => setDemoEmail(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
            <input
              type="password"
              required
              placeholder="Any password"
              value={demoPassword}
              onChange={(event) => setDemoPassword(event.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={demoSubmitting || microsoftSubmitting}
              className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {demoSubmitting ? "Signing in…" : "Continue as demo@syncfusion.com"}
            </button>
          </form>
          {/* === DEMO DUMMY CODE END - REMOVABLE === */}

          <button
            type="button"
            onClick={close}
            className="w-full py-2 mt-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Cancel / Continue as Guest
          </button>
        </div>
        {message && (
          <p className="mt-4 text-xs font-medium text-emerald-600">{message}</p>
        )}
        {error && (
          <p className="mt-4 text-xs font-medium text-rose-500">{error}</p>
        )}
      </div>
    </Modal>
  );
}
