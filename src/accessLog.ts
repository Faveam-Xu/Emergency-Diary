import * as $rdf from "rdflib";
import { universalAccess } from "@inrupt/solid-client";
import { solidFetch } from "./auth";

export const ACCESS_LOG_NS = "http://example.org/ns/access#";
const ACCESS_LOG_DIR = "private/access-log/";
const OLD_ACCESS_LOG_FILE = "private/ngo-access-log.ttl";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

export type LogAction = "Read" | "Grant" | "Revoke";
export type LogOutcome =
  | "Attempt"
  | "Success"
  | "Failed"
  | "Denied"
  | "NotFound";

export type NgoLogSummary = {
  lastSuccess: string;
  failedCount: number;
  lastGrant: string;
  lastRevoke: string;
  oldFormatViewed: boolean;
};

function ensureSlash(base: string): string {
  return base.endsWith("/") ? base : base + "/";
}

function safeIri(value: string): string {
  const href = new URL(value).href;
  if (/[<>"{}\s\\^`|]/.test(href)) {
    throw new Error("Unsafe IRI: " + value);
  }
  return href;
}

export function getNgoLogUrl(podBaseUrl: string, ngoWebId: string): string {
  const url = new URL(ngoWebId);
  const name = (url.host + url.pathname + url.hash).replace(
    /[^a-zA-Z0-9]/g,
    "-",
  );
  return ensureSlash(podBaseUrl) + ACCESS_LOG_DIR + name + ".ttl";
}

export function getOldAccessLogUrl(podBaseUrl: string): string {
  return ensureSlash(podBaseUrl) + OLD_ACCESS_LOG_FILE;
}

export function outcomeFromStatus(status: number): LogOutcome {
  if (status >= 200 && status < 300) return "Success";
  if (status === 401 || status === 403) return "Denied";
  if (status === 404) return "NotFound";
  return "Failed";
}

async function sendPatch(logUrl: string, inserts: string): Promise<Response> {
  const patch = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix acc: <${ACCESS_LOG_NS}>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
_:patch a solid:InsertDeletePatch;
  solid:inserts {
${inserts}
  }.
`;
  return solidFetch(logUrl, {
    method: "PATCH",
    headers: { "Content-Type": "text/n3" },
    body: patch,
  });
}

export async function ensureNgoLogExists(logUrl: string): Promise<void> {
  const res = await sendPatch(logUrl, "    <#log> a acc:AccessLog.");
  if (!res.ok) {
    throw new Error(`Could not create access log (${res.status})`);
  }
}

export async function appendLogEntry(
  logUrl: string,
  agentWebId: string,
  action: LogAction,
  outcome: LogOutcome,
  targetUrl: string,
  status?: number,
): Promise<boolean> {
  try {
    const entryId = "#e-" + crypto.randomUUID();
    let statusLine = "";
    if (status) {
      statusLine = `\n      acc:status ${Math.floor(status)};`;
    }
    const inserts = `    <${entryId}> a acc:Entry;
      acc:agent <${safeIri(agentWebId)}>;
      acc:action acc:${action};
      acc:outcome acc:${outcome};
      acc:target <${safeIri(targetUrl)}>;${statusLine}
      acc:at "${new Date().toISOString()}"^^xsd:dateTime.`;

    const res = await sendPatch(logUrl, inserts);
    if (!res.ok) {
      console.error("Could not write access log entry", res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Could not write access log entry", e);
    return false;
  }
}

function emptySummary(): NgoLogSummary {
  return {
    lastSuccess: "",
    failedCount: 0,
    lastGrant: "",
    lastRevoke: "",
    oldFormatViewed: false,
  };
}

async function loadNgoLogSummary(
  podBaseUrl: string,
  ngoWebId: string,
): Promise<NgoLogSummary> {
  const summary = emptySummary();
  const logUrl = getNgoLogUrl(podBaseUrl, ngoWebId);

  const res = await solidFetch(logUrl);
  if (!res.ok) {
    return summary;
  }
  const text = await res.text();

  const store = $rdf.graph();
  $rdf.parse(text, store, logUrl, "text/turtle");

  const entries = store.each(
    undefined,
    $rdf.sym(RDF_TYPE),
    $rdf.sym(ACCESS_LOG_NS + "Entry"),
  );

  for (const entry of entries) {
    const node = entry as $rdf.NamedNode;
    const action = store.any(node, $rdf.sym(ACCESS_LOG_NS + "action"));
    const outcome = store.any(node, $rdf.sym(ACCESS_LOG_NS + "outcome"));
    const at = store.any(node, $rdf.sym(ACCESS_LOG_NS + "at"));
    if (!action || !outcome || !at) continue;

    const actionName = action.value.replace(ACCESS_LOG_NS, "");
    const outcomeName = outcome.value.replace(ACCESS_LOG_NS, "");
    const time = at.value;

    if (actionName === "Read" && outcomeName === "Success") {
      if (time > summary.lastSuccess) summary.lastSuccess = time;
    } else if (
      actionName === "Read" &&
      outcomeName !== "Attempt" &&
      outcomeName !== "Success"
    ) {
      summary.failedCount = summary.failedCount + 1;
    } else if (actionName === "Grant") {
      if (time > summary.lastGrant) summary.lastGrant = time;
    } else if (actionName === "Revoke") {
      if (time > summary.lastRevoke) summary.lastRevoke = time;
    }
  }

  return summary;
}

async function loadOldViewedNgos(
  podBaseUrl: string,
): Promise<Record<string, boolean>> {
  const fileUrl = getOldAccessLogUrl(podBaseUrl);
  const res = await solidFetch(fileUrl);
  if (!res.ok) {
    return {};
  }
  const text = await res.text();

  const store = $rdf.graph();
  $rdf.parse(text, store, fileUrl, "text/turtle");

  const map: Record<string, boolean> = {};
  const statements = store.statementsMatching(
    null,
    $rdf.sym(ACCESS_LOG_NS + "viewedBy"),
    null,
  );
  for (const st of statements) {
    map[st.object.value] = true;
  }
  return map;
}

export async function loadNgoLogSummaries(
  podBaseUrl: string,
  ngoWebIds: string[],
): Promise<Record<string, NgoLogSummary>> {
  let oldViewed: Record<string, boolean> = {};
  try {
    oldViewed = await loadOldViewedNgos(podBaseUrl);
  } catch (e) {
    console.warn("Could not read old access log", e);
  }

  const result: Record<string, NgoLogSummary> = {};
  for (const ngo of ngoWebIds) {
    let summary = emptySummary();
    try {
      summary = await loadNgoLogSummary(podBaseUrl, ngo);
    } catch (e) {
      console.warn("Could not read access log for NGO", e);
    }
    summary.oldFormatViewed = !!oldViewed[ngo];
    result[ngo] = summary;
  }
  return result;
}

export async function upgradeOldAccessLog(
  podBaseUrl: string,
  ngoWebIds: string[],
): Promise<void> {
  const oldLogUrl = getOldAccessLogUrl(podBaseUrl);

  for (const ngo of ngoWebIds) {
    try {
      const access = await universalAccess.getAgentAccess(oldLogUrl, ngo, {
        fetch: solidFetch,
      });
      if (!access || (!access.write && !access.append)) continue;

      const ngoLogUrl = getNgoLogUrl(podBaseUrl, ngo);
      await ensureNgoLogExists(ngoLogUrl);
      await universalAccess.setAgentAccess(
        ngoLogUrl,
        ngo,
        { read: false, append: true, write: false },
        { fetch: solidFetch },
      );
      await universalAccess.setAgentAccess(
        oldLogUrl,
        ngo,
        { read: false, append: false, write: false },
        { fetch: solidFetch },
      );
    } catch (e) {
      console.warn("Could not upgrade old access log for NGO", e);
    }
  }
}
