import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function install() {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
    else setDismissed(true);
  }

  return (
    <div className="install-banner">
      <span>Install Asset Tracker on your device for quick access</span>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="install-btn" onClick={install}>Install</button>
        <button className="install-dismiss" onClick={() => setDismissed(true)}>✕</button>
      </div>
    </div>
  );
}
