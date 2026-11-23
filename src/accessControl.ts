import { isTrustedNgo, loadTrustedNgos } from "./trustedNgos";
import {
  universalAccess,
  getSolidDataset,
  saveSolidDatasetAt,
  createSolidDataset,
  createContainerAt,
  setThing,
  createThing,
  buildThing,
  getResourceInfoWithAcl,
  hasAccessibleAcl,
  hasResourceAcl,
  hasFallbackAcl,
  getResourceAcl,
  createAcl,
  createAclFromFallbackAcl,
  saveAclFor,
  setAgentDefaultAccess,
} from "@inrupt/solid-client";

import { solidFetch } from "./auth";
import { type AppLanguage, tr } from "./i18n";
import {
  getNgoLogUrl,
  getOldAccessLogUrl,
  ensureNgoLogExists,
  appendLogEntry,
} from "./accessLog";

const PRIVATE_CONTAINER = "private/";
const EVIDENCE_CONTAINER = "private/evidence/";
const EMERGENCY_FILE = "private/emergency.ttl";
const NGO_INDEX_FILE = "public/refugeesGranted.ttl";
const EX = "https://example.org/ns#";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const ACL = {
  Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
  agent: "http://www.w3.org/ns/auth/acl#agent",
  agentClass: "http://www.w3.org/ns/auth/acl#agentClass",
  AuthenticatedAgent: "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
  accessTo: "http://www.w3.org/ns/auth/acl#accessTo",
  default: "http://www.w3.org/ns/auth/acl#default",
  mode: "http://www.w3.org/ns/auth/acl#mode",
  Read: "http://www.w3.org/ns/auth/acl#Read",
  Write: "http://www.w3.org/ns/auth/acl#Write",
  Append: "http://www.w3.org/ns/auth/acl#Append",
  Control: "http://www.w3.org/ns/auth/acl#Control",
};
const FOAF_AGENT = "http://xmlns.com/foaf/0.1/Agent";

function ensureSlash(base: string): string {
  return base.endsWith("/") ? base : base + "/";
}

function getEmergencyFileUrl(podBaseUrl: string): string {
  const base = ensureSlash(podBaseUrl);
  return base + EMERGENCY_FILE;
}

function getPrivateContainerUrl(podBaseUrl: string): string {
  return ensureSlash(podBaseUrl) + PRIVATE_CONTAINER;
}

function getEvidenceContainerUrl(podBaseUrl: string): string {
  return ensureSlash(podBaseUrl) + EVIDENCE_CONTAINER;
}

function getNgoIndexFileUrl(ngoPodBase: string): string {
  const base = ensureSlash(ngoPodBase);
  return base + NGO_INDEX_FILE;
}

async function loadAccessibleResource(resourceUrl: string) {
  const resourceInfo = await getResourceInfoWithAcl(resourceUrl, {
    fetch: solidFetch,
  });
  if (!hasAccessibleAcl(resourceInfo)) {
    throw new Error(
      `No Control access to ${resourceUrl}; cannot manage its permissions.`,
    );
  }
  return resourceInfo;
}

function buildAuthorization(
  name: string,
  resourceUrl: string,
  options: {
    agent?: string;
    agentClass?: string;
    modes: string[];
    includeDefault?: boolean;
  },
) {
  let thing = buildThing(createThing({ name }))
    .addUrl(RDF_TYPE, ACL.Authorization)
    .addUrl(ACL.accessTo, resourceUrl);

  if (options.includeDefault) {
    thing = thing.addUrl(ACL.default, resourceUrl);
  }
  if (options.agent) {
    thing = thing.addUrl(ACL.agent, options.agent);
  }
  if (options.agentClass) {
    thing = thing.addUrl(ACL.agentClass, options.agentClass);
  }
  for (const mode of options.modes) {
    thing = thing.addUrl(ACL.mode, mode);
  }

  return thing.build();
}

/**
 * Replaces a resource's ACL with a single owner-only rule. Used for the
 * private container itself, where no other agent should ever have access.
 */
