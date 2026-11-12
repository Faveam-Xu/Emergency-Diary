import * as $rdf from "rdflib";
import { solidFetch } from "./auth";
import { CDM, getOntologyStore } from "./cdmnew";
import SHACLValidator from "rdf-validate-shacl";
import { runReasoning } from "./reasoner";
import datasetFactory from "@rdfjs/dataset";
import dataFactory from "@rdfjs/data-model";
import type { BlankNode, Quad_Object } from "@rdfjs/types";

const EMERGENCY_FILE = "public/emergency.ttl";
const NGO_LIST_FILE = "public/ngoList.ttl";

const EX = "http://example.org/ns#";
const EVIDENCE_URLS_PRED = $rdf.sym(EX + "evidenceUrls");

export type EmergencyData = {
  recordId: string;
  recordDate: string;
  victimId: string;
  victimCategory: string;
  numberOfVictims: string;
  nationality: string;
  victimGender: string;
  victimAge: string;
  groupNationalities: string;
  groupGenders: string;
  groupAges: string;
  country: string;
  state: string;
  town: string;
  village: string;
  latitude: string;
  longitude: string;
  locationId: string;
  locationName: string;
  locationType: string;
  situationDescription: string;
  accommodation: string;
  accommodationNeeds: string;
  needsDescription: string;
  captivityStatus: string;
  helpReasons: string;
  extraInfo: string;
  contactPhoneSelf: string;
  contactPhoneTrusted: string;
  contactMessenger: string;
  contactOtherHandles: string;
  contactRequest: string;
  gps: string;
  evidenceUrls: string;
//===============Editted==============
  trauma: string;      
  CaptivityDetail: string;             // New: Visible injuries (multiple selection)
  healthStatus: string;             // New: Health condition (free text)
  //===============Newly added Features==============
};

function addTripleIf(
  store: $rdf.IndexedFormula,
  subject: $rdf.NamedNode,
  predicate: $rdf.NamedNode,
  value: string,
): void {
  if (value) {
    store.add(subject, predicate, $rdf.lit(value));
  }
}

// Helper for multi-select fields (needs & trauma)
function addMultiValueIf(
  store: $rdf.IndexedFormula,
  subject: $rdf.NamedNode,
  predicate: $rdf.NamedNode,
  value: string | string[] | undefined
): void {
  const val = typeof value === "string" 
    ? value 
    : Array.isArray(value) ? value.join("; ") : "";
  
  if (val) {
    store.add(subject, predicate, $rdf.lit(val));
  }
}

// Rebuild rdflib statements as RDF/JS quads in the default graph. Both the
// data and shapes are graphs; rdflib's parser document graph is not data here.
function toDataset(store: $rdf.IndexedFormula) {
  const dataset = datasetFactory.dataset();
  const blankNodes = new Map<string, BlankNode>();
  const rdfFirst = dataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first");
  const rdfRest = dataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");
  const rdfNil = dataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");
  function convert(term: $rdf.Node): Quad_Object {
    switch (term.termType) {
      case "NamedNode": return dataFactory.namedNode(term.value);
      case "BlankNode": {
        let node = blankNodes.get(term.value);
        if (!node) {
          node = dataFactory.blankNode();
          blankNodes.set(term.value, node);
        }
        return node;
      }
      case "Literal": {
        if (!$rdf.isLiteral(term)) throw new Error("Invalid RDF literal.");
        return dataFactory.literal(term.value,
          term.language || dataFactory.namedNode(term.datatype.value));
      }
      case "Collection": {
        if (!$rdf.isCollection(term)) throw new Error("Invalid RDF collection.");
        // rdflib uses Collection terms for Turtle lists; SHACL sh:in needs
        // standard RDF first/rest quads instead.
        let head: Quad_Object = rdfNil;
        for (const item of [...term.elements].reverse()) {
          const node = dataFactory.blankNode();
          dataset.add(dataFactory.quad(node, rdfFirst, convert(item)));
          dataset.add(dataFactory.quad(node, rdfRest, head));
          head = node;
        }
        return head;
      }
      default: throw new Error(`Unsupported RDF term: ${term.termType}`);
    }
  }
  for (const statement of store.statements) {
    const subject = convert(statement.subject);
    if (subject.termType !== "NamedNode" && subject.termType !== "BlankNode") {
      throw new Error("Invalid RDF subject.");
    }
    dataset.add(dataFactory.quad(subject,
      dataFactory.namedNode(statement.predicate.value), convert(statement.object)));
  }
  return dataset;
}

