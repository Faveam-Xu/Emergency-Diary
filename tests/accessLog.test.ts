import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  solidFetch: vi.fn(),
  setAgentAccess: vi.fn(),
  getAgentAccess: vi.fn(),
  getResourceInfoWithAcl: vi.fn(),
  saveAclFor: vi.fn(),
}));

vi.mock('../src/auth', () => ({ solidFetch: mocks.solidFetch }));
vi.mock('@inrupt/solid-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@inrupt/solid-client')>();
  return {
    ...actual,
    getResourceInfoWithAcl: mocks.getResourceInfoWithAcl,
    hasAccessibleAcl: () => true,
    hasResourceAcl: () => true,
    getResourceAcl: () => ({}),
    setAgentDefaultAccess: (acl: unknown) => acl,
    saveAclFor: mocks.saveAclFor,
    universalAccess: {
      ...actual.universalAccess,
      setAgentAccess: mocks.setAgentAccess,
      getAgentAccess: mocks.getAgentAccess,
    },
  };
});

import {
  appendLogEntry,
  getNgoLogUrl,
  loadNgoLogSummaries,
  outcomeFromStatus,
  upgradeOldAccessLog,
} from '../src/accessLog';
import { grantAccessToSelectedNGOs, revokeAccessFromSelectedNGOs } from '../src/accessControl';

const listJson = readFileSync(new URL('../public/trusted-ngos.json', import.meta.url), 'utf8');
const NGO_N = 'https://ml-ngo-n.solidcommunity.net/profile/card#me';
const OTHER_NGO = 'https://other-ngo.solidcommunity.net/profile/card#me';
const REFUGEE_A = 'https://ml-refugee-a.solidcommunity.net/profile/card#me';
const REFUGEE_POD = 'https://ml-refugee-a.solidcommunity.net/';
const RECORD = `${REFUGEE_POD}private/emergency.ttl`;
const NGO_LOG = `${REFUGEE_POD}private/access-log/ml-ngo-n-solidcommunity-net-profile-card-me.ttl`;
const OLD_LOG = `${REFUGEE_POD}private/ngo-access-log.ttl`;

function patchBodies(): string[] {
  return mocks.solidFetch.mock.calls
    .filter(([, init]) => init && init.method === 'PATCH')
    .map(([, init]) => init.body as string);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(listJson, { status: 200 })));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.solidFetch.mockReset().mockResolvedValue(new Response(null, { status: 205 }));
  mocks.setAgentAccess.mockReset().mockResolvedValue(null);
  mocks.getAgentAccess.mockReset();
  mocks.getResourceInfoWithAcl.mockReset().mockResolvedValue({});
  mocks.saveAclFor.mockReset().mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('log file per NGO', () => {
  it('builds one file name per NGO WebID under private/access-log/', () => {
    expect(getNgoLogUrl(REFUGEE_POD, NGO_N)).toBe(NGO_LOG);
    expect(getNgoLogUrl(REFUGEE_POD, OTHER_NGO)).not.toBe(NGO_LOG);
  });

  it('maps HTTP status codes to outcomes', () => {
    expect(outcomeFromStatus(200)).toBe('Success');
    expect(outcomeFromStatus(401)).toBe('Denied');
    expect(outcomeFromStatus(403)).toBe('Denied');
    expect(outcomeFromStatus(404)).toBe('NotFound');
    expect(outcomeFromStatus(500)).toBe('Failed');
    expect(outcomeFromStatus(0)).toBe('Failed');
  });
});

