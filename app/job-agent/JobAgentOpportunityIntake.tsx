"use client";

import { useEffect, useState } from "react";
import type { JobAgentLedgerEntry } from "@/scripts/job-agent/types";
import {
  clearTailorPassphrase,
  onTailorPassphraseChange,
  readJobAgentError,
  readStoredTailorPassphrase,
  storeTailorPassphrase,
} from "./job-agent-client";

export function JobAgentOpportunityIntake({
  onAdded,
}: {
  onAdded: (entry: JobAgentLedgerEntry) => void;
}) {
  const [url, setUrl] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [hasStoredPassphrase, setHasStoredPassphrase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    function syncPassphrase() {
      const stored = readStoredTailorPassphrase() ?? "";
      setPassphrase(stored);
      setHasStoredPassphrase(Boolean(stored));
    }
    syncPassphrase();
    return onTailorPassphraseChange(syncPassphrase);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedUrl = url.trim();
    const submittedPassphrase = passphrase.trim();
    if (!submittedUrl) {
      setMessage({ kind: "error", text: "Paste a job-posting URL first." });
      return;
    }
    if (!submittedPassphrase) {
      setMessage({ kind: "error", text: "Enter the Tailor passphrase to add an opportunity." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/job-agent/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tailor-Passphrase": submittedPassphrase,
        },
        body: JSON.stringify({ url: submittedUrl }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          clearTailorPassphrase();
          setPassphrase("");
          setHasStoredPassphrase(false);
        }
        throw new Error(await readJobAgentError(response, "Couldn't add this opportunity."));
      }

      const data = (await response.json()) as { entry: JobAgentLedgerEntry };
      storeTailorPassphrase(submittedPassphrase);
      setPassphrase(submittedPassphrase);
      setHasStoredPassphrase(true);
      setUrl("");
      onAdded(data.entry);
      setMessage({ kind: "success", text: `${data.entry.title} at ${data.entry.company} was added.` });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Couldn't add this opportunity.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="job-agent-intake" onSubmit={handleSubmit}>
      <div className="job-agent-intake-copy">
        <strong>Add an opportunity</strong>
        <span>Paste a Greenhouse, Lever, or Ashby posting URL. Nothing is submitted for you.</span>
      </div>
      <div className={`job-agent-intake-fields${hasStoredPassphrase ? " job-agent-intake-fields-unlocked" : ""}`}>
        <label className="job-agent-intake-url">
          <span>Job-posting URL</span>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://jobs…"
            autoComplete="url"
            disabled={busy}
          />
        </label>
        {!hasStoredPassphrase ? (
          <label className="job-agent-intake-passphrase">
            <span>Passphrase</span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </label>
        ) : null}
        <button type="submit" className="job-agent-btn job-agent-btn-primary" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          {busy ? "Adding" : "Add"}
        </button>
      </div>
      {message ? (
        <p className={`job-agent-intake-message job-agent-intake-message-${message.kind}`} role="status">
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
