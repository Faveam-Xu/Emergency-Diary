import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as rdf from 'rdflib';
import RealValidator from 'rdf-validate-shacl';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), validatorError: false }));
vi.mock('../src/auth', () => ({ solidFetch: mocks.upload }));
vi.mock('rdf-validate-shacl', async (importOriginal) => {
  const { default: Validator } = await importOriginal<typeof import('rdf-validate-shacl')>();
  return { default: class extends Validator {
    async validate(...args: Parameters<RealValidator['validate']>) {
      if (mocks.validatorError) throw new Error('Validator execution failed');
      return super.validate(...args);
    }
  } };
});
import { saveEmergencyData, loadEmergencyData, type EmergencyData } from '../src/solidDatanew';

const shapes = readFileSync(new URL('../public/shapes.ttl', import.meta.url), 'utf8');
const pod = 'https://example.test/pod/';
const valid = (): EmergencyData => ({
  recordId: 'REC-1', recordDate: '2026-11-12', victimId: 'VIC-1',
  victimCategory: 'Group', numberOfVictims: '2', victimAge: '25',
  country: 'Eritrea', locationType: 'Refugee/IDP camp', captivityStatus: 'No',
  latitude: '15.33', longitude: '38.93', victimGender: 'Female',
} as EmergencyData);

beforeEach(() => {
  mocks.validatorError = false;
  mocks.upload.mockReset().mockResolvedValue(new Response('', { status: 200 }));
  vi.stubGlobal('window', { location: { origin: 'https://diary.test' } });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(shapes)));
});
afterEach(() => vi.unstubAllGlobals());

async function rejected(data: EmergencyData, message: string) {
  await expect(saveEmergencyData(pod, data)).rejects.toThrow(message);
  expect(mocks.upload).not.toHaveBeenCalled();
}

describe('PR1-2 SHACL save gate', () => {
  it('uploads a valid graph with typed values and preserves the form date on reload', async () => {
    // The record lives in public/ before PR0-2 and in private/ after it.
    const fileUrl = await saveEmergencyData(pod, valid());
    expect(fileUrl).toMatch(/^https:\/\/example\.test\/pod\/(public|private)\/emergency\.ttl$/);
    expect(mocks.upload.mock.calls[0][0]).toBe(fileUrl);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    const request = mocks.upload.mock.calls[0][1];
    expect(request.method).toBe('PUT');
    const graph = rdf.graph();
    rdf.parse(request.body, graph, fileUrl, 'text/turtle');
    for (const [node, property, datatype] of [
      ['record', 'updatedAt', 'dateTime'], ['victim', 'number', 'integer'],
      ['victim', 'age', 'integer'], ['location', 'latitude', 'decimal'],
      ['location', 'longitude', 'decimal'],
    ]) {
      const literal = graph.any(rdf.sym(`${fileUrl}#${node}`), rdf.sym(`http://example.org/hds#${property}`)) as rdf.Literal;
      expect(literal.datatype.value).toBe(`http://www.w3.org/2001/XMLSchema#${datatype}`);
    }
    mocks.upload.mockResolvedValueOnce(new Response(request.body));
    expect((await loadEmergencyData(pod))?.recordDate).toBe('2026-11-12');
  });
  it('accepts a valid full timestamp', async () => {
    await saveEmergencyData(pod, { ...valid(), recordDate: '2026-11-12T10:30:00Z' });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });
  it('accepts optional empty numeric fields, age zero, and group size one', async () => {
    await saveEmergencyData(pod, { ...valid(), victimAge: '0', numberOfVictims: '1', latitude: '', longitude: '' });
    await saveEmergencyData(pod, { ...valid(), victimAge: '' });
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });
  it.each(['recordId', 'recordDate', 'victimId', 'numberOfVictims', 'victimCategory', 'country', 'locationType', 'captivityStatus'] as const)(
    'blocks missing required %s', async (field) => {
      await rejected({ ...valid(), [field]: '' }, 'Validation failed:');
    },
  );
  it.each(['nonsense', '2026-02-30', '2026-11-12T25:00:00Z', '2026-13-01'])(
    'blocks invalid timestamp %s', async (recordDate) => {
      await rejected({ ...valid(), recordDate }, 'valid updated timestamp');
    },
  );
  it.each([
    ['victimAge', '-1', 'Age must'], ['victimAge', '1.5', 'Age must'],
    ['numberOfVictims', '0', 'positive integer'], ['numberOfVictims', '2.5', 'positive integer'],
    ['numberOfVictims', 'abc', 'positive integer'], ['latitude', '91', 'Latitude must'],
    ['longitude', '-181', 'Longitude must'], ['latitude', 'oops', 'Latitude must'],
    ['victimCategory', 'Unknown', 'Category must'], ['victimGender', 'Unknown', 'Gender must'],
    ['locationType', 'Unknown', 'Location type must'], ['captivityStatus', 'Maybe', 'Captivity status must'],
  ])('blocks invalid %s=%s', async (field, value, message) => {
    await rejected({ ...valid(), [field]: value }, message);
  });
  it('propagates all relevant messages for the existing UI catch handler', async () => {
    try {
      await saveEmergencyData(pod, { ...valid(), country: '', numberOfVictims: '0', captivityStatus: 'Maybe' });
      expect.fail('Expected validation to reject');
    } catch (error) {
      // Same Error.message extraction used by App.handleSave.
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('Country is required.');
      expect(message).toContain('Number of victims must be a positive integer.');
      expect(message).toContain('Captivity status must be Yes or No.');
    }
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('blocks a missing shapes response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 404 }));
    await rejected(valid(), 'Could not load SHACL shapes: 404');
  });
  it('blocks a network failure loading shapes', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'));
    await rejected(valid(), 'Network unavailable');
  });
  it('blocks malformed Turtle shapes', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('@prefix broken'));
    await rejected(valid(), 'Could not parse SHACL shapes');
  });
  it('blocks empty shapes', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(''));
    await rejected(valid(), 'Missing SHACL shape');
  });
  it('blocks validator errors', async () => {
    mocks.validatorError = true;
    await rejected(valid(), 'Validator execution failed');
  });
});