async function validateData(store: $rdf.IndexedFormula): Promise<void> {
  const response = await fetch("/shapes.ttl");
  if (!response.ok) {
    throw new Error(`Could not load SHACL shapes: ${response.status} ${response.statusText}`);
  }
  const shapesText = await response.text();
  const shapesStore = $rdf.graph();
  try {
    $rdf.parse(shapesText, shapesStore, window.location.origin + "/shapes.ttl", "text/turtle");
  } catch (error) {
    throw new Error("Could not parse SHACL shapes.", { cause: error });
  }
  // An empty or unrelated Turtle document must not silently disable validation.
  const rdfType = $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  for (const name of ["Record", "Victim", "Location", "Situation"]) {
    if (!shapesStore.holds(CDM[name + "Shape"], rdfType, $rdf.sym("http://www.w3.org/ns/shacl#NodeShape"))) {
      throw new Error(`Missing SHACL shape: ${name}Shape.`);
    }
  }

  const validator = new SHACLValidator(toDataset(shapesStore));
  const report = await validator.validate(toDataset(store));
  if (!report.conforms) {
    const messages = report.results.flatMap((result) => {
      const messages = result.message.map((message) => message.value);
      return messages.length ? messages : [`Invalid value for ${result.path?.value || result.focusNode.value}.`];
    });
    throw new Error(`Validation failed:\n${messages.map((message) => `- ${message}`).join("\n")}`);
  }
}

// The form stores a calendar date. Preserve it as midnight UTC for updatedAt.
// The validator's datatype library does not reject every impossible calendar
// date/time, so check the lexical value before creating a typed literal too.
function recordTimestamp(value: string): string {
  if (!value.trim()) return ""; // SHACL reports the missing required value.
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)?$/.exec(timestamp);
  const calendarDate = match ? new Date(`${match[1]}T00:00:00Z`) : null;
  if (!calendarDate || !Number.isFinite(calendarDate.getTime()) ||
      calendarDate.toISOString().slice(0, 10) !== match?.[1]) {
    throw new Error("Validation failed:\n- Record must have a valid updated timestamp (xsd:dateTime).");
  }
  return timestamp;
}

function addTypedTripleIf(
  store: $rdf.IndexedFormula,
  subject: $rdf.NamedNode,
  predicate: $rdf.NamedNode,
  value: string,
  datatype: string,
): void {
  if (value.trim()) {
    store.add(subject, predicate, $rdf.literal(value.trim(), $rdf.sym(`http://www.w3.org/2001/XMLSchema#${datatype}`)));
  }
}

