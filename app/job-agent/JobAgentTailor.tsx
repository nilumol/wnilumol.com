"use client";

import { useEffect, useState } from "react";
import type { TailorSuggestion } from "@/scripts/job-agent/tailor-types";
import type { JobAgentLedgerEntry } from "@/scripts/job-agent/types";

const PASSPHRASE_STORAGE_KEY = "job-agent-tailor-passphrase";
const AUTH_ERROR = "job-agent-tailor-auth-error";

function entryKey(entry: JobAgentLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const data: { error?: string } | null = await response.json().catch(() => null);
  return data?.error ?? fallback;
}

export function JobAgentTailor({ entries }: { entries: JobAgentLedgerEntry[] }) {
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    setPassphrase(sessionStorage.getItem(PASSPHRASE_STORAGE_KEY));
  }, []);

  function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = passphraseInput.trim();
    if (!trimmed) {
      setGateError("Enter a passphrase.");
      return;
    }
    setGateError(null);
    sessionStorage.setItem(PASSPHRASE_STORAGE_KEY, trimmed);
    setPassphrase(trimmed);
  }

  function handleAuthError() {
    sessionStorage.removeItem(PASSPHRASE_STORAGE_KEY);
    setPassphrase(null);
    setPassphraseInput("");
    setGateError("That's not it — try again.");
  }

  if (entries.length === 0) {
    return (
      <p className="job-agent-placeholder">
        Nothing here yet — select jobs in Opportunities and send them forward.
      </p>
    );
  }

  if (passphrase === null) {
    return (
      <form className="job-agent-tailor-gate" onSubmit={handleUnlock}>
        <div className="job-agent-tailor-gate-copy">
          <strong>This section calls a paid API — enter your passphrase once to use it.</strong>
          <span>Locked by default since this page has no login, just an unlisted URL.</span>
        </div>
        <div className="job-agent-tailor-gate-form">
          <input
            type="password"
            value={passphraseInput}
            onChange={(event) => setPassphraseInput(event.target.value)}
            placeholder="Passphrase"
            autoComplete="off"
          />
          <button type="submit" className="job-agent-btn job-agent-btn-primary">
            Unlock
          </button>
        </div>
        {gateError ? <p className="job-agent-tailor-gate-error">{gateError}</p> : null}
      </form>
    );
  }

  return (
    <div className="job-agent-tailor-cards">
      {entries.map((entry) => (
        <TailorCard key={entryKey(entry)} entry={entry} passphrase={passphrase} onAuthError={handleAuthError} />
      ))}
    </div>
  );
}

type BusyAction = "tailor" | "revise" | "review" | "pdf" | null;

/** Standard spinner treatment for any action with real processing time - see CLAUDE.md's Design System section. */
function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

