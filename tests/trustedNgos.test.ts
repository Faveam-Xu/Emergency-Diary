import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// PR1-1: trusted NGO list, role from WebID, grant check, rollback after a
// failed grant, listing who can read the record, and loading the NGO list.

const mocks = vi.hoisted(() => ({
  solidFetch: vi.fn(),
  setAgentAccess: vi.fn(),
  getAgentAccessAll: vi.fn(),
  getSolidDataset: vi.fn(),
  saveSolidDatasetAt: vi.fn(),
  getResourceInfoWithAcl: vi.fn(),
  saveAclFor: vi.fn(),
}));

vi.mock('../src/auth', () => ({ solidFetch: mocks.solidFetch }));
vi.mock('@inrupt/solid-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@inrupt/solid-client')>();
  return {
    ...actual,
    getSolidDataset: mocks.getSolidDataset,
    saveSolidDatasetAt: mocks.saveSolidDatasetAt,
    getResourceInfoWithAcl: mocks.getResourceInfoWithAcl,
    hasAccessibleAcl: () => true,
    hasResourceAcl: () => true,
    getResourceAcl: () => ({}),
    setAgentDefaultAccess: (acl: unknown) => acl,
    saveAclFor: mocks.saveAclFor,
    universalAccess: {
      ...actual.universalAccess,
      setAgentAccess: mocks.setAgentAccess,
      getAgentAccessAll: mocks.getAgentAccessAll,
    },
  };
});

import { isTrustedNgo, loadTrustedNgos, roleForWebId } from '../src/trustedNgos';
import { getAgentsWithRecordAccess, grantAccessToSelectedNGOs } from '../src/accessControl';
import { loadNgoList } from '../src/solidDatanew';

const listJson = readFileSync(new URL('../public/trusted-ngos.json', import.meta.url), 'utf8');
const NGO_N = 'https://ml-ngo-n.solidcommunity.net/profile/card#me';
const OUTSIDER_B = 'https://ml-outsider-b.solidcommunity.net/profile/card#me';
const REFUGEE_A = 'https://ml-refugee-a.solidcommunity.net/profile/card#me';
const REFUGEE_POD = 'https://ml-refugee-a.solidcommunity.net/';
const RECORD = `${REFUGEE_POD}private/emergency.ttl`;
const ACCESS_LOG = `${REFUGEE_POD}private/ngo-access-log.ttl`;
const NO_ACCESS = { read: false, append: false, write: false };

let listResponse: () => Response;