export async function saveEmergencyData(
  podBaseUrl: string,
  data: EmergencyData,
): Promise<string> {
  const fileUrl = `${podBaseUrl}${EMERGENCY_FILE}`;

  const store = $rdf.graph();

  const recordNode = $rdf.sym(`${fileUrl}#record`);
  const victimNode = $rdf.sym(`${fileUrl}#victim`);
  const locationNode = $rdf.sym(`${fileUrl}#location`);
  const situationNode = $rdf.sym(`${fileUrl}#situation`);

  const RDF_TYPE = $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

  // Record
  store.add(recordNode, RDF_TYPE, CDM.Record);
  addTripleIf(store, recordNode, CDM.id, data.recordId);
  addTypedTripleIf(store, recordNode, CDM.updatedAt, recordTimestamp(data.recordDate), "dateTime");

  // Victim
  store.add(recordNode, CDM.hasVictim, victimNode);
  store.add(recordNode, CDM.hasLocation, locationNode);
  store.add(recordNode, CDM.hasSituation, situationNode);

  store.add(victimNode, RDF_TYPE, CDM.Victim);
  addTripleIf(store, victimNode, CDM.victimId, data.victimId);
  addTripleIf(store, victimNode, CDM.category, data.victimCategory);
  addTypedTripleIf(store, victimNode, CDM.number, data.numberOfVictims, "integer");
  addTripleIf(store, victimNode, CDM.nationality, data.nationality);
  addTripleIf(store, victimNode, CDM.gender, data.victimGender);
  addTypedTripleIf(store, victimNode, CDM.age, data.victimAge, "integer");
  addTripleIf(store, victimNode, CDM.groupNationalities, data.groupNationalities);
  addTripleIf(store, victimNode, CDM.groupGenders, data.groupGenders);
  addTripleIf(store, victimNode, CDM.groupAges, data.groupAges);

  // Location
  store.add(locationNode, RDF_TYPE, CDM.Location);
  addTripleIf(store, locationNode, CDM.country, data.country);
  addTripleIf(store, locationNode, CDM.state, data.state);
  addTripleIf(store, locationNode, CDM.town, data.town);
  addTripleIf(store, locationNode, CDM.village, data.village);
  addTypedTripleIf(store, locationNode, CDM.latitude, data.latitude, "decimal");
  addTypedTripleIf(store, locationNode, CDM.longitude, data.longitude, "decimal");
  addTripleIf(store, locationNode, CDM.locationId, data.locationId);
  addTripleIf(store, locationNode, CDM.locationName, data.locationName);
  addTripleIf(store, locationNode, CDM.locationType, data.locationType);

  // Situation
  store.add(situationNode, RDF_TYPE, CDM.Situation);
  addTripleIf(store, situationNode, CDM.description, data.situationDescription);
  addTripleIf(store, situationNode, CDM.accommodation, data.accommodation);
  addTripleIf(store, situationNode, CDM.accommodationNeeds, data.accommodationNeeds);


  addTripleIf(store, situationNode, CDM.needsDescription, data.needsDescription);
  addTripleIf(store, situationNode, CDM.captivityStatus, data.captivityStatus);
  addTripleIf(store, situationNode, CDM.helpReasons, data.helpReasons);

  addTripleIf(store, situationNode, CDM.extraInfo, data.extraInfo);
  addTripleIf(store, situationNode, CDM.contactPhoneSelf, data.contactPhoneSelf);
  addTripleIf(store, situationNode, CDM.contactPhoneTrusted, data.contactPhoneTrusted);
  addTripleIf(store, situationNode, CDM.contactMessenger, data.contactMessenger);
  addTripleIf(store, situationNode, CDM.contactOtherHandles, data.contactOtherHandles);
  addTripleIf(store, situationNode, CDM.contactRequest, data.contactRequest);


  //===============New Fields==============
  // New fields: Trauma and Health Status
  addMultiValueIf(store, situationNode, CDM.trauma, data.trauma);
  addTripleIf(store, situationNode, CDM.healthStatus, data.healthStatus);
  addTripleIf(store,situationNode, CDM.CaptivityDetail,data.CaptivityDetail)
//=============================


  addTripleIf(store, situationNode, EVIDENCE_URLS_PRED, data.evidenceUrls);

  // VALIDATE
  await validateData(store);

  const serialized = $rdf.serialize(null, store, fileUrl, "text/turtle");

  const response = await solidFetch(fileUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/turtle",
    },
    body: serialized,
  });

  if (!response.ok) {
    throw new Error(`Failed to save: ${response.status} ${response.statusText}`);
  }

  return fileUrl;
}

