"use client";

import { useEffect, useState } from "react";

/**
 * Wraps the browser's native SpeechSynthesis API — no library, no network
 * dependency. Renders nothing when unsupported: an absent optional
 * capability degrades the feature, not the page.
 */
export default function SpeechButton({ text, label = "Listen" }: { text: string; label?: string }) {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      aria-pressed={speaking}
      className="text-accent underline text-sm"
      onClick={toggle}
    >
      {speaking ? "Stop" : label}
    </button>
  );
}
