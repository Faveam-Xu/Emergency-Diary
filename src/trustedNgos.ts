// PR1-1, trust source A: a fixed list of verified NGO WebIDs.
// The list lives in public/trusted-ngos.json, so it can be changed through a
// reviewed pull request without touching the code.

export type TrustedNgo = { webId: string; name: string };

export type UserRole = "refugee" | "ngo";

const TRUSTED_NGOS_URL = "/trusted-ngos.json";

function isTrustedNgoEntry(value: unknown): value is TrustedNgo {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.webId === "string" &&
    entry.webId.trim() !== "" &&
    typeof entry.name === "string"
  );
}

// Throws if the list cannot be fetched or has the wrong shape, so callers can
// fail closed (treat everyone as a refugee) instead of trusting a broken list.
export async function loadTrustedNgos(): Promise<TrustedNgo[]> {
  const response = await fetch(TRUSTED_NGOS_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Trusted NGO list not available (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();
  const ngos =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).ngos
      : undefined;
  if (!Array.isArray(ngos)) {
    throw new Error("Trusted NGO list has no 'ngos' array.");
  }

  return ngos.filter(isTrustedNgoEntry).map((ngo) => ({
    webId: ngo.webId.trim(),
    name: ngo.name.trim(),
  }));
}

// WebIDs are compared exactly: https://ngo.example/profile/card#me and
// https://ngo.example/profile/card are different identities.
export function isTrustedNgo(
  webId: string | null | undefined,
  trustedNgos: TrustedNgo[],
): boolean {
  if (!webId) return false;
  const id = webId.trim();
  return trustedNgos.some((ngo) => ngo.webId === id);
}

export function roleForWebId(
  webId: string | null | undefined,
  trustedNgos: TrustedNgo[],
): UserRole {
  return isTrustedNgo(webId, trustedNgos) ? "ngo" : "refugee";
}
