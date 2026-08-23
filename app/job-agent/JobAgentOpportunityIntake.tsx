"use client";

import { useState } from "react";
import type { JobAgentLedgerEntry } from "@/scripts/job-agent/types";
import { readJobAgentError } from "./job-agent-client";

export function JobAgentOpportunityIntake({
  onAdded,
}: {
  onAdded: (entry: JobAgentLedgerEntry) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedUrl = url.trim();
    if (!submittedUrl) {
      setMessage({ kind: "error", text: "Paste a job-posting URL first." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/job-agent/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: submittedUrl }),
      });
      if (!response.ok) {
        throw new Error(await readJobAgentError(response, "Couldn't add this opportunity."));
      }

      const data = (await response.json()) as { entry: JobAgentLedgerEntry };
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
      <div className="job-agent-intake-fields">
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