async function applyOwnerOnlyAcl(
  resourceUrl: string,
  ownerWebId: string,
  recursive: boolean,
): Promise<void> {
  const resourceInfo = await loadAccessibleResource(resourceUrl);
  const aclDataset = createAcl(resourceInfo);

  const ownerRule = buildAuthorization("owner", resourceUrl, {
    agent: ownerWebId,
    modes: [ACL.Read, ACL.Write, ACL.Control],
    includeDefault: recursive,
  });

  await saveAclFor(resourceInfo, setThing(aclDataset, ownerRule), {
    fetch: solidFetch,
  });
}

/**
 * Creates (if needed) the refugee's private container and locks it to the
 * owner before any diary, photo or NGO-list data is ever written into it, so
 * that data is never briefly public while being saved (PR0-2).
 */
export async function ensurePrivateContainer(
  podBaseUrl: string,
  ownerWebId: string,
): Promise<void> {
  const containerUrl = getPrivateContainerUrl(podBaseUrl);

  try {
    await getSolidDataset(containerUrl, { fetch: solidFetch });
  } catch {
    await createContainerAt(containerUrl, { fetch: solidFetch });
  }
  await applyOwnerOnlyAcl(containerUrl, ownerWebId, true);

  const evidenceUrl = getEvidenceContainerUrl(podBaseUrl);
  try {
    await getSolidDataset(evidenceUrl, { fetch: solidFetch });
  } catch {
    await createContainerAt(evidenceUrl, { fetch: solidFetch });
  }
}

/**
 * Finds the URL of a resource's ACL document via its `Link: rel="acl"`
 * response header, rather than guessing a `.acl` suffix.
 */
async function getAclUrlForResource(resourceUrl: string): Promise<string> {
  const response = await solidFetch(resourceUrl);
  if (!response.ok) {
    throw new Error(
      `Could not fetch ${resourceUrl} to locate its ACL: ${response.status} ${response.statusText}`,
    );
  }

  const linkHeader = response.headers.get("link");
  if (!linkHeader) {
    throw new Error(`No Link header on ${resourceUrl}; cannot locate its ACL.`);
  }

  const aclLinkPart = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => /rel\s*=\s*"?acl"?/.test(part));
  const urlMatch = aclLinkPart?.match(/<([^>]*)>/);
  if (!urlMatch) {
    throw new Error(
      `No rel="acl" Link header on ${resourceUrl}; cannot locate its ACL.`,
    );
  }

  return new URL(urlMatch[1], resourceUrl).toString();
}

/**
 * Locks the NGO inbox down so any logged-in user may only append new grant
 * or revocation entries, and only the NGO itself can read or overwrite it
 * (PR0-1).
 *
 * This issues a raw HTTP PUT that replaces the ACL resource's entire body,
 * rather than going through solid-client's createAcl()/saveAclFor(). Those
 * build an ACL dataset whose source IRI already matches the ACL resource, so
 * solid-client saves it as a changelog-only PATCH (INSERT of the new rules
 * only) instead of a full PUT - which merges the new owner/AuthenticatedAgent
 * rules into whatever public rules are already on the server rather than
 * replacing them. A PUT of a complete Turtle document is the only way to
 * guarantee any pre-existing foaf:Agent / acl:default rules left over from
 * an older, public ACL are actually gone, not just added to.
 */
