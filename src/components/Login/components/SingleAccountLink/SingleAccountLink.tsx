export interface SingleAccountLinkProps {
  href: string;
  disabled: boolean;
}

/** "ou" separator and the Keycloak single account sign-in. */
export const SingleAccountLink = ({ href, disabled }: SingleAccountLinkProps) => (
  <>
    <p aria-hidden="true" className="flex w-full items-center gap-3 text-sm text-[var(--mairie-muted)] before:h-px before:flex-1 before:bg-[var(--mairie-border)] after:h-px after:flex-1 after:bg-[var(--mairie-border)]">ou</p>
    <a
      href={href}
      aria-disabled={disabled || undefined}
      onClick={(event) => { if (disabled) event.preventDefault(); }}
      className="flex w-full justify-center rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] px-3 py-2 text-sm font-semibold text-[var(--mairie-accent)] shadow-sm transition hover:bg-[var(--mairie-background)] focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
    >
      Se connecter avec le compte unique
    </a>
  </>
);
