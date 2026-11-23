import {
  universalAccess,
  getSolidDataset,
  saveSolidDatasetAt,
  createSolidDataset,
  setThing,
  createThing,
  buildThing,
  getThing,
  removeThing,
} from "@inrupt/solid-client";

import { solidFetch } from "./auth";
import { type AppLanguage, tr } from "./i18n";
import {
  getNgoLogUrl,
  getOldAccessLogUrl,
  ensureNgoLogExists,
  appendLogEntry,
} from "./accessLog";

const EMERGENCY_FILE = "public/emergency.ttl";
const NGO_INDEX_FILE = "public/refugeesGranted.ttl";
const EX = "https://example.org/ns#";

function ensureSlash(base: string): string {
  return base.endsWith("/") ? base : base + "/";
}

function getEmergencyFileUrl(podBaseUrl: string): string {
  const base = ensureSlash(podBaseUrl);
  return base + EMERGENCY_FILE;
}

function getNgoIndexFileUrl(ngoPodBase: string): string {
  const base = ensureSlash(ngoPodBase);
  return base + NGO_INDEX_FILE;
}

export function getPodBaseFromWebId(webId: string): string | null {
  try {
    const withoutFragment = webId.split("#")[0];
    const url = new URL(withoutFragment);

    if (url.pathname.startsWith("/profile/")) {
      return `${url.origin}/`;
    }

    return `${url.origin}/`;
  } catch {
    console.warn("Could not parse WebID as URL:", webId);
    return null;
  }
}

function isValidWebId(webId: string): boolean {
  if (!webId) return false;
  if (!webId.startsWith("http")) return false;
  if (webId.includes(" ")) return false;

  try {
    new URL(webId);
  } catch {
    return false;
  }

  if (!webId.includes("/profile/")) return false;

  return true;
}

async function appendRefugeeToNgoIndex(
  ngoWebId: string,
  ngoPodBase: string,
  refugeeWebId: string,
  emergencyFileUrl: string,
): Promise<void> {
  const indexUrl = getNgoIndexFileUrl(ngoPodBase);

  let dataset;
  try {
    dataset = await getSolidDataset(indexUrl, { fetch: solidFetch });
  } catch {
    dataset = createSolidDataset();
  }

  const now = new Date().toISOString();

  const entry = buildThing(createThing({ url: refugeeWebId }))
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", EX + "Grant")
    .addUrl(EX + "ngo", ngoWebId)
    .addUrl(EX + "emergencyFile", emergencyFileUrl)
    .addStringNoLocale(EX + "grantedAt", now)
    .build();

  const updated = setThing(dataset, entry);
  await saveSolidDatasetAt(indexUrl, updated, { fetch: solidFetch });
}

async function removeRefugeeFromNgoIndex(
  ngoPodBase: string,
  refugeeWebId: string,
): Promise<void> {
  const indexUrl = getNgoIndexFileUrl(ngoPodBase);

  let dataset;
  try {
    dataset = await getSolidDataset(indexUrl, { fetch: solidFetch });
  } catch {
    return;
  }

  const existing = getThing(dataset, refugeeWebId);
  if (!existing) {
    return;
  }

  const updated = removeThing(dataset, existing);
  await saveSolidDatasetAt(indexUrl, updated, { fetch: solidFetch });
}

export async function makeEmergencyPublic(podBaseUrl: string): Promise<void> {
  const emergencyFileUrl = getEmergencyFileUrl(podBaseUrl);

  await universalAccess.setPublicAccess(
    emergencyFileUrl,
    { read: true, append: false, write: false },
    { fetch: solidFetch },
  );
}

export async function makeEmergencyPrivate(podBaseUrl: string): Promise<void> {
  const emergencyFileUrl = getEmergencyFileUrl(podBaseUrl);

  await universalAccess.setPublicAccess(
    emergencyFileUrl,
    { read: false, append: false, write: false },
    { fetch: solidFetch },
  );
}

export async function getEmergencyAccess(
  podBaseUrl: string,
): Promise<{ isPublic: boolean }> {
  const fileUrl = getEmergencyFileUrl(podBaseUrl);
  try {
    const publicAccess = await universalAccess.getPublicAccess(fileUrl, {
      fetch: solidFetch,
    });
    return { isPublic: !!publicAccess?.read };
  } catch (err) {
    console.warn("Failed to read public access for", fileUrl, err);
    return { isPublic: false };
  }
}