function TailorCard({
  entry,
  passphrase,
  onAuthError,
}: {
  entry: JobAgentLedgerEntry;
  passphrase: string;
  onAuthError: () => void;
}) {
  const [suggestions, setSuggestions] = useState<TailorSuggestion[] | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BusyAction>(null);
  const [ownText, setOwnText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function callTailorApi(path: string, body: unknown): Promise<Response> {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tailor-Passphrase": passphrase },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      onAuthError();
      throw new Error(AUTH_ERROR);
    }
    return response;
  }

  function acceptedSuggestions(): TailorSuggestion[] {
    return (suggestions ?? []).filter((suggestion) => checkedIds.has(suggestion.id));
  }

  function renderPayload() {
    return {
      company: entry.company,
      keywordFamily: entry.keywordFamily,
      acceptedSuggestions: acceptedSuggestions(),
      ownText,
    };
  }

  function reportError(err: unknown) {
    if (err instanceof Error && err.message === AUTH_ERROR) return;
    setError(err instanceof Error ? err.message : "Something went wrong.");
  }

  function applySuggestionResponse(data: { suggestions: TailorSuggestion[] }) {
    setSuggestions(data.suggestions);
    setCheckedIds(new Set(data.suggestions.map((suggestion) => suggestion.id)));
  }

  async function handleTailor() {
    setBusy("tailor");
    setError(null);
    try {
      const response = await callTailorApi("/api/job-agent/tailor/suggestions", {
        source: entry.source,
        id: entry.id,
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "Couldn't generate suggestions."));
      applySuggestionResponse(await response.json());
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(null);
    }
  }

  function toggleSuggestion(id: string, checked: boolean) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /**
   * Sends the free-text notes plus every suggestion's current accepted/rejected state back to
   * the suggestion-generation route so the model can produce a revised set incorporating the
   * captain's own corrections. This is the only other place (besides "Tailor This Resume") that
   * makes a real Anthropic API call - Review and Generate PDF below never do.
   */
  async function handleRevise() {
    setBusy("revise");
    setError(null);
    try {
      const response = await callTailorApi("/api/job-agent/tailor/suggestions", {
        source: entry.source,
        id: entry.id,
        revision: {
          priorSuggestions: (suggestions ?? []).map((suggestion) => ({
            suggestion,
            accepted: checkedIds.has(suggestion.id),
          })),
          notes: ownText,
        },
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "Couldn't revise suggestions."));
      applySuggestionResponse(await response.json());
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(null);
    }
  }

  async function handleReview() {
    setBusy("review");
    setError(null);
    try {
      const response = await callTailorApi("/api/job-agent/tailor/preview", renderPayload());
      if (!response.ok) throw new Error(await readErrorMessage(response, "Couldn't build the preview."));
      const html = await response.text();
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(null);
    }
  }

  async function handleGeneratePdf() {
    setBusy("pdf");
    setError(null);
    try {
      const response = await callTailorApi("/api/job-agent/tailor/pdf", renderPayload());
      if (!response.ok) throw new Error(await readErrorMessage(response, "Couldn't generate the PDF."));
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "Winston Nilumol_Resume.pdf";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="job-agent-tailor-card">
      <div className="job-agent-tailor-card-head">
        <h3>{entry.title}</h3>
        <p>
          {entry.company} · {entry.location ?? "Not listed"}
        </p>
        <a className="text-link" href={entry.absoluteUrl} target="_blank" rel="noreferrer">
          Open application
        </a>
      </div>

      {suggestions === null ? (
        <button
          type="button"
          className="job-agent-btn job-agent-btn-primary"
          onClick={handleTailor}
          disabled={busy !== null}
        >
          {busy === "tailor" ? <Spinner /> : null}
          {busy === "tailor" ? "Tailoring…" : "Tailor This Resume"}
        </button>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <p className="job-agent-placeholder">
              Nothing worth changing for this posting — your resume already fits well.
            </p>
          ) : (
            <ul className="job-agent-suggestion-list">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} className="job-agent-suggestion-item">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(suggestion.id)}
                    onChange={(event) => toggleSuggestion(suggestion.id, event.target.checked)}
                    aria-label={suggestion.type === "reorder" ? "Reorder suggestion" : "New phrasing suggestion"}
                  />
                  <div className="job-agent-suggestion-body">
                    <span className={`job-agent-suggestion-type job-agent-suggestion-type-${suggestion.type}`}>
                      {suggestion.type === "reorder" ? "Reorder" : "New phrasing"}
                    </span>
                    <div className="job-agent-suggestion-text">
                      {suggestion.type === "reorder"
                        ? `Reorder ${suggestion.target === "highlights" ? "career highlights" : `${suggestion.target} bullets`}.`
                        : suggestion.text}
                    </div>
                    <div className="job-agent-suggestion-rationale">{suggestion.rationale}</div>
                    {suggestion.type === "new-phrasing" ? (
                      <div className="job-agent-suggestion-grounded">Grounded in: {suggestion.groundedIn}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <textarea
            className="job-agent-tailor-own-text"
            placeholder="Add your own notes or content — this is your writing, not AI-generated, and only applies to this one generated file."
            value={ownText}
            onChange={(event) => setOwnText(event.target.value)}
          />

          <div className="job-agent-tailor-revise-row">
            <button type="button" className="job-agent-btn" onClick={handleRevise} disabled={busy !== null}>
              {busy === "revise" ? <Spinner /> : null}
              {busy === "revise" ? "Revising…" : "Revise"}
            </button>
          </div>

          <div className="job-agent-tailor-actions">
            <button type="button" className="job-agent-btn" onClick={handleReview} disabled={busy !== null}>
              {busy === "review" ? <Spinner /> : null}
              {busy === "review" ? "Reviewing…" : "Review"}
            </button>
            <button
              type="button"
              className="job-agent-btn job-agent-btn-primary"
              onClick={handleGeneratePdf}
              disabled={busy !== null}
            >
              {busy === "pdf" ? <Spinner /> : null}
              {busy === "pdf" ? "Generating…" : "Generate PDF"}
            </button>
          </div>
        </>
      )}

      {error ? <p className="job-agent-tailor-error">{error}</p> : null}
    </div>
  );
}