export async function secureNgoInbox(
  indexUrl: string,
  ownerWebId: string,
): Promise<void> {
  const aclUrl = await getAclUrlForResource(indexUrl);

  const turtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.

<#owner>
    a acl:Authorization;
    acl:accessTo <${indexUrl}>;
    acl:agent <${ownerWebId}>;
    acl:mode acl:Read, acl:Write, acl:Control.

<#loggedInAppendOnly>
    a acl:Authorization;
    acl:accessTo <${indexUrl}>;
    acl:agentClass acl:AuthenticatedAgent;
    acl:mode acl:Append.
`;

  const putResponse = await solidFetch(aclUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: turtle,
  });
  if (!putResponse.ok) {
    throw new Error(
      `Failed to overwrite ACL at ${aclUrl}: ${putResponse.status} ${putResponse.statusText}`,
    );
  }

  const verifyResponse = await solidFetch(aclUrl);
  if (!verifyResponse.ok) {
    throw new Error(
      `Could not re-read ACL at ${aclUrl} to verify it after overwriting it: ${verifyResponse.status} ${verifyResponse.statusText}`,
    );
  }
  const verifyBody = await verifyResponse.text();
  if (verifyBody.includes(FOAF_AGENT)) {
    throw new Error(
      `ACL at ${aclUrl} still grants access to foaf:Agent after being overwritten; refusing to report the inbox as secured.`,
    );
  }
}

/**
 * Ensures the NGO inbox file exists and always (re)applies the secure ACL
 * from `secureNgoInbox`, regardless of whether the file already existed.
 * Inboxes created by older versions of this app (or tampered with while an
 * old public read/write ACL was in effect) must have their ACL overwritten
 * too, not just newly-created ones - `secureNgoInbox` builds a brand new ACL
 * dataset from scratch, so this always strips any lingering public/foaf:Agent
 * rule along the way.
 */
export async function ensureSecureNgoInbox(
  indexUrl: string,
  ownerWebId: string,
): Promise<{ created: boolean }> {
  let created = false;
  try {
    await getSolidDataset(indexUrl, { fetch: solidFetch });
  } catch {
    const emptyDataset = createSolidDataset();
    await saveSolidDatasetAt(indexUrl, emptyDataset, { fetch: solidFetch });
    created = true;
  }

  await secureNgoInbox(indexUrl, ownerWebId);
  return { created };
}

/**
 * Grants (or revokes, with `access: null`) an NGO default read access to the
 * refugee's evidence photos. Needed because the evidence folder sits
 * alongside the diary file rather than beneath it, so a grant on the diary
 * does not by itself cover the photos it links to.
 */
async function setEvidenceAccessForAgent(
  podBaseUrl: string,
  agentWebId: string,
  read: boolean,
): Promise<void> {
  const folderUrl = getEvidenceContainerUrl(podBaseUrl);
  const resourceInfo = await loadAccessibleResource(folderUrl);

  const aclDataset = hasResourceAcl(resourceInfo)
    ? getResourceAcl(resourceInfo)
    : hasFallbackAcl(resourceInfo)
      ? createAclFromFallbackAcl(resourceInfo)
      : createAcl(resourceInfo);

  const updated = setAgentDefaultAccess(aclDataset, agentWebId, {
    read,
    append: false,
    write: false,
    control: false,
  });

  await saveAclFor(resourceInfo, updated, { fetch: solidFetch });
}

async function insertN3Patch(
  url: string,
  insertedTurtle: string,
): Promise<void> {
  const body = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n\n_:patch a solid:InsertDeletePatch;\n  solid:inserts {\n${insertedTurtle}\n  }.\n`;

  const response = await solidFetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "text/n3" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to append entry to ${url}: ${response.status} ${response.statusText}`,
    );
  }
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

/**
 * Appends a single Grant event to the NGO's append-only inbox via an
 * insert-only N3 Patch, so the refugee never needs Read or Write access to
 * the inbox - only Append (see `secureNgoInbox`).
 */
async function appendRefugeeToNgoIndex(
  ngoWebId: string,
  ngoPodBase: string,
  refugeeWebId: string,
  emergencyFileUrl: string,
): Promise<void> {
  const indexUrl = getNgoIndexFileUrl(ngoPodBase);
  const eventNode = `${indexUrl}#grant-${Date.now()}`;
  const now = new Date().toISOString();

  const triples = `    <${eventNode}> a <${EX}Grant> ;
      <${EX}refugee> <${refugeeWebId}> ;
      <${EX}ngo> <${ngoWebId}> ;
      <${EX}emergencyFile> <${emergencyFileUrl}> ;
      <${EX}grantedAt> "${now}" .`;

  await insertN3Patch(indexUrl, triples);
}

/**
 * Appends a Revocation event for this refugee to the NGO's inbox, rather
 * than deleting the earlier Grant entry, since the refugee only has Append
 * access to that file. `loadNgoGrants` resolves the latest event per
 * refugee to decide whether access currently stands.
 */
