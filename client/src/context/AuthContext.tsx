// AuthContext
// ---------------------------------------------------------------------------
// Microsoft-only authentication. The original app also supported
// email/password and Google sign-in; both have been removed so that
// sign-in and sign-up are exclusive to Microsoft (Azure AD / Entra ID)
// via a popup window, mirroring the UX of the previous Google button.
//
// We use the official MSAL.js library loaded from Microsoft's CDN so no
// build-time dependency is required. Configure your Azure AD app by
// setting window.MS_CLIENT_ID before this module is imported, or by
// editing the default below.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  picture: string | null;
  emailVerified: boolean;
  provider: "microsoft" | "demo";
  isDemoAccount?: boolean;
  token?: string;
};

type AuthContextValue = {
  currentUser: CurrentUser | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<CurrentUser>;
  loginWithGoogle: () => Promise<CurrentUser>;
  loginWithMicrosoft: () => Promise<CurrentUser>;
  logout: () => Promise<void>;
};

const STORAGE_USER_KEY = "currentUser";

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_MS_CLIENT_ID = "00000000-0000-0000-0000-000000000000";
const MS_TENANT = "common";
const MS_SCOPES = ["openid", "profile", "email", "User.Read"];

// Augment window so TS knows about MSAL globals we attach at runtime.
declare global {
  interface Window {
    msal?: {
      PublicClientApplication: new (config: unknown) => MsalInstance;
    };
    MS_CLIENT_ID?: string;
  }
}

type MsalCtor = new (config: unknown) => MsalInstance;

type MsalAccount = {
  homeAccountId?: string;
  localAccountId?: string;
  username?: string;
  name?: string;
};

type MsalInstance = {
  initialize: () => Promise<void>;
  setActiveAccount: (account: MsalAccount | null) => void;
  getActiveAccount: () => MsalAccount | null;
  loginPopup: (request: { scopes: string[]; prompt?: string }) => Promise<{
    account?: MsalAccount;
    accessToken?: string;
  }>;
  logoutPopup: (request: {
    account: MsalAccount;
    mainWindowRedirectUri?: string;
  }) => Promise<void>;
};

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: CurrentUser | null) {
  if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_USER_KEY);
}

// Loads the MSAL browser SDK on demand. We keep a module-level promise
// so concurrent callers share the same load.
let msalLoadPromise: Promise<MsalCtor | null> | null = null;
function loadMsal(): Promise<MsalCtor | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.msal) return Promise.resolve(window.msal.PublicClientApplication);
  if (msalLoadPromise) return msalLoadPromise;
  msalLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.27.0/lib/msal-browser.min.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.msal?.PublicClientApplication ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return msalLoadPromise;
}

