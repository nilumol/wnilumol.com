"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlipSetting, FlipState, PageFlip } from "page-flip/dist/js/page-flip.module.js";
import type { BookPage } from "@/content/books/jules-dreams-of-basketball";

const SETTINGS: FlipSetting = {
  width: 600, // square pages (612 x 612 pt source)
  height: 600,
  size: "stretch", // fill .book-stage; the spread's height follows its width
  minWidth: 260, // below 2 x 260 px of stage width the book switches to single-page mode
  maxWidth: 900,
  minHeight: 260,
  maxHeight: 900,
  showCover: true, // page 1 alone, then two-page spreads 2-3, 4-5 ...
  usePortrait: true,
  mobileScrollSupport: true, // vertical page scroll still works over the book on touch screens
  maxShadowOpacity: 0.35,
  flippingTime: 800,
  showPageCorners: true,
  swipeDistance: 30,
};

/** Pages from 2 before to 5 after the open page get an image src; the rest stay unloaded. */
const LOAD_BEHIND = 2;
const LOAD_AHEAD = 5;

type ReaderState = { index: number; portrait: boolean; flipState: FlipState };

function counterLabel({ index, portrait }: ReaderState, total: number) {
  if (index === 0) return "Cover";
  if (portrait) return `Page ${index + 1} of ${total}`;
  const left = index % 2 === 1 ? index : index - 1; // spreads are (1,2), (3,4) ... as 0-based indices
  return `Pages ${left + 1}–${Math.min(left + 2, total)} of ${total}`;
}

/**
 * Builds one page element outside React. page-flip moves, restyles and finally removes these nodes
 * (destroy() deletes its root), so React must never own them: React owns only the empty host div.
 */
function buildLeaf(page: BookPage) {
  const leaf = document.createElement("div");
  leaf.className = "book-page-leaf";
  leaf.setAttribute("role", "group");
  leaf.setAttribute("aria-label", `Page ${page.number}`);
  if (page.number === 1) leaf.dataset.density = "hard";

  const img = document.createElement("img");
  img.dataset.file = `page-${String(page.number).padStart(2, "0")}.webp`;
  img.alt = page.alt; // empty on text pages: their words follow as hidden text
  img.width = 1600;
  img.height = 1600;
  img.decoding = "async";
  img.addEventListener("load", () => {
    img.classList.add("is-loaded");
    leaf.classList.add("is-loaded");
  });
  leaf.appendChild(img);

  const loading = document.createElement("span");
  loading.className = "book-page-loading";
  loading.setAttribute("aria-hidden", "true");
  loading.innerHTML = '<span><span class="spinner"></span>Loading</span>';
  leaf.appendChild(loading);

  if (page.text) {
    const text = document.createElement("div");
    text.className = "visually-hidden";
    text.textContent = page.text;
    leaf.appendChild(text);
  }
  return leaf;
}

function loadWithManagedFrames(instance: PageFlip, leaves: HTMLElement[]) {
  const requestFrame = window.requestAnimationFrame.bind(window);
  const cancelFrame = window.cancelAnimationFrame.bind(window);
  const originalRequest = window.requestAnimationFrame;
  let active = true;
  let frame: number | null = null;
  let started = false;

  const schedule = (callback: FrameRequestCallback): number => {
    frame = requestFrame((time) => {
      frame = null;
      if (!active) return;
      const currentRequest = window.requestAnimationFrame;
      window.requestAnimationFrame = (next) =>
        next === callback ? schedule(next) : currentRequest.call(window, next);
      try {
        callback(time);
      } finally {
        window.requestAnimationFrame = currentRequest;
      }
    });
    return frame;
  };

  const stop = () => {
    active = false;
    if (frame !== null) cancelFrame(frame);
    frame = null;
  };

  window.requestAnimationFrame = (callback) => {
    if (!started) {
      started = true;
      return schedule(callback);
    }
    return originalRequest.call(window, callback);
  };
  try {
    instance.loadFromHTML(leaves);
  } catch (error) {
    stop();
    throw error;
  } finally {
    window.requestAnimationFrame = originalRequest;
  }
  return stop;
}

