import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// PR1-4: the Content-Security-Policy that Netlify serves from public/_headers.
const headersFile = readFileSync(
  new URL("../public/_headers", import.meta.url),
  "utf8",
);

function policy(): Map<string, string> {
  const line = headersFile
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("Content-Security-Policy-Report-Only:"));
  expect(line, "CSP header line").toBeDefined();
  const value = line!.split(":").slice(1).join(":").trim();
  return new Map(
    value
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...sources] = d.split(/\s+/);
        return [name, sources.join(" ")] as [string, string];
      }),
  );
}

describe("PR1-4 Content-Security-Policy", () => {
  it("applies to every path and is report-only", () => {
    expect(headersFile).toMatch(/^\/\*\s*$/m);
    expect(headersFile).toMatch(/^\s+Content-Security-Policy-Report-Only:/m);
  });

  it("allows only the app's own scripts", () => {
    const script = policy().get("script-src");
    expect(script).toBe("'self'");
  });

  it("never allows inline code or eval", () => {
    expect(headersFile).not.toContain("'unsafe-inline'");
    expect(headersFile).not.toContain("'unsafe-eval'");
  });

  it("limits connections to the app and solidcommunity.net", () => {
    expect(policy().get("connect-src")).toBe(
      "'self' https://solidcommunity.net https://*.solidcommunity.net",
    );
  });

  it("blocks plugins, base-tag changes and framing", () => {
    const p = policy();
    expect(p.get("object-src")).toBe("'none'");
    expect(p.get("base-uri")).toBe("'self'");
    expect(p.get("frame-ancestors")).toBe("'none'");
  });
});
