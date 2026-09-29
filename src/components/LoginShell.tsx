"use client";

import { AppShell, type AppShellProps } from "@mairie360/lib-components";
import type { ReactNode } from "react";

type LoginShellProps = {
  hrefs: AppShellProps["hrefs"];
  children: ReactNode;
};

/** Keep the shared navigation visible before authentication without inventing a session. */
export default function LoginShell({ hrefs, children }: LoginShellProps) {
  return (
    <AppShell activeItem="login" hrefs={hrefs}>
      {children}
    </AppShell>
  );
}
