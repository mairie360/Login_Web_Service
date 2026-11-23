/** Audience line under the logo of every public card (MAIR-1102, mock-up « Marque de la commune »). */
export const BRAND_AUDIENCE = "espace agents et élus";

/**
 * « Mairie de <commune> · espace agents et élus » from the name of the instance (`LEGAL_CONFIG.mairie.name`,
 * the configuration the chart passes): a name already starting with « Mairie », « Commune » or « Ville » is kept
 * as it is; without a name the line is the audience alone, never an invented commune. Server-safe: the root
 * layout computes it and hands it to `InstanceBrandProvider`.
 */
export function brandLine(mairieName: string | undefined): string {
  const name = mairieName?.trim() ?? "";
  if (!name) return BRAND_AUDIENCE.charAt(0).toUpperCase() + BRAND_AUDIENCE.slice(1);
  const mairie = /^(mairie|commune|ville)\b/i.test(name) ? name : `Mairie de ${name}`;
  return `${mairie} · ${BRAND_AUDIENCE}`;
}
