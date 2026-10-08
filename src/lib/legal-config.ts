// Legal notice and privacy policy of the instance (MAIR-292). The chart passes global.legal as
// LEGAL_CONFIG (JSON, Devops/Deploiment); it is read at request time, so one image serves every
// mairie. The retention periods and subprocessors repeat the mairie's decisions of
// compliance/<org>/ (MAIR-294), checked by Deploiment's CI. Missing values are shown as to be
// completed, never invented.

export const LEGAL_NOTICE_PATH = "/mentions-legales";
export const PRIVACY_POLICY_PATH = "/confidentialite";
export const TO_COMPLETE = "À compléter par la mairie";

export type Subprocessor = { name: string; location: string; purpose: string };
export type LegalConfig = {
  mairie: { name: string; address: string; email: string };
  publicationDirector: string;
  dpo: { name: string; email: string };
  host: { name: string; address: string };
  retention: Array<{ label: string; period: string }>;
  subprocessors: Subprocessor[];
  /** false when LEGAL_CONFIG is missing or not valid JSON: the pages say so. */
  configured: boolean;
};

// Data whose retention the privacy policy states, in its order, with the keys of
// compliance/<org>/retention.yaml.
const RETENTION_LABELS: Array<[string, string]> = [
  ["sessions", "Sessions de connexion"],
  ["connection_logs", "Journal des connexions"],
  ["access_logs", "Journal des accès aux données"],
  ["users_audit_log", "Historique des modifications des comptes"],
  ["archived_accounts_anonymization", "Comptes archivés, avant leur anonymisation"],
  ["technical_logs", "Journaux techniques"],
];

const UNITS: Record<string, [string, string]> = {
  day: ["jour", "jours"],
  month: ["mois", "mois"],
  year: ["an", "ans"],
};

/** "6 months" -> "6 mois", "1 year" -> "1 an"; anything else is shown as given. */
export function frenchPeriod(period: string): string {
  const match = /^(\d+) (day|month|year)s?$/.exec(period.trim());
  if (!match) return period.trim();
  const count = Number(match[1]);
  const [one, many] = UNITS[match[2]];
  return `${count} ${count > 1 ? many : one}`;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function readLegalConfig(raw: string | undefined = process.env.LEGAL_CONFIG): LegalConfig {
  let parsed: Record<string, unknown> = {};
  let configured = false;
  if (raw?.trim()) {
    try {
      parsed = record(JSON.parse(raw));
      configured = true;
    } catch {
      configured = false;
    }
  }
  const mairie = record(parsed.mairie);
  const dpo = record(parsed.dpo);
  const host = record(parsed.host);
  const retention = record(parsed.retention);
  return {
    mairie: { name: text(mairie.name), address: text(mairie.address), email: text(mairie.email) },
    publicationDirector: text(parsed.publicationDirector),
    dpo: { name: text(dpo.name), email: text(dpo.email) },
    host: { name: text(host.name), address: text(host.address) },
    retention: RETENTION_LABELS.filter(([key]) => text(retention[key])).map(([key, label]) => ({
      label,
      period: frenchPeriod(text(retention[key])),
    })),
    subprocessors: (Array.isArray(parsed.subprocessors) ? parsed.subprocessors : [])
      .map(record)
      .map((s) => ({ name: text(s.name), location: text(s.location), purpose: text(s.purpose) }))
      .filter((s) => s.name),
    configured,
  };
}

/** The value, or the mention that the mairie must complete it. */
export const orToComplete = (value: string): string => value || TO_COMPLETE;
