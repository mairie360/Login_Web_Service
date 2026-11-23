"use client";

import { createContext, useContext, type ReactNode } from "react";
import { brandLine } from "./brand-line";

const InstanceBrand = createContext<string>(brandLine(undefined));

/** Provided once by the root layout, which reads the instance configuration on the server (MAIR-1102). */
export function InstanceBrandProvider({ line, children }: { line: string; children: ReactNode }) {
  return <InstanceBrand.Provider value={line}>{children}</InstanceBrand.Provider>;
}

/** The commune line of the card, « Espace agents et élus » outside a provider. */
export const useInstanceBrand = () => useContext(InstanceBrand);
