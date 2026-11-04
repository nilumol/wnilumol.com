// page-flip@2.0.7 ships no TypeScript types, and its package.json `main` is the browser bundle (a
// `window.St` global). FlipBook imports the ES module build directly; these are the members it uses.
declare module "page-flip/dist/js/page-flip.module.js" {
  export type FlipOrientation = "portrait" | "landscape";
  export type FlipState = "user_fold" | "fold_corner" | "flipping" | "read";

  export interface FlipSetting {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    showCover?: boolean;
    usePortrait?: boolean;
    mobileScrollSupport?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    showPageCorners?: boolean;
    swipeDistance?: number;
  }

  export interface FlipEvent<T> {
    data: T;
  }

  export class PageFlip {
    constructor(element: HTMLElement, setting: FlipSetting);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on(event: "flip", callback: (e: FlipEvent<number>) => void): PageFlip;
    on(event: "changeOrientation", callback: (e: FlipEvent<FlipOrientation>) => void): PageFlip;
    on(event: "changeState", callback: (e: FlipEvent<FlipState>) => void): PageFlip;
    on(event: "init", callback: (e: FlipEvent<unknown>) => void): PageFlip;
    flipNext(): void;
    flipPrev(): void;
    getCurrentPageIndex(): number;
    getOrientation(): FlipOrientation;
    update(): void;
    destroy(): void;
  }
}