export async function loadEmergencyData(
  podBaseUrl: string,
): Promise<EmergencyData | null> {
  const fileUrl = `${podBaseUrl}${EMERGENCY_FILE}`;

  let ttlContent: string;
  try {
    const response = await solidFetch(fileUrl);
    if (!response.ok) {
      return null;
    }
    ttlContent = await response.text();
  } catch {
    return null;
  }

  const store = $rdf.graph();
  try {
    $rdf.parse(ttlContent, store, fileUrl, "text/turtle");

    // REASONING
    const ontologyStore = getOntologyStore();
    if (ontologyStore) {
      await runReasoning(store, ontologyStore);
    }
  } catch (error) {
    console.error("Failed to parse RDF:", error);
    return null;
  }

  const recordNode = $rdf.sym(`${fileUrl}#record`);
  const victimNode = $rdf.sym(`${fileUrl}#victim`);
  const locationNode = $rdf.sym(`${fileUrl}#location`);
  const situationNode = $rdf.sym(`${fileUrl}#situation`);

  const getLiteral = (
    subject: $rdf.NamedNode,
    predicate: $rdf.NamedNode,
  ): string => {
    const value = store.any(subject, predicate, null);
    return value?.value || "";
  };

  const recordId = getLiteral(recordNode, CDM.id);
  const recordDate = getLiteral(recordNode, CDM.updatedAt).split("T")[0];

  const victimId = getLiteral(victimNode, CDM.victimId);
  const victimCategory = getLiteral(victimNode, CDM.category);
  const numberOfVictims = getLiteral(victimNode, CDM.number);
  const nationality = getLiteral(victimNode, CDM.nationality);
  const victimGender = getLiteral(victimNode, CDM.gender);
  const victimAge = getLiteral(victimNode, CDM.age);
  const groupNationalities = getLiteral(victimNode, CDM.groupNationalities);
  const groupGenders = getLiteral(victimNode, CDM.groupGenders);
  const groupAges = getLiteral(victimNode, CDM.groupAges);

  const country = getLiteral(locationNode, CDM.country);
  const state = getLiteral(locationNode, CDM.state);
  const town = getLiteral(locationNode, CDM.town);
  const village = getLiteral(locationNode, CDM.village);
  const latitude = getLiteral(locationNode, CDM.latitude);
  const longitude = getLiteral(locationNode, CDM.longitude);
  const locationId = getLiteral(locationNode, CDM.locationId);
  const locationName = getLiteral(locationNode, CDM.locationName);
  const locationType = getLiteral(locationNode, CDM.locationType);

  const situationDescription = getLiteral(situationNode, CDM.description);
  const accommodation = getLiteral(situationNode, CDM.accommodation);
 const accommodationNeeds = getLiteral(situationNode, CDM.accommodationNeeds);
  const needsDescription = getLiteral(situationNode, CDM.needsDescription);
  const captivityStatus = getLiteral(situationNode, CDM.captivityStatus);
  const helpReasons = getLiteral(situationNode, CDM.helpReasons);

  const extraInfo = getLiteral(situationNode, CDM.extraInfo);
  const contactPhoneSelf = getLiteral(situationNode, CDM.contactPhoneSelf);
  const contactPhoneTrusted = getLiteral(situationNode, CDM.contactPhoneTrusted);
  const contactMessenger = getLiteral(situationNode, CDM.contactMessenger);
  const contactOtherHandles = getLiteral(situationNode, CDM.contactOtherHandles);
  const contactRequest = getLiteral(situationNode, CDM.contactRequest);
     const CaptivityDetail = getLiteral(situationNode, CDM.CaptivityDetail);
   //const Needs=getLiteral(situationNode,CDM.needs);

  const evidenceUrls = getLiteral(situationNode, EVIDENCE_URLS_PRED);

  const gps = latitude && longitude ? `${latitude}, ${longitude}` : "";

  return {
    recordId,
    recordDate,
    victimId,
    victimCategory,
    numberOfVictims,
    nationality,
    victimGender,
    victimAge,
    groupNationalities,
    groupGenders,
    groupAges,
    country,
    state,
    town,
    village,
    latitude,
    longitude,
    locationId,
    locationName,
    locationType,
    situationDescription,
    accommodation,
    accommodationNeeds,
    needsDescription,
    captivityStatus,
    CaptivityDetail,
    helpReasons,
    extraInfo,
    contactPhoneSelf,
    contactPhoneTrusted,
    contactMessenger,
    contactOtherHandles,
    contactRequest,
    gps,
    evidenceUrls,
     

    // Updated fields returned
    trauma: getLiteral(situationNode, CDM.trauma),
    healthStatus: getLiteral(situationNode, CDM.healthStatus),
  };
}

export async function saveNgoList(
  podBaseUrl: string,
  ngos: string[],
): Promise<string> {
  const fileUrl = `${podBaseUrl}${NGO_LIST_FILE}`;
  const store = $rdf.graph();

  const listNode = $rdf.sym(`${fileUrl}#ngoList`);
  const RDF_TYPE = $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  const HAS_NGO = $rdf.sym("http://example.org/ns/hasNGO");

  store.add(listNode, RDF_TYPE, $rdf.sym("http://example.org/ns/NgoList"));

  ngos.forEach((ngoLabel) => {
    store.add(listNode, HAS_NGO, $rdf.literal(ngoLabel));
  });

  const serialized = $rdf.serialize(null, store, fileUrl, "text/turtle");

  const response = await solidFetch(fileUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/turtle",
    },
    body: serialized,
  });

  if (!response.ok) {
    throw new Error(`Failed to save NGO list: ${response.status} ${response.statusText}`);
  }

  return fileUrl;
}

export async function loadNgoList(
  podBaseUrl: string,
): Promise<string[] | null> {
  const fileUrl = `${podBaseUrl}${NGO_LIST_FILE}`;
  let ttlContent: string;
  try {
    const response = await solidFetch(fileUrl);
    if (!response.ok) {
      return null;
    }
    ttlContent = await response.text();
  } catch {
    return null;
  }

  const store = $rdf.graph();
  try {
    $rdf.parse(ttlContent, store, fileUrl, "text/turtle");
  } catch (error) {
    console.error("Failed to parse NGO list RDF:", error);
    return null;
  }

  const listNode = $rdf.sym(`${fileUrl}#ngoList`);
  const HAS_NGO = $rdf.sym("http://example.org/ns/hasNGO");

  const ngos = store.each(listNode, HAS_NGO, null).map((ngo) => ngo.value);

  return ngos;
}
