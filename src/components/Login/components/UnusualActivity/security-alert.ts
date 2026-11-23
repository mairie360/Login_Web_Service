/** A use of the agent's session from another device, read right after the sign-in (MAIR-773). */
export type SecurityAlert = {
  id: number;
  level: "certain" | "possible";
  ipAddress: string | null;
  deviceInfo: string | null;
  createdAt: string;
};

/**
 * The beginning of an address, as the alert shows it: `92.184.xxx.xxx` for IPv4, the first three groups of an IPv6
 * address (`2001:db8:85a3:xxxx::`), « Inconnue » otherwise.
 */
export function maskIpAddress(ip: string | null | undefined): string {
  const value = (ip ?? "").trim();
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(value);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.xxx.xxx`;
  if (value.includes(":")) {
    const groups = value.split("::")[0].split(":").filter(Boolean).slice(0, 3);
    if (groups.length > 0 && groups.every((group) => /^[0-9a-f]{1,4}$/i.test(group))) return `${groups.join(":")}:xxxx::`;
  }
  return "Inconnue";
}

/** Reads the pending alert of the session the Login just opened; `null` when there is none or it cannot be read. */
export async function fetchPendingAlert(): Promise<SecurityAlert | null> {
  try {
    const response = await fetch("/api/security-alert", { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as { alert?: SecurityAlert | null };
    return body.alert ?? null;
  } catch {
    return null;
  }
}

/** Marks the alert read. A failure is ignored: the alert shows again at the next sign-in. */
export async function acknowledgeAlert(id: number): Promise<void> {
  try {
    await fetch("/api/security-alert/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });
  } catch {
    // The next sign-in shows the alert again.
  }
}
