"use client";

import { createContext, useContext } from "react";

// How the library is being viewed: by Alexandra (editable, links from "/"),
// or through the view-only link (read only, links under /s/<code>).
export type ViewMode = { readOnly: boolean; base: string };

const ViewModeContext = createContext<ViewMode>({ readOnly: false, base: "" });

export function ViewModeProvider({ mode, children }: { mode: ViewMode; children: React.ReactNode }) {
  return <ViewModeContext.Provider value={mode}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