let msalInstancePromise: Promise<MsalInstance> | null = null;
function getMsalInstance(): Promise<MsalInstance> {
  if (msalInstancePromise) return msalInstancePromise;
  msalInstancePromise = (async () => {
    const PublicClientApplication = (await loadMsal()) as MsalCtor | null;
    if (!PublicClientApplication) {
      throw new Error("Microsoft Authentication Library failed to load.");
    }
    const clientId = window.MS_CLIENT_ID || DEFAULT_MS_CLIENT_ID;
    const instance = new PublicClientApplication!({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${MS_TENANT}`,
        redirectUri: typeof window !== "undefined" ? window.location.origin : undefined,
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
      },
    });
    await instance.initialize();
    // Reuse an existing session if the user previously signed in.
    const cached = sessionStorage.getItem("msal.account");
    if (cached) {
      try {
        instance.setActiveAccount(JSON.parse(cached));
      } catch {
        // ignore – active account will be set on next login
      }
    }
    return instance;
  })();
  return msalInstancePromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => readStoredUser());

  useEffect(() => {
    persistUser(currentUser);
  }, [currentUser]);

  // Kept for backward compatibility with any callers that still import
  // these names. They now route to the Microsoft flow so existing UI
  // does not break if it ever references them.
  const signInWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<CurrentUser> => {
      // === DEMO DUMMY CODE START - REMOVABLE ===
      // Demo sign-in: any non-empty password works for demo@syncfusion.com.
      // This is a self-contained demo login that bypasses the Microsoft
      // popup. Search for "REMOVABLE" to find every related block.
      const demoEmail = "demo@syncfusion.com";
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPassword = String(password || "").trim();
      if (cleanEmail === demoEmail && cleanPassword.length > 0) {
        const user: CurrentUser = {
          id: demoEmail,
          email: demoEmail,
          displayName: "Demo User",
          picture: null,
          emailVerified: true,
          provider: "demo",
          isDemoAccount: true,
        };
        setCurrentUser(user);
        return user;
      }
      // === DEMO DUMMY CODE END - REMOVABLE ===
      throw new Error("Email/password sign-in has been removed. Use Microsoft sign-in.");
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    throw new Error("Google sign-in has been removed. Use Microsoft sign-in.");
  }, []);

  const loginWithMicrosoft = useCallback(async (): Promise<CurrentUser> => {
    let instance: MsalInstance;
    try {
      instance = await getMsalInstance();
    } catch (err) {
      throw new Error(
        "Microsoft sign-in is not configured. Set window.MS_CLIENT_ID to your Azure AD application client id."
      );
    }
    let result: { account?: MsalAccount; accessToken?: string };
    try {
      result = await instance.loginPopup({ scopes: MS_SCOPES, prompt: "select_account" });
    } catch (err) {
      const e = err as { errorCode?: string; message?: string };
      if (e?.errorCode === "popup_window_error" || e?.message?.includes("Popup")) {
        throw new Error("Microsoft sign-in popup was blocked or closed.");
      }
      if (e?.errorCode === "user_cancelled" || e?.errorCode === "popup_closed") {
        throw new Error("Microsoft sign-in was cancelled.");
      }
      if (e?.errorCode === "invalid_client" || e?.errorCode === "unauthorized_client") {
        throw new Error(
          "Microsoft sign-in is not configured for this app. Set window.MS_CLIENT_ID to a valid Azure AD client id."
        );
      }
      throw new Error(e?.message || "Microsoft sign-in failed.");
    }

    const account = result?.account;
    if (!account) {
      throw new Error("Microsoft sign-in did not return an account.");
    }
    instance.setActiveAccount(account);
    try {
      sessionStorage.setItem("msal.account", JSON.stringify(account));
    } catch {
      // sessionStorage may be unavailable – non-fatal
    }

    // Pull a richer profile from Microsoft Graph (display name, photo).
    let displayName = account.name || account.username || "";
    let picture: string | null = null;
    let mail = account.username || "";
    try {
      const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${result.accessToken}` },
      });
      if (graphRes.ok) {
        const profile = (await graphRes.json()) as {
          displayName?: string;
          mail?: string;
          userPrincipalName?: string;
        };
        displayName = profile.displayName || displayName;
        mail = profile.mail || profile.userPrincipalName || mail;
      }
    } catch {
      // Non-fatal – the id_token claims are still usable
    }

    const user: CurrentUser = {
      id: account.homeAccountId || account.localAccountId || mail,
      email: mail,
      displayName: displayName || mail,
      picture,
      emailVerified: true,
      provider: "microsoft",
      token: result.accessToken,
    };
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const instance = await getMsalInstance();
      const account = instance.getActiveAccount();
      if (account) {
        await instance.logoutPopup({
          account,
          mainWindowRedirectUri: window.location.origin,
        });
      }
    } catch {
      // Ignore – we still want to clear local state
    }
    try {
      sessionStorage.removeItem("msal.account");
    } catch {
      // ignore
    }
    setCurrentUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      signInWithEmailPassword,
      loginWithGoogle,
      loginWithMicrosoft,
      logout,
    }),
    [currentUser, signInWithEmailPassword, loginWithGoogle, loginWithMicrosoft, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
