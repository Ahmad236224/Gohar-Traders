import React, { Component, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import GoharCRM from "../gohar.jsx";
import { auth, firestore } from "./firebase.js";

const ALLOWED_EMAIL = "goharhumayun@gmail.com";

let cloudWriteQueue = Promise.resolve();

window.storage = {
  async get(key) {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in to load shop data.");

    const reference = doc(firestore, "users", user.uid, "data", key);
    const snapshot = await getDoc(reference);

    if (snapshot.exists()) {
      const cloudRecord = snapshot.data();
      const database = cloudRecord.database ?? cloudRecord.value;
      if (database == null) return null;
      return { value: typeof database === "string" ? database : JSON.stringify(database) };
    }

    // On the first cloud login, copy the existing browser data to Firestore.
    const localValue = window.localStorage.getItem(key);
    if (localValue === null) return null;

    const database = JSON.parse(localValue);
    await setDoc(reference, {
      database,
      migratedFromLocalStorage: true,
      migratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      schemaVersion: 1,
    });

    // Preserve the local record as a recovery backup after migration.
    return { value: localValue };
  },
  async set(key, value) {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in to save shop data.");

    const database = JSON.parse(value);
    const reference = doc(firestore, "users", user.uid, "data", key);

    // Firestore is primary; this local copy is only a recovery backup.
    window.localStorage.setItem(key, value);

    cloudWriteQueue = cloudWriteQueue
      .catch(() => undefined)
      .then(() => setDoc(reference, {
        database,
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
      }, { merge: true }));

    return cloudWriteQueue;
  },
};

function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed":
      return "Could not connect. Check your internet connection.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await signInWithEmailAndPassword(auth, ALLOWED_EMAIL, password);
    } catch (authError) {
      setError(friendlyAuthError(authError));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await sendPasswordResetEmail(auth, ALLOWED_EMAIL);
      setNotice("Password-reset email sent. Check your inbox.");
    } catch (authError) {
      setError(friendlyAuthError(authError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={loginStyles.page}>
      <form style={loginStyles.card} onSubmit={login}>
        <div style={loginStyles.mark}>GT</div>
        <h1 style={loginStyles.title}>Gohar Traders</h1>
        <p style={loginStyles.subtitle}>Sign in to open your shop CRM</p>

        <label style={loginStyles.label}>
          Email
          <input
            style={{ ...loginStyles.input, ...loginStyles.readonly }}
            type="email"
            value={ALLOWED_EMAIL}
            readOnly
            autoComplete="username"
          />
        </label>

        <label style={loginStyles.label}>
          Password
          <input
            style={loginStyles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>

        {error && <div role="alert" style={loginStyles.error}>{error}</div>}
        {notice && <div role="status" style={loginStyles.notice}>{notice}</div>}

        <button style={loginStyles.submit} type="submit" disabled={busy || !password}>
          {busy ? "Please wait…" : "Sign in"}
        </button>
        <button style={loginStyles.reset} type="button" onClick={resetPassword} disabled={busy}>
          Forgot password?
        </button>
      </form>
    </main>
  );
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Gohar Traders failed to render:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={loginStyles.loading}>
          The app could not start. Check your internet connection, then close and reopen it.
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(undefined);
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        setStartupError("Could not connect to Firebase. Check your internet connection and try again.");
        setUser(null);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        settled = true;
        window.clearTimeout(timeout);
        if (nextUser && nextUser.email?.toLowerCase() !== ALLOWED_EMAIL) {
          await signOut(auth);
          setUser(null);
          return;
        }
        setUser(nextUser);
      },
      () => {
        settled = true;
        window.clearTimeout(timeout);
        setStartupError("Firebase could not start. Check your internet connection and reopen the app.");
        setUser(null);
      },
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  if (user === undefined) {
    return <div style={loginStyles.loading}>Checking your session…</div>;
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        {startupError && <div role="alert" style={loginStyles.startupError}>{startupError}</div>}
      </>
    );
  }

  return (
    <>
      <GoharCRM />
      <button className="logout-btn" style={loginStyles.logout} onClick={() => signOut(auth)}>
        Sign out
      </button>
    </>
  );
}

const loginStyles = {
  page: {
    minHeight: "100vh", display: "grid", placeItems: "center", padding: 20,
    background: "linear-gradient(145deg, #edf7f0, #d8ebde)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    width: "100%", maxWidth: 390, background: "#fff", border: "1px solid #d8ebde",
    borderRadius: 18, padding: 28, boxShadow: "0 18px 50px rgba(15,61,38,.12)",
  },
  mark: {
    width: 52, height: 52, margin: "0 auto 12px", display: "grid", placeItems: "center",
    borderRadius: 14, background: "#166534", color: "#fff", fontWeight: 800, fontSize: 19,
  },
  title: { margin: 0, textAlign: "center", color: "#0f3d26", fontSize: 26 },
  subtitle: { margin: "6px 0 24px", textAlign: "center", color: "#5b6e63", fontSize: 14 },
  label: { display: "grid", gap: 6, marginTop: 14, color: "#34483d", fontSize: 13, fontWeight: 700 },
  input: {
    width: "100%", border: "1px solid #c8dfd0", borderRadius: 9, padding: "11px 12px",
    fontSize: 15, outlineColor: "#22a05b", boxSizing: "border-box",
  },
  readonly: { background: "#f4f8f5", color: "#5b6e63" },
  error: { marginTop: 14, padding: 10, borderRadius: 8, background: "#fff1ed", color: "#9a3412", fontSize: 13 },
  notice: { marginTop: 14, padding: 10, borderRadius: 8, background: "#edf7f0", color: "#166534", fontSize: 13 },
  submit: {
    width: "100%", marginTop: 18, border: 0, borderRadius: 9, padding: 12,
    background: "#166534", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
  },
  reset: {
    width: "100%", marginTop: 10, border: 0, background: "transparent", color: "#166534",
    fontWeight: 700, fontSize: 13, cursor: "pointer",
  },
  loading: {
    minHeight: "100vh", display: "grid", placeItems: "center", color: "#166534",
    fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: 700,
  },
  logout: {
    position: "fixed", right: 18, top: 16, zIndex: 20, border: "1px solid #d8ebde",
    borderRadius: 8, padding: "8px 12px", background: "#fff", color: "#166534",
    fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,61,38,.12)",
  },
  startupError: {
    position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)",
    width: "calc(100% - 32px)", maxWidth: 500, boxSizing: "border-box",
    padding: "11px 14px", borderRadius: 9, background: "#fff1ed", color: "#9a3412",
    border: "1px solid #fed7cc", textAlign: "center", fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: 13, boxShadow: "0 5px 18px rgba(154,52,18,.12)",
  },
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