beforeEach(async () => {
  listResponse = () => new Response(listJson, { status: 200 });
  vi.stubGlobal('fetch', vi.fn(async () => listResponse()));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { createSolidDataset } = await vi.importActual<typeof import('@inrupt/solid-client')>('@inrupt/solid-client');
  mocks.getSolidDataset.mockReset().mockResolvedValue(createSolidDataset());
  mocks.saveSolidDatasetAt.mockReset().mockResolvedValue(createSolidDataset());
  mocks.setAgentAccess.mockReset().mockResolvedValue(null);
  mocks.getAgentAccessAll.mockReset();
  mocks.solidFetch.mockReset();
  mocks.getResourceInfoWithAcl.mockReset().mockResolvedValue({});
  mocks.saveAclFor.mockReset().mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('trusted NGO list and role', () => {
  it('loads the list and gives the NGO role only to listed WebIDs', async () => {
    const list = await loadTrustedNgos();
    expect(list.map((ngo) => ngo.webId)).toEqual([NGO_N]);
    expect(roleForWebId(NGO_N, list)).toBe('ngo');
    expect(roleForWebId(REFUGEE_A, list)).toBe('refugee');
    expect(roleForWebId(OUTSIDER_B, list)).toBe('refugee');
    expect(roleForWebId(null, list)).toBe('refugee');
  });

  it('matches WebIDs exactly', async () => {
    const list = await loadTrustedNgos();
    expect(isTrustedNgo(NGO_N.replace('#me', ''), list)).toBe(false);
    expect(isTrustedNgo(`  ${NGO_N}  `, list)).toBe(true);
  });

  it('throws if the list is missing or malformed, so callers fail closed', async () => {
    listResponse = () => new Response('not found', { status: 404 });
    await expect(loadTrustedNgos()).rejects.toThrow('HTTP 404');
    listResponse = () => new Response('{"oops":1}', { status: 200 });
    await expect(loadTrustedNgos()).rejects.toThrow("no 'ngos' array");
  });
});

describe('grant check', () => {
  async function grantError(ids: string[]): Promise<string> {
    try {
      await grantAccessToSelectedNGOs(ids, REFUGEE_POD, REFUGEE_A, 'en');
      return 'no error';
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  it('refuses an NGO that is not on the list, before touching the Pod', async () => {
    const message = await grantError([OUTSIDER_B]);
    expect(message).toContain('These are not verified NGOs');
    expect(message).toContain(OUTSIDER_B);
    expect(mocks.setAgentAccess).not.toHaveBeenCalled();
    expect(mocks.saveSolidDatasetAt).not.toHaveBeenCalled();
  });

  it('refuses the whole grant if any selected NGO is not on the list', async () => {
    const message = await grantError([NGO_N, OUTSIDER_B]);
    expect(message).toContain('These are not verified NGOs');
    expect(message).not.toContain(NGO_N);
    expect(mocks.setAgentAccess).not.toHaveBeenCalled();
  });

  it('refuses every grant if the list cannot be loaded', async () => {
    listResponse = () => new Response('down', { status: 503 });
    expect(await grantError([NGO_N])).toContain('could not be loaded');
    expect(mocks.setAgentAccess).not.toHaveBeenCalled();
  });

  it('grants a listed NGO read access to the record', async () => {
    mocks.solidFetch.mockResolvedValue(new Response(null, { status: 205 }));
    expect(await grantError([NGO_N])).toBe('no error');
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(
      RECORD, NGO_N, { read: true, append: false, write: false }, expect.anything(),
    );
  });

  it('undoes the record and access-log rules when the inbox step fails', async () => {
    mocks.solidFetch.mockImplementation(async (url: string) => {
      if (url.includes('refugeesGranted.ttl')) return new Response(null, { status: 403 });
      return new Response(null, { status: 205 });
    });
    expect(await grantError([NGO_N])).toContain('Could not grant access for');
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(RECORD, NGO_N, NO_ACCESS, expect.anything());
    expect(mocks.setAgentAccess).toHaveBeenCalledWith(ACCESS_LOG, NGO_N, NO_ACCESS, expect.anything());
  });
});

describe('who can read the record', () => {
  it('lists agents with read access, without the owner', async () => {
    mocks.getAgentAccessAll.mockResolvedValue({
      [REFUGEE_A]: { read: true, append: true, write: true, controlRead: true, controlWrite: true },
      [NGO_N]: { read: true, append: false, write: false, controlRead: false, controlWrite: false },
      [OUTSIDER_B]: { read: false, append: true, write: false, controlRead: false, controlWrite: false },
    });
    expect(await getAgentsWithRecordAccess(REFUGEE_POD, REFUGEE_A)).toEqual([NGO_N]);
  });

  it('returns an empty list if the access rules cannot be read', async () => {
    mocks.getAgentAccessAll.mockRejectedValue(new Error('404'));
    expect(await getAgentsWithRecordAccess(REFUGEE_POD, REFUGEE_A)).toEqual([]);
  });
});

describe('loading the saved NGO list', () => {
  it('treats a missing list (404) as empty', async () => {
    mocks.solidFetch.mockResolvedValue(new Response('', { status: 404 }));
    expect(await loadNgoList(REFUGEE_POD)).toEqual([]);
  });

  it('returns null for any other failure, so the list is never saved over', async () => {
    mocks.solidFetch.mockResolvedValue(new Response('', { status: 500 }));
    expect(await loadNgoList(REFUGEE_POD)).toBeNull();
    mocks.solidFetch.mockRejectedValue(new Error('network down'));
    expect(await loadNgoList(REFUGEE_POD)).toBeNull();
  });
});