export async function grantAccessToSelectedNGOs(
  ngoWebIds: string[],
  refugeePodBase: string,
  refugeeWebId: string,
  language: AppLanguage,
): Promise<void> {
  if (!ngoWebIds.length) {
    throw new Error("No NGOs selected.");
  }

  const invalid = ngoWebIds.filter((id) => !isValidWebId(id));
  if (invalid.length > 0) {
    throw new Error(
      `${tr(
        language,
        "Cannot grant access. These are not valid NGO WebIDs:",
        "ተበጻሕነት ፍቓድ የለን። እዚ ትኽክለኛ መፍለዩ ዌብ መረዳእታ ዘይመንግስታዊ ትካል ኣይኮነን፡",
        "无法授权。这些不是有效的 NGO WebID：",
      )} ${invalid.join(", ")}`,
    );
  }

  const emergencyFileUrl = getEmergencyFileUrl(refugeePodBase);
  const failed: string[] = [];

  for (const ngoWebId of ngoWebIds) {
    const ngoLogUrl = getNgoLogUrl(refugeePodBase, ngoWebId);
    try {
      await universalAccess.setAgentAccess(
        emergencyFileUrl,
        ngoWebId,
        { read: true, append: false, write: false },
        { fetch: solidFetch },
      );

      await ensureNgoLogExists(ngoLogUrl);
      await universalAccess.setAgentAccess(
        ngoLogUrl,
        ngoWebId,
        { read: false, append: true, write: false },
        { fetch: solidFetch },
      );

      const ngoPodBase = getPodBaseFromWebId(ngoWebId);
      if (ngoPodBase) {
        try {
          await appendRefugeeToNgoIndex(
            ngoWebId,
            ngoPodBase,
            refugeeWebId,
            emergencyFileUrl,
          );
          console.log("Granted access to NGO", ngoWebId);
          await appendLogEntry(
            ngoLogUrl,
            refugeeWebId,
            "Grant",
            "Success",
            emergencyFileUrl,
          );
        } catch (e) {
          try {
            await universalAccess.setAgentAccess(
              emergencyFileUrl,
              ngoWebId,
              { read: false, append: false, write: false },
              { fetch: solidFetch },
            );
            await universalAccess.setAgentAccess(
              ngoLogUrl,
              ngoWebId,
              { read: false, append: false, write: false },
              { fetch: solidFetch },
            );
          } catch (rollbackErr) {
            console.error(
              "Error rolling back access for NGO",
              ngoWebId,
              rollbackErr,
            );
          }
          throw e;
        }
      }
    } catch (e) {
      console.error("Error granting access to NGO", ngoWebId, e);
      failed.push(ngoWebId);
    }
  }

  if (failed.length > 0) {
    throw new Error(
      `${tr(
        language,
        "Could not grant access for:",
        "ተበጻሕነት ፍቓድ ኣይተውሃበን ን:",
        "无法为以下对象授权：",
      )} ${failed.join(", ")}. ${tr(
        language,
        "Check that these WebIDs exist and that the pods are reachable.",
        "እዞም መፍለይ ዌብ ከምዘለዉን እቶም ፖድስ ክርከቡ ዝኽእል ምዃኖምን ኣረጋግጽ።",
        "请确认这些 WebID 存在，并且 Pod 可以访问。",
      )}`,
    );
  }
}

export async function revokeAccessFromSelectedNGOs(
  ngoWebIds: string[],
  refugeePodBase: string,
  refugeeWebId: string,
): Promise<void> {
  const emergencyFileUrl = getEmergencyFileUrl(refugeePodBase);
  const oldLogUrl = getOldAccessLogUrl(refugeePodBase);

  for (const ngoWebId of ngoWebIds) {
    const ngoLogUrl = getNgoLogUrl(refugeePodBase, ngoWebId);

    await universalAccess.setAgentAccess(
      emergencyFileUrl,
      ngoWebId,
      {
        read: false,
        append: false,
        write: false,
      },
      { fetch: solidFetch },
    );

    await ensureNgoLogExists(ngoLogUrl);
    await universalAccess.setAgentAccess(
      ngoLogUrl,
      ngoWebId,
      {
        read: false,
        append: false,
        write: false,
      },
      { fetch: solidFetch },
    );

    try {
      await universalAccess.setAgentAccess(
        oldLogUrl,
        ngoWebId,
        { read: false, append: false, write: false },
        { fetch: solidFetch },
      );
    } catch {
      console.warn("No old access log to update");
    }

    await appendLogEntry(
      ngoLogUrl,
      refugeeWebId,
      "Revoke",
      "Success",
      emergencyFileUrl,
    );

    const ngoPodBase = getPodBaseFromWebId(ngoWebId);
    if (ngoPodBase) {
      try {
        await removeRefugeeFromNgoIndex(ngoPodBase, refugeeWebId);
      } catch (e) {
        console.error("Error removing refugee from NGO index", ngoWebId, e);
      }
    }
  }
}