async function removeRefugeeFromNgoIndex(
  ngoPodBase: string,
  refugeeWebId: string,
): Promise<void> {
  const indexUrl = getNgoIndexFileUrl(ngoPodBase);
  const eventNode = `${indexUrl}#revoke-${Date.now()}`;
  const now = new Date().toISOString();

  const triples = `    <${eventNode}> a <${EX}Revocation> ;
      <${EX}refugee> <${refugeeWebId}> ;
      <${EX}revokedAt> "${now}" .`;

  await insertN3Patch(indexUrl, triples);
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

  // PR1-1: grant access only to NGOs on the trusted NGO list. If the list
  // cannot be loaded, grant to nobody (fail closed). Revoking is not limited,
  // so access can always be taken back.
  const trustedNgos = await loadTrustedNgos().catch((err: unknown) => {
    console.warn("Trusted NGO list unavailable; no access granted.", err);
    throw new Error(
      tr(
        language,
        "Cannot grant access: the list of verified NGOs could not be loaded. Please try again later.",
        "ተበጻሕነት ፍቓድ ኣይተውሃበን፡ ዝርዝር ዝተረጋገጹ ዘይመንግስታዊ ትካላት ክጽዓን ኣይከኣለን። ደሓር ደጊምካ ፈትን።", // ti: unverified, needs native-speaker check
        "无法授权：无法加载已验证机构列表。请稍后再试。",
      ),
    );
  });

  const unverified = ngoWebIds.filter((id) => !isTrustedNgo(id, trustedNgos));
  if (unverified.length > 0) {
    throw new Error(
      `${tr(
        language,
        "Cannot grant access. These are not verified NGOs:",
        "ተበጻሕነት ፍቓድ ኣይተውሃበን። እዞም ዝተረጋገጹ ዘይመንግስታዊ ትካላት ኣይኮኑን፡", // ti: unverified, needs native-speaker check
        "无法授权。以下不是已验证的机构：",
      )} ${unverified.join(", ")}`,
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

      await setEvidenceAccessForAgent(refugeePodBase, ngoWebId, true);

      const ngoPodBase = getPodBaseFromWebId(ngoWebId);
      if (ngoPodBase) {
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
      }
    } catch (e) {
      console.error("Error granting access to NGO", ngoWebId, e);
      failed.push(ngoWebId);
      // A failed grant must not leave any access behind: undo the record,
      // access-log and evidence rules, each on its own so one failure does
      // not skip the rest.
      for (const url of [emergencyFileUrl, ngoLogUrl]) {
        try {
          await universalAccess.setAgentAccess(
            url,
            ngoWebId,
            { read: false, append: false, write: false },
            { fetch: solidFetch },
          );
        } catch (rollbackErr) {
          console.error("Error rolling back access for NGO", ngoWebId, url, rollbackErr);
        }
      }
      try {
        await setEvidenceAccessForAgent(refugeePodBase, ngoWebId, false);
      } catch (rollbackErr) {
        console.error("Error rolling back evidence access for NGO", ngoWebId, rollbackErr);
      }
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
      await setEvidenceAccessForAgent(refugeePodBase, ngoWebId, false);
    } catch (e) {
      console.error("Error revoking evidence access for NGO", ngoWebId, e);
    }

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

// PR1-1: every agent (other than the owner) that can currently read the
// emergency record, so the refugee always sees, and can revoke, every NGO with
// access, even one missing from their saved NGO list or no longer verified.
export async function getAgentsWithRecordAccess(
  podBaseUrl: string,
  ownerWebId: string | null,
): Promise<string[]> {
  const fileUrl = getEmergencyFileUrl(podBaseUrl);
  try {
    const all = await universalAccess.getAgentAccessAll(fileUrl, {
      fetch: solidFetch,
    });
    if (!all) return [];
    return Object.entries(all)
      .filter(([agent, access]) => access.read && agent !== ownerWebId)
      .map(([agent]) => agent);
  } catch (err) {
    console.warn("Could not read who has access to the record", err);
    return [];
  }
}