export function FlipBook({ pages, imageBase }: { pages: BookPage[]; imageBase: string }) {
  const readerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const syncRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<ReaderState>({ index: 0, portrait: false, flipState: "read" });
  const [openingFromDrag, setOpeningFromDrag] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const total = pages.length;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let flip: PageFlip | null = null;
    let block: HTMLDivElement | null = null;
    let stopFrames: (() => void) | null = null;
    let restoreDrag: (() => void) | null = null;

    import("page-flip/dist/js/page-flip.module.js").then(({ PageFlip }) => {
      if (cancelled) return;
      block = document.createElement("div");
      block.className = "book-flip";
      const leaves = pages.map(buildLeaf);
      leaves.forEach((leaf) => block!.appendChild(leaf));
      host.appendChild(block);

      // Phones and small books get the 800 px images; a page wider than ~820 device pixels gets 1600 px.
      const variant = (portrait: boolean) => {
        const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 0;
        const pageCss = portrait ? stageWidth : stageWidth / 2;
        return pageCss * (window.devicePixelRatio || 1) > 820 ? "1600" : "800";
      };
      const loadAround = (index: number, portrait: boolean) => {
        const size = variant(portrait);
        for (let i = Math.max(0, index - LOAD_BEHIND); i <= Math.min(total - 1, index + LOAD_AHEAD); i++) {
          const img = leaves[i].querySelector("img");
          if (!img) continue;
          const src = `${imageBase}/${size}/${img.dataset.file}`;
          // Never downgrade a page that already has its 1600 px image.
          if (img.dataset.loaded === src || img.dataset.loaded?.includes("/1600/")) continue;
          img.dataset.loaded = src;
          img.src = src;
        }
      };

      const instance = new PageFlip(block, SETTINGS);
      flip = instance;
      flipRef.current = instance;
      const sync = (flipState = instance.getState()) => {
        const index = instance.getCurrentPageIndex();
        const portrait = instance.getOrientation() === "portrait";
        setState({ index, portrait, flipState });
        loadAround(index, portrait);
      };
      syncRef.current = () => sync();
      instance.on("flip", () => sync());
      instance.on("changeOrientation", () => sync());
      instance.on("changeState", (e) => {
        if (e.data === "read") setOpeningFromDrag(false);
        sync(e.data);
      });
      stopFrames = loadWithManagedFrames(instance, leaves);
      const controller = instance.getFlipController();
      const stopMove = controller.stopMove;
      controller.stopMove = () => {
        const calculation = controller.getCalculation();
        if (instance.getCurrentPageIndex() === 0 && instance.getOrientation() === "landscape" && calculation && calculation.getPosition().x <= 0) {
          setOpeningFromDrag(true);
        }
        stopMove.call(controller);
      };
      restoreDrag = () => { controller.stopMove = stopMove; };
      sync();
      setReady(true);
    });

    return () => {
      cancelled = true;
      flipRef.current = null;
      syncRef.current = () => {};
      restoreDrag?.();
      stopFrames?.();
      flip?.destroy(); // removes page-flip's own root (the imperative `block`), never React's nodes
      block?.remove();
    };
  }, [pages, imageBase, total]);

  // Arrow keys flip anywhere on the page; Esc closes the in-page full screen fallback.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); flipRef.current?.flipNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); flipRef.current?.flipPrev(); }
      if (e.key === "Escape") setPseudoFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === readerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Resize the book whenever either full screen mode changes its available space.
  const isFullscreen = fullscreen || pseudoFullscreen;
  useEffect(() => {
    document.documentElement.style.overflow = pseudoFullscreen ? "hidden" : "";
    // update() re-measures the book; re-syncing then upgrades page images if the book got bigger.
    const frame = requestAnimationFrame(() => {
      flipRef.current?.update();
      syncRef.current();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.style.overflow = "";
    };
  }, [isFullscreen, pseudoFullscreen]);

  const toggleFullscreen = useCallback(() => {
    const reader = readerRef.current;
    if (!reader) return;
    // The Fullscreen API where available; an in-page overlay on browsers without element full screen (iPhone Safari).
    if (document.fullscreenEnabled && reader.requestFullscreen) {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void reader.requestFullscreen();
    } else {
      setPseudoFullscreen((on) => !on);
    }
  }, []);

  const { index, portrait, flipState } = state;
  const classes = ["book-reader"];
  if (ready) classes.push("is-ready");
  if (!portrait) classes.push("is-landscape");
  // page-flip draws the closed cover on the right half of the spread; center it until a turn starts.
  if (index === 0 && flipState !== "flipping" && !openingFromDrag) classes.push("is-cover");
  if (flipState !== "read") classes.push("is-interacting");
  if (pseudoFullscreen) classes.push("is-pseudo-fullscreen");

  return (
    <section ref={readerRef} className={classes.join(" ")} aria-label="Book reader" aria-roledescription="flip book">
      <div ref={stageRef} className="book-stage">
        <div className="book-frame">
          <div ref={hostRef} className="book-flip-host" />
          {!ready && (
            <p className="book-pending">
              <span className="spinner" aria-hidden="true" />
              Loading book
            </p>
          )}
        </div>
      </div>

      {/* Server-rendered story text for search engines and for readers before the book loads; once the
          interactive book is ready, each page carries its own hidden text instead. */}
      <ol className="visually-hidden" hidden={ready}>
        {pages.map((page) => (
          <li key={page.number}>{page.text || page.alt}</li>
        ))}
      </ol>

      <div className="book-controls">
        <button className="book-btn" type="button" onClick={() => flipRef.current?.flipPrev()} disabled={!ready || index === 0}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          Previous
        </button>
        <p className="book-counter" aria-live="polite">{counterLabel(state, total)}</p>
        <button
          className="book-btn"
          type="button"
          onClick={() => flipRef.current?.flipNext()}
          disabled={!ready || (portrait ? index >= total - 1 : index >= total - 2)}
        >
          Next
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <button className="book-btn book-fullscreen" type="button" onClick={toggleFullscreen}>
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
    </section>
  );
}
