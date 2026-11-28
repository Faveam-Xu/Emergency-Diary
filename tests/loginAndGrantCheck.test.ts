import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CLIENT_ID, CLIENT_ID_ORIGINS, clientIdFor } from "../src/clientId";
import { checkGrantReadable } from "../src/grantCheck";

const clientDoc = JSON.parse(
  readFileSync(new URL("../public/clientid.jsonld", import.meta.url), "utf8"),
) as { client_id: string; redirect_uris: string[] };

describe("Client ID document used at login", () => {
  it("matches the client ID the app sends", () => {
    expect(clientDoc.client_id).toBe(CLIENT_ID);
  });

  it("lists the /redirect URL of every origin that uses it", () => {
    for (const origin of CLIENT_ID_ORIGINS) {
      expect(clientDoc.redirect_uris).toContain(`${origin}/redirect`);
    }
  });

  it("is used only on those origins", () => {
    expect(clientIdFor("https://emergency-diary-dsip-leiden.netlify.app")).toBe(
      CLIENT_ID,
    );
    expect(clientIdFor("http://localhost:5173")).toBe(CLIENT_ID);
    expect(clientIdFor("http://localhost:4173")).toBeUndefined();
    expect(clientIdFor("https://deploy-preview-1--example.netlify.app")).toBeUndefined();
  });
});

describe("NGO dashboard grant check", () => {
  const url = "https://refugee.example/private/emergency.ttl";
  const reply = (status: number) =>
    vi.fn().mockResolvedValue(new Response(null, { status }));

  it("reads the record with HEAD", async () => {
    const fetchFn = reply(200);
    await checkGrantReadable(url, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(url, { method: "HEAD" });
  });

  it("marks a readable record", async () => {
    expect(await checkGrantReadable(url, reply(200))).toBe("readable");
  });

  it("marks revoked access as failed", async () => {
    expect(await checkGrantReadable(url, reply(403))).toBe("noAccess");
    expect(await checkGrantReadable(url, reply(401))).toBe("noAccess");
  });

  it("marks a missing record as failed", async () => {
    expect(await checkGrantReadable(url, reply(404))).toBe("missing");
  });

  it("marks other failures as failed", async () => {
    expect(await checkGrantReadable(url, reply(500))).toBe("error");
    const offline = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await checkGrantReadable(url, offline)).toBe("error");
  });
});
