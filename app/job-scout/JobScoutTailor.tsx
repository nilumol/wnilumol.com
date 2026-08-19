"use client";

import { useEffect, useState } from "react";
import type { TailorSuggestion } from "@/scripts/job-scout/tailor-types";
import type { JobScoutLedgerEntry } from "@/scripts/job-scout/types";

const PASSPHRASE_STORAGE_KEY = "job-scout-tailor-passphrase";
const AUTH_ERROR = "job-scout-tailor-auth-error";

function entryKey(entry: JobScoutLedgerEntry): string {
  return `${entry.source}:${entry.id}`;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const data: { error?: string } | null = await response.json().catch(() => null);
  return data?.error ?? fallback;
}

export function JobScoutTailor({ entries }: { entries: JobScoutLedgerEntry[] }) {
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
      <p className="job-scout-placeholder">
        Nothing here yet — select jobs in Opportunities and send them forward.
      </p>
    );
  }

  if (passphrase === null) {
    return (
      <form className="job-scout-tailor-gate" onSubmit={handleUnlock}>
        <div className="job-scout-tailor-gate-copy">
          <strong>This section calls a paid API — enter your passphrase once to use it.</strong>
          <span>Locked by default since this page has no login, just an unlisted URL.</span>
        </div>
        <div className="job-scout-tailor-gate-form">
          <input
            type="password"
            value={passphraseInput}
            onChange={(event) => setPassphraseInput(event.target.value)}
            placeholder="Passphrase"
            autoComplete="off"
          />
          <button type="submit" className="job-scout-btn job-scout-btn-primary">
            Unlock
          </button>
        </div>
        {gateError ? <p className="job-scout-tailor-gate-error">{gateError}</p> : null}
      </form>
    );
  }

  return (
    <div className="job-scout-tailor-cards">
      {entries.map((entry) => (
        <TailorCard key={entryKey(entry)} entry={entry} passphrase={passphrase} onAuthError={handleAuthError} />
      ))}
    </div>
  );
}

function TailorCard({
  entry,
  passphrase,
  onAuthError,
}: {
  entry: JobScoutLedgerEntry;
  passphrase: string;
  onAuthError: () => void;
}) {
  const [suggestions, setSuggestions] = useState<TailorSuggestion[] | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
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
      jobTitle: entry.title,
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

  async function handleTailor() {
    setLoadingSuggestions(true);
    setError(null);
    try {
      const response = await callTailorApi("/api/job-scout/tailor/suggestions", {
        source: entry.source,
        id: entry.id,
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "Couldn't generate suggestions."));
      const data: { suggestions: TailorSuggestion[] } = await response.json();
      setSuggestions(data.suggestions);
      setCheckedIds(new Set(data.suggestions.map((suggestion) => suggestion.id)));
    } catch (err) {
      reportError(err);
    } finally {
      setLoadingSuggestions(false);
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

  async function handleView() {
    setError(null);
    try {
      const response = await callTailorApi("/api/job-scout/tailor/preview", renderPayload());
      if (!response.ok) throw new Error(await readErrorMessage(response, "Couldn't build the preview."));
      const html = await response.text();
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      reportError(err);
    }
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    setError(null);
    try {
      const response = await callTailorApi("/api/job-scout/tailor/pdf", renderPayload());
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
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="job-scout-tailor-card">
      <div className="job-scout-tailor-card-head">
        <h3>{entry.title}</h3>
        <p>
          {entry.company} · {entry.location ?? "Not listed"}
        </p>
      </div>

      {suggestions === null ? (
        <button
          type="button"
          className="job-scout-btn job-scout-btn-primary"
          onClick={handleTailor}
          disabled={loadingSuggestions}
        >
          {loadingSuggestions ? "Generating…" : "Tailor This Resume"}
        </button>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <p className="job-scout-placeholder">
              Nothing worth changing for this posting — your resume already fits well.
            </p>
          ) : (
            <ul className="job-scout-suggestion-list">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} className="job-scout-suggestion-item">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(suggestion.id)}
                    onChange={(event) => toggleSuggestion(suggestion.id, event.target.checked)}
                    aria-label={suggestion.type === "reorder" ? "Reorder suggestion" : "New phrasing suggestion"}
                  />
                  <div className="job-scout-suggestion-body">
                    <span className={`job-scout-suggestion-type job-scout-suggestion-type-${suggestion.type}`}>
                      {suggestion.type === "reorder" ? "Reorder" : "New phrasing"}
                    </span>
                    <div className="job-scout-suggestion-text">
                      {suggestion.type === "reorder"
                        ? `Reorder ${suggestion.target === "highlights" ? "career highlights" : `${suggestion.target} bullets`}.`
                        : suggestion.text}
                    </div>
                    <div className="job-scout-suggestion-rationale">{suggestion.rationale}</div>
                    {suggestion.type === "new-phrasing" ? (
                      <div className="job-scout-suggestion-grounded">Grounded in: {suggestion.groundedIn}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <textarea
            className="job-scout-tailor-own-text"
            placeholder="Add your own notes or content — this is your writing, not AI-generated, and only applies to this one generated file."
            value={ownText}
            onChange={(event) => setOwnText(event.target.value)}
          />

          <div className="job-scout-tailor-actions">
            <button type="button" className="job-scout-btn" onClick={handleView}>
              View
            </button>
            <button
              type="button"
              className="job-scout-btn job-scout-btn-primary"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? "Generating…" : "Generate PDF"}
            </button>
          </div>
        </>
      )}

      {error ? <p className="job-scout-tailor-error">{error}</p> : null}
    </div>
  );
}