describe('writing an entry', () => {
  it('sends an insert-only N3 PATCH, never PUT, deletes or where', async () => {
    const ok = await appendLogEntry(NGO_LOG, NGO_N, 'Read', 'Success', RECORD, 200);
    expect(ok).toBe(true);
    const [url, init] = mocks.solidFetch.mock.calls[0];
    expect(url).toBe(NGO_LOG);
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('text/n3');
    expect(init.body).toContain('solid:inserts');
    expect(init.body).not.toContain('solid:deletes');
    expect(init.body).not.toContain('solid:where');
    expect(init.body).toContain(`acc:agent <${NGO_N}>`);
    expect(init.body).toContain('acc:outcome acc:Success');
    expect(init.body).toContain('acc:status 200');
  });

  it('gives every entry a different id', async () => {
    await appendLogEntry(NGO_LOG, NGO_N, 'Read', 'Attempt', RECORD);
    await appendLogEntry(NGO_LOG, NGO_N, 'Read', 'Attempt', RECORD);
    const ids = patchBodies().map((b) => b.match(/<#e-[^>]+>/)?.[0]);
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('returns false when the server refuses', async () => {
    mocks.solidFetch.mockResolvedValue(new Response(null, { status: 403 }));
    expect(await appendLogEntry(NGO_LOG, NGO_N, 'Read', 'Attempt', RECORD)).toBe(false);
  });

  it('cannot be used to inject extra triples through an IRI', async () => {
    const bad = 'https://evil.example/x> . <#e> <p> "o';
    expect(await appendLogEntry(NGO_LOG, bad, 'Read', 'Attempt', RECORD)).toBe(true);
    const body = patchBodies()[0];
    expect(body).toContain('acc:agent <https://evil.example/x%3E%20.%20%3C#e%3E%20%3Cp%3E%20%22o>');
    expect(body).not.toContain('<#e>');

    mocks.solidFetch.mockClear();
    const braces = 'https://evil.example/x#a}} <#e> <p> <o>. {';
    expect(await appendLogEntry(NGO_LOG, braces, 'Read', 'Attempt', RECORD)).toBe(false);
    expect(mocks.solidFetch).not.toHaveBeenCalled();
  });
});

describe('grant and revoke', () => {
  it('gives the NGO append only on its own log and logs the grant', async () => {
    await grantAccessToSelectedNGOs([NGO_N], REFUGEE_POD, REFUGEE_A, 'en');
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(
      NGO_LOG, NGO_N, { read: false, append: true, write: false }, expect.anything(),
    );
    const writes = mocks.setAgentAccess.mock.calls.filter(([, , access]) => access.write);
    expect(writes).toEqual([]);
    expect(patchBodies().some((b) => b.includes('acc:action acc:Grant'))).toBe(true);
  });

  it('removes all log rights on revoke and logs the revoke', async () => {
    await revokeAccessFromSelectedNGOs([NGO_N], REFUGEE_POD, REFUGEE_A);
    const none = { read: false, append: false, write: false };
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(NGO_LOG, NGO_N, none, expect.anything());
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(OLD_LOG, NGO_N, none, expect.anything());
    expect(patchBodies().some((b) => b.includes('acc:action acc:Revoke'))).toBe(true);
  });
});

describe('old shared log', () => {
  it('moves an NGO with write on the old log to its own append-only log', async () => {
    mocks.getAgentAccess.mockResolvedValue({ read: true, append: true, write: true });
    await upgradeOldAccessLog(REFUGEE_POD, [NGO_N]);
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(
      NGO_LOG, NGO_N, { read: false, append: true, write: false }, expect.anything(),
    );
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(
      OLD_LOG, NGO_N, { read: false, append: false, write: false }, expect.anything(),
    );
  });

  it('leaves NGOs without rights on the old log alone', async () => {
    mocks.getAgentAccess.mockResolvedValue({ read: false, append: false, write: false });
    await upgradeOldAccessLog(REFUGEE_POD, [NGO_N]);
    expect(mocks.setAgentAccess).not.toHaveBeenCalled();
  });
});

describe('what the refugee sees', () => {
  const NS = 'http://example.org/ns/access#';
  const XSD = 'http://www.w3.org/2001/XMLSchema#';
  const ngoLog = `
@prefix acc: <${NS}>.
@prefix xsd: <${XSD}>.
<#e1> a acc:Entry; acc:action acc:Read; acc:outcome acc:Success; acc:at "2026-11-20T10:00:00Z"^^xsd:dateTime.
<#e2> a acc:Entry; acc:action acc:Read; acc:outcome acc:Success; acc:at "2026-11-22T10:00:00Z"^^xsd:dateTime.
<#e3> a acc:Entry; acc:action acc:Read; acc:outcome acc:Attempt; acc:at "2026-11-23T10:00:00Z"^^xsd:dateTime.
<#e4> a acc:Entry; acc:action acc:Read; acc:outcome acc:Denied; acc:at "2026-11-23T10:00:01Z"^^xsd:dateTime.
<#e5> a acc:Entry; acc:action acc:Grant; acc:outcome acc:Success; acc:at "2026-11-19T09:00:00Z"^^xsd:dateTime.
<#e6> a acc:Entry; acc:agent <${OTHER_NGO}>; acc:action acc:Read; acc:outcome acc:Success; acc:at "2026-11-24T10:00:00Z"^^xsd:dateTime.
`;
  const oldLog = `
@prefix n0: <${NS}>.
<#entry-1> n0:viewedAt "2026-10-01T09:00:00Z"; n0:viewedBy "${OTHER_NGO}".
`;

  it('summarises each NGO from its own file and marks old entries', async () => {
    mocks.solidFetch.mockImplementation(async (url: string) => {
      if (url === NGO_LOG) return new Response(ngoLog, { status: 200 });
      if (url === OLD_LOG) return new Response(oldLog, { status: 200 });
      return new Response('', { status: 404 });
    });
    const map = await loadNgoLogSummaries(REFUGEE_POD, [NGO_N, OTHER_NGO]);
    expect(map[NGO_N].lastSuccess).toBe('2026-11-24T10:00:00Z');
    expect(map[NGO_N].failedCount).toBe(1);
    expect(map[NGO_N].lastGrant).toBe('2026-11-19T09:00:00Z');
    expect(map[NGO_N].oldFormatViewed).toBe(false);
    expect(map[OTHER_NGO].lastSuccess).toBe('');
    expect(map[OTHER_NGO].oldFormatViewed).toBe(true);
  });
});
