// Inbox entries are written by the refugee's app and can't be removed from the
// append-only inbox (PR0-1), so an entry may stay after the refugee revoked
// access or the record moved. The NGO dashboard therefore lists a grant as
// working only if the record can actually be read now; otherwise it is shown
// as failed (technical plan, Table 6: "Fake grants in the inbox").
export type GrantReadStatus = "readable" | "noAccess" | "missing" | "error";

export async function checkGrantReadable(
  emergencyFileUrl: string,
  fetchFn: typeof fetch,
): Promise<GrantReadStatus> {
  try {
    const res = await fetchFn(emergencyFileUrl, { method: "HEAD" });
    if (res.ok) return "readable";
    if (res.status === 401 || res.status === 403) return "noAccess";
    if (res.status === 404) return "missing";
    return "error";
  } catch {
    return "error";
  }
}
