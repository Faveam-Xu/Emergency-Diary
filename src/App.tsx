import { useEffect, useState, useRef } from "react";
import type { ChangeEvent } from "react";

import { initSession, login, logout, isLoggedIn, getWebId } from "./auth";
import {
  saveEmergencyData,
  loadEmergencyData,
  saveNgoList,
  loadNgoList,
} from "./solidDatanew";
import { loadOntology, getOntologyStore } from "./cdmnew";
import type { EmergencyData } from "./solidDatanew";
import * as $rdf from "rdflib";


import {
  getSolidDataset,
  getThing,
  getThingAll,
  getUrl,
  getUrlAll,
  getStringNoLocale,
  createSolidDataset,
  saveSolidDatasetAt,
  universalAccess,
} from "@inrupt/solid-client";
import { solidFetch } from "./auth";
import { getEmergencyAccess, makeEmergencyPrivate } from "./accessControl";
import {
  grantAccessToSelectedNGOs,
  revokeAccessFromSelectedNGOs,
} from "./accessControl";

import { COUNTRIES } from "./countries";
import { NATIONALITIES } from "./nationalities";
import {
  type AppLanguage,
  localize,
  loginStrings,
  dashboardStrings,
  ngoStrings,
  tr,
} from "./i18n";

import {
  queryRefugeeData,
  type RefugeeData,
  type RefugeeDataWithSource,
} from "./comunicaQuery";
import { executeCustomQuery, type BuilderItem } from "./customComunicaQuery";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const EX = "https://example.org/ns#";

const ACCESS_LOG_NS = "http://example.org/ns/access#";
const ACCESS_LOG_FILE = "private/ngo-access-log.ttl";

type NgoGrant = {
  refugeeWebId: string;
  emergencyFileUrl: string;
  grantedAt: string;
};

type CdmTermDoc = {
  localName: string;
  label: string;
  comment: string;
};

type CdmDocs = {
  classes: CdmTermDoc[];
  record: CdmTermDoc[];
  victim: CdmTermDoc[];
  location: CdmTermDoc[];
  situation: CdmTermDoc[];
};

const RDFS_NS = "http://www.w3.org/2000/01/rdf-schema#";
const CDM_NS = "https://datarefuge.org/cdm-cdm#";

function buildCdmDocsFromStore(store: $rdf.IndexedFormula): CdmDocs {
  const RDFS_LABEL = $rdf.sym(RDFS_NS + "label");
  const RDFS_COMMENT = $rdf.sym(RDFS_NS + "comment");

  

  function getDoc(localName: string): CdmTermDoc {
    const subject = $rdf.sym(CDM_NS + localName);
    const labelNode = store.any(subject, RDFS_LABEL, null);
    const commentNode = store.any(subject, RDFS_COMMENT, null);

    const label = labelNode ? (labelNode.value as string) : localName;
    const comment = commentNode ? (commentNode.value as string) : "";
    return { localName, label, comment };
  }

  return {
    classes: ["Record", "Victim", "Location", "Situation"].map(getDoc),
    record: ["id", "updatedAt"].map(getDoc),
    victim: [
      "victimId",
      "category",
      "number",
      "nationality",
      "gender",
      "age",
      "groupGenders",
      "groupAges",
      "groupNationalities",
    ].map(getDoc),
    location: [
      "country",
      "state",
      "town",
      "village",
      "latitude",
      "longitude",
      "locationId",
      "locationName",
      "locationType",
    ].map(getDoc),
    situation: [
      "description",
      "accommodation",
      "accommodationNeeds",
      "needsDescription",
      "captivityStatus",

      //=============================
      "CaptivityDetail",
      "trauma",        // NEW: Visible injuries
      "healthStatus",   // NEW: Health condition
      //=============================
      "helpReasons",
      "extraInfo",
      "contactPhoneSelf",
      "contactPhoneTrusted",
      "contactMessenger",
      "contactOtherHandle",
      "contactRequest",
    ].map(getDoc),
  };
}

function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Search...",
  emptyText = "No results",
  hasError = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  hasError?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );
 
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ marginBottom: 8, position: "relative" }}>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
        {label.includes("*") ? (
          <>
            {label.replace(" *", "")}
            <span style={{ color: "#dc3545" }}> *</span>
          </>
        ) : (
          label
        )}
      </label>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          setIsOpen(true);
          if (val === "") {
            onChange("");
          }
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: 8,
          border: hasError ? "2px solid #dc3545" : "1px solid #ccc",
          borderRadius: 4,
          fontSize: 14,
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      />
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#2d3748",
            border: "1px solid #ccc",
            borderTop: "none",
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: 8,
                  cursor: "pointer",
                  backgroundColor: search === opt ? "#4a5568" : "transparent",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "#f3f4f6";
                  (e.currentTarget as HTMLDivElement).style.color = "#000000";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    search === opt ? "#4a5568" : "transparent";
                  (e.currentTarget as HTMLDivElement).style.color = "#ffffff";
                }}
              >
                {opt}
              </div>
            ))
          ) : (
            <div style={{ padding: 8, color: "#b0bec5" }}>{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}

function SimpleDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  hasError = false,
  getOptionLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  hasError?: boolean;
  getOptionLabel?: (value: string) => string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: "block",
          marginBottom: 4,
          fontWeight: 500,
        }}
      >
        {label.includes("*") ? (
          <>
            {label.replace(" *", "")}
            <span style={{ color: "#dc3545" }}> *</span>
          </>
        ) : (
          label
        )}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          border: hasError ? "2px solid #b91c1c" : "1px solid #ccc",
          borderRadius: 4,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {getOptionLabel ? getOptionLabel(opt) : opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
  // -${Math.random().toString(36).substr(2, 9)}
}

function getPodBaseFromEmergencyUrl(emergencyFileUrl: string): string | null {
  const marker = "/public/emergency.ttl";
  const index = emergencyFileUrl.indexOf(marker);
  if (index === -1) return null;

  return emergencyFileUrl.slice(0, index + 1);
}

async function logNgoViewFromNgo(emergencyFileUrl: string, ngoWebId: string) {
  try {
    const podBase = getPodBaseFromEmergencyUrl(emergencyFileUrl);
    if (!podBase || !ngoWebId) return;

    const logUrl = `${podBase}${ACCESS_LOG_FILE}`;

    let ttlContent = "";
    try {
      const res = await solidFetch(logUrl);
      if (res.ok) {
        ttlContent = await res.text();
      }
    } catch {
      // file might not exist yet – that's fine
    }

    const store = $rdf.graph();
    if (ttlContent) {
      try {
        $rdf.parse(ttlContent, store, logUrl, "text/turtle");
      } catch (e) {
        console.error("Failed to parse existing NGO access log:", e);
      }
    }

    const RDF_TYPE = $rdf.sym(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    );
    const LOG_CLASS = $rdf.sym(ACCESS_LOG_NS + "AccessLog");
    const HAS_ENTRY = $rdf.sym(ACCESS_LOG_NS + "hasEntry");
    const VIEWED_BY = $rdf.sym(ACCESS_LOG_NS + "viewedBy");
    const VIEWED_AT = $rdf.sym(ACCESS_LOG_NS + "viewedAt");

    const logNode = $rdf.sym(logUrl + "#log");
    store.add(logNode, RDF_TYPE, LOG_CLASS);

    const entryNode = $rdf.sym(logUrl + "#entry-" + Date.now());
    store.add(logNode, HAS_ENTRY, entryNode);
    store.add(entryNode, VIEWED_BY, $rdf.literal(ngoWebId));
    store.add(entryNode, VIEWED_AT, $rdf.literal(new Date().toISOString()));

    const serialized = $rdf.serialize(null, store, logUrl, "text/turtle");
    await solidFetch(logUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/turtle" },
      body: serialized,
    });
  } catch (e) {
    console.error("Failed to log NGO view:", e);
  }
}

async function loadNgoViewStatusForRefugee(
  podBaseUrl: string,
): Promise<Record<string, boolean>> {
  const fileUrl = `${podBaseUrl}${ACCESS_LOG_FILE}`;
  let ttlContent = "";
  try {
    const response = await solidFetch(fileUrl);
    if (!response.ok) {
      return {};
    }
    ttlContent = await response.text();
  } catch {
    return {};
  }

  const store = $rdf.graph();
  try {
    $rdf.parse(ttlContent, store, fileUrl, "text/turtle");
  } catch (e) {
    console.error("Failed to parse NGO access log:", e);
    return {};
  }

  const VIEWED_BY = $rdf.sym(ACCESS_LOG_NS + "viewedBy");
  const map: Record<string, boolean> = {};

  const statements = store.statementsMatching(null, VIEWED_BY, null);
  statements.forEach((st) => {
    if (st.object && st.object.termType === "Literal") {
      map[st.object.value] = true;
    }
  });

  return map;
}

function getPodBaseFromWebId(webId: string): string {
  const withoutFragment = webId.split("#")[0];
  const url = new URL(withoutFragment);
  if (url.pathname.startsWith("/profile/")) {
    return `${url.origin}/`;
  }
  return `${url.origin}/`;
}

function requestGPS(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err)
    );
  });
}

export default function App() {
  const [, setEmergencyData] = useState({
    latitude: "",
    longitude: ""
  });
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("appLanguage");
      if (stored === "en" || stored === "ti" || stored === "zh") return stored;
    }
    return "en";
  });
const handleGetGPS = async () => {
  try {
    setStatus(dashboardTexts.gettingGps);
    const coords = await requestGPS();
    
    setLatitude(coords.latitude.toString());
    setLongitude(coords.longitude.toString());
   
setEmergencyData((prev) => ({
  ...prev,
  latitude: coords.latitude.toString(),
  longitude: coords.longitude.toString()
}));
    setStatus(dashboardTexts.gpsObtained);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    setStatus(`${tr(language, "GPS Error", "GPS ጌጋ", "GPS 错误")}: ${msg}`);
  }
};
  const handleLanguageChange = (lang: AppLanguage) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("appLanguage", lang);
    }
  };

  const loginTexts = localize(language, loginStrings);
  const dashboardTexts = localize(language, dashboardStrings);
  const ngoTexts = localize(language, ngoStrings);



  const GENDER_VALUES = ["Female", "Male", "Other", "Prefer not to say"];
  const CATEGORY_VALUES = ["Individual", "Group"];
  const GROUP_GENDER_VALUES = [
    "Female",
    "Male",
    "Other",
    "Mixed",
    "Prefer not to say",
  ];

  const LOCATION_TYPE_VALUES = [
    "Refugee/IDP camp",
    "Human Trafficking/Smuggling camp",
  ];
  const ACCOMMODATION_VALUES = [
    "House",
    "Apartment",
    "Tent",
    "No accommodation",
  ];
  const NEEDS_VALUES = [
    "Health",
    "Education",
    "Shelter",
    "Protection",
    "WASH",
    "Food security",
    "Transportation",
    "Communication",
    "Mental health",
    "Spiritual support",
    "Administrative support",
  ];

//=============================
 const TRAUMA_VALUES = [
  "Cuts / lacerations",
  "Bruises",
  "Burns",
  "Fractures",
  "Head injury",
  "Gunshot / shrapnel",
  "Signs of sexual violence",
  "Dehydration / malnutrition",
  "Other visible injury",
];
  //=============================

  const HELP_REASON_VALUES = [
    "I am abducted",
    "I am held against my will",
    "I am threatened",
    "I am extorted",
    "I have to pay money",
    "I am beaten",
    "I am abused",
    "Other",
  ];
  const CAPTIVITY_STATUS_VALUES = ["Yes", "No"];

  const getGenderLabel = (value: string) => {
    if (language === "en") return value;
    switch (value) {
      case "Female":
        return dashboardTexts.female;
      case "Male":
        return dashboardTexts.male;
      case "Other":
        return dashboardTexts.other;
      case "Prefer not to say":
        return dashboardTexts.preferNot;
      default:
        return value;
    }
  };

  const getCategoryLabel = (value: string) => {
    if (language === "en") return value;
    if (value === "Individual") return dashboardTexts.individual;
    if (value === "Group") return dashboardTexts.group;
    return value;
  };

  const getGroupGenderLabel = (value: string) => {
    if (language === "en") return value;
    switch (value) {
      case "Female":
        return dashboardTexts.female;
      case "Male":
        return dashboardTexts.male;
      case "Other":
        return dashboardTexts.other;
      case "Mixed":
        return dashboardTexts.mixed;
      case "Prefer not to say":
        return dashboardTexts.preferNot;
      default:
        return value;
    }
  };

  const getLocationTypeLabel = (value: string) => {
    if (language === "en") return value;
    if (value === "Refugee/IDP camp") return dashboardTexts.refugeeCamp;
    if (value === "Human Trafficking/Smuggling camp")
      return dashboardTexts.traffickingCamp;
    return value;
  };

  const getAccommodationLabel = (value: string) => {
    if (language === "en") return value;
    switch (value) {
      case "House":
        return dashboardTexts.house;
      case "Apartment":
        return dashboardTexts.apartment;
      case "Tent":
        return dashboardTexts.tent;
      case "No accommodation":
        return dashboardTexts.noAccommodation;
      default:
        return value;
    }
  };

  const getNeedsLabel = (value: string) => {
    if (language === "en") return value;
    switch (value) {
      case "Health":
        return dashboardTexts.health;
      case "Education":
        return dashboardTexts.education;
      case "Shelter":
        return dashboardTexts.shelter;
      case "Protection":
        return dashboardTexts.protection;
      case "WASH":
        return dashboardTexts.wash;
      case "Food security":
        return dashboardTexts.foodSecurity;
      case "Transportation":
        return dashboardTexts.transportation;
      case "Communication":
        return dashboardTexts.communication;
      case "Mental health":
        return dashboardTexts.mentalHealth;
      case "Spiritual support":
        return dashboardTexts.spiritualSupport;
      case "Administrative support":
        return dashboardTexts.administrativeSupport;
      default:
        return value;
    }
  };

  const getHelpReasonLabel = (value: string) => {
    if (language === "en") return value;
    switch (value) {
      case "I am abducted":
        return dashboardTexts.abducted;
      case "I am held against my will":
        return dashboardTexts.heldAgainstWill;
      case "I am threatened":
        return dashboardTexts.threatened;
      case "I am extorted":
        return dashboardTexts.extorted;
      case "I have to pay money":
        return dashboardTexts.mustPayMoney;
      case "I am beaten":
        return dashboardTexts.beaten;
      case "I am abused":
        return dashboardTexts.abused;
      case "Other":
        return dashboardTexts.other;
      default:
        return value;
    }
  };

  const getCaptivityStatusLabel = (value: string) => {
    if (language === "en") return value;
    if (value === "Yes") return dashboardTexts.yes;
    if (value === "No") return dashboardTexts.no;
    return value;
  };

  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [webId, setWebId] = useState<string | null>(null);
  const [podBaseUrl, setPodBaseUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [role, setRole] = useState<"refugee" | "ngo">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("userRole");
      if (stored === "refugee" || stored === "ngo") {
        return stored;
      }
    }
    return "refugee";
  });

  type EnrichedRefugeeData = RefugeeData & {
    refugeeWebId?: string;
    emergencyFileUrl?: string;
  };

  async function logViewsForAllGrants(grants: NgoGrant[], ngoWebId: string) {
    for (const g of grants) {
      try {
        if (g.emergencyFileUrl) {
          await logNgoViewFromNgo(g.emergencyFileUrl, ngoWebId);
        }
      } catch (e) {
        console.warn("Failed to log query view for refugee", g.refugeeWebId, e);
      }
    }
  }

  function attachGrantsBySource(
    results: RefugeeDataWithSource[],
    grants: NgoGrant[],
  ): EnrichedRefugeeData[] {
    const grantByFileUrl = new Map<string, NgoGrant>();
    for (const grant of grants) {
      grantByFileUrl.set(grant.emergencyFileUrl, grant);
    }

    const enrichedResults: EnrichedRefugeeData[] = [];
    for (const result of results) {
      const grant = grantByFileUrl.get(result.sourceUrl);

      let refugeeWebId = "unknown";
      if (grant) {
        refugeeWebId = grant.refugeeWebId;
      }

      enrichedResults.push({
        ...result,
        refugeeWebId: refugeeWebId,
        emergencyFileUrl: result.sourceUrl,
      });
    }

    return enrichedResults;
  }

  function findGrantsWithoutResults(
    results: RefugeeDataWithSource[],
    grants: NgoGrant[],
  ): NgoGrant[] {
    const fileUrlsWithResults = new Set<string>();
    for (const result of results) {
      fileUrlsWithResults.add(result.sourceUrl);
    }

    const grantsWithoutResults: NgoGrant[] = [];
    for (const grant of grants) {
      if (!fileUrlsWithResults.has(grant.emergencyFileUrl)) {
        grantsWithoutResults.push(grant);
      }
    }

    return grantsWithoutResults;
  }

  const [ngoQueryData, setNgoQueryData] = useState<EnrichedRefugeeData[]>([]);
  const [rawNgoData, setRawNgoData] = useState<EnrichedRefugeeData[]>([]);

  const [ngoCountryStats, setNgoCountryStats] = useState<
    { country: string; count: number }[]
  >([]);
  const [chartFieldLabel, setChartFieldLabel] = useState("Country");

  const [ngoQueryLoading, setNgoQueryLoading] = useState(false);
  const [ngoQueryError, setNgoQueryError] = useState("");

  const [filterField, setFilterField] = useState("All");
  const [filterValue, setFilterValue] = useState("");
  const [isQueryComplete, setIsQueryComplete] = useState(false);

  const [customQueryMode, setCustomQueryMode] = useState(false);
  const [queryChain, setQueryChain] = useState<BuilderItem[]>([]);
  const [customQueryLoading, setCustomQueryLoading] = useState(false);
  const [customQueryError, setCustomQueryError] = useState("");

  const [ngoGrants, setNgoGrants] = useState<NgoGrant[]>([]);
  const [ngoStatus, setNgoStatus] = useState("");

  const [showNgoDocs, setShowNgoDocs] = useState(false);
  const [cdmDocs, setCdmDocs] = useState<CdmDocs | null>(null);
  const [cdmDocsLoading, setCdmDocsLoading] = useState(false);
  const [cdmDocsError, setCdmDocsError] = useState<string | null>(null);

  const [recordId, setRecordId] = useState(() => generateId("REC"));
  const [recordDate, setRecordDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const [victimId, setVictimId] = useState(() => generateId("VIC"));
  const [victimCategory, setVictimCategory] = useState("");
  const [numberOfVictims, setNumberOfVictims] = useState("");
  const [nationality, setNationality] = useState("");
  const [victimGender, setVictimGender] = useState("");
  const [victimAge, setVictimAge] = useState("");
  const [groupNationalities, setGroupNationalities] = useState<string[]>([]);
  const [groupNationalityInput, setGroupNationalityInput] = useState("");
  const [groupGenders, setGroupGenders] = useState("");
  const [groupAges, setGroupAges] = useState("");

  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const [village, setVillage] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationId, setLocationId] = useState(() => generateId("LOC"));
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("");

  const [situationDescription, setSituationDescription] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [accommodationNeeds, setAccommodationNeeds] = useState<string[]>([]);
  const [needsDescription, setNeedsDescription] = useState("");
  const [captivityStatus, setCaptivityStatus] = useState("");
  const [helpReasons, setHelpReasons] = useState<string[]>([]);
  const [extraInfo, setExtraInfo] = useState("");


 //============================= NEW STATES - Only for Trauma, Health Status, and captivity detail
    const [CaptivityDetail, setCaptivityDetail] = useState("");
  const [trauma, setTrauma] = useState<string[]>([]);
  const [healthStatus, setHealthStatus] = useState("");
  //===============by ==============

  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceUploadStatus, setEvidenceUploadStatus] = useState<
    string | null
  >(null);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const [contactPhoneSelf, setContactPhoneSelf] = useState("");
  const [contactPhoneTrusted, setContactPhoneTrusted] = useState("");
  const [contactMessenger, setContactMessenger] = useState("");
  const [contactOtherHandles, setContactOtherHandles] = useState("");
  const [contactRequest, setContactRequest] = useState("");

  const [status, setStatus] = useState("");
  const [rawRdf, setRawRdf] = useState("");
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );

  const [trustedNgos, setTrustedNgos] = useState<string[]>([]);
  const [newNgo, setNewNgo] = useState("");
  const [allNgos, setAllNgos] = useState<string[]>([]);

  const [ngoAccessMap, setNgoAccessMap] = useState<{
    [webId: string]: boolean;
  }>({});

  const [ngoViewMap, setNgoViewMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
  // Use 'loggedIn' (the state variable defined on line 719), 
  // NOT 'isLoggedIn' (the function imported on line 4).
  if (loggedIn && role === "refugee") {
    handleGetGPS();
  }
}, [loggedIn, role]);
  useEffect(() => {
    (async () => {
      await Promise.all([initSession(), loadOntology()]);
      const ok = isLoggedIn();
      setLoggedIn(ok);
      const id = getWebId() ?? null;
      setWebId(id);
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!podBaseUrl) return;

    (async () => {
      try {
        const ngos = await loadNgoList(podBaseUrl);
        if (ngos && ngos.length > 0) {
          setAllNgos(ngos);
          setTrustedNgos([]);
        }

        try {
          const data = await loadEmergencyData(podBaseUrl);
          if (data) {
            applyLoadedData(data);
            setStatus(dashboardTexts.emergencyDataLoaded);
          }
        } catch (err) {
          console.warn("Error loading emergency data", err);
        }

        try {
          const access = await getEmergencyAccess(podBaseUrl);
          setIsPublic(access.isPublic);
        } catch (err) {
          console.warn("Error reading emergency access", err);
        }
        try {
          const viewMap = await loadNgoViewStatusForRefugee(podBaseUrl);
          setNgoViewMap(viewMap);
        } catch (err) {
          console.warn("Error loading NGO access log", err);
        }
      } catch (err) {
        console.error("Error loading NGO list", err);
      }
    })();
  }, [podBaseUrl]);

  useEffect(() => {
    async function loadNgoAccess() {
      if (!podBaseUrl || allNgos.length === 0) return;

      const emergencyFileUrl = podBaseUrl.endsWith("/")
        ? podBaseUrl + "public/emergency.ttl"
        : podBaseUrl + "/public/emergency.ttl";

      try {
        const accessMap: Record<string, boolean> = {};

        for (const ngo of allNgos) {
          try {
            const access = await universalAccess.getAgentAccess(
              emergencyFileUrl,
              ngo,
              { fetch: solidFetch },
            );
            accessMap[ngo] = !!access?.read;
          } catch (err) {
            console.error("Error checking access for NGO", ngo, err);
            accessMap[ngo] = false;
          }
        }

        setNgoAccessMap(accessMap);
      } catch (err) {
        console.error("Error loading NGO access map", err);
      }
    }

    loadNgoAccess();
  }, [podBaseUrl, allNgos]);

  useEffect(() => {
    (async () => {
      if (!podBaseUrl) return;
      try {
        await saveNgoList(podBaseUrl, allNgos);
      } catch (err) {
        console.warn("Error while saving NGO list", err);
      }
    })();
  }, [allNgos, podBaseUrl]);

  useEffect(() => {
    (async () => {
      if (!webId) return;
      try {
        const profileDoc = webId.split("#")[0];
        const ds = await getSolidDataset(profileDoc, { fetch: solidFetch });
        const me = getThing(ds, webId);
        if (!me) return;
        const storages = getUrlAll(
          me,
          "http://www.w3.org/ns/pim/space#storage",
        );
        const base = storages[0]
          ? storages[0].endsWith("/")
            ? storages[0]
            : storages[0] + "/"
          : "";
        if (base) setPodBaseUrl(base);
      } catch (err) {
        console.warn("Error while detecting storage", err);
      }
    })();
  }, [webId]);

  async function onLogin() {
    await login();
  }

  async function onLogout() {
    await logout();
    setLoggedIn(false);
    setWebId(null);
    setPodBaseUrl("");
    setStatus("");
    setRawRdf("");
  }

  

  const handleEvidenceInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setEvidenceFiles([]);
      setEvidenceUploadStatus(null);
      return;
    }

    const fileArray = Array.from(files);
    setEvidenceFiles(fileArray);

    setEvidenceUploadStatus(
      `${fileArray.length} ${dashboardTexts.filesSelectedMessage}`,
    );
  };

  const handleEvidenceUploadClick = async () => {
    if (!evidenceFiles.length) {
      setEvidenceUploadStatus("Please select at least one picture first.");
      return;
    }

    try {
      setEvidenceUploadStatus(dashboardTexts.uploadingPictures);
      const uploadedUrls: string[] = [];

      for (const file of evidenceFiles) {
        const url = await uploadEvidenceFile(file);
        uploadedUrls.push(url);
      }

      setEvidenceUrls(uploadedUrls);
      const message = dashboardTexts.uploadedPicturesSuccess.replace(
        "{{count}}",
        uploadedUrls.length.toString(),
      );

      setEvidenceUploadStatus(message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      setEvidenceUploadStatus(`Failed to upload pictures: ${msg}`);
    }
  };

  const uploadEvidenceFile = async (file: File): Promise<string> => {
    if (!webId) throw new Error("Missing WebID, cannot upload evidence.");

    const podBase = getPodBaseFromWebId(webId);
    const folderUrl = `${podBase}public/evidence/`;
    const fileName = `${Date.now()}-${file.name}`;
    const fileUrl = `${folderUrl}${encodeURIComponent(fileName)}`;

    const arrayBuffer = await file.arrayBuffer();
    const response = await solidFetch(fileUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: new Uint8Array(arrayBuffer),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload evidence file: ${response.status} ${response.statusText}`,
      );
    }

    return fileUrl;
  };

  function toEmergencyData(): EmergencyData {
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
      groupNationalities: groupNationalities.join("; "),
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
    accommodationNeeds: accommodationNeeds.join("; "),
      needsDescription,
      captivityStatus,
      helpReasons: helpReasons.join("; "),
      extraInfo,
      contactPhoneSelf,
      contactPhoneTrusted,
      contactMessenger,
      contactOtherHandles,
      contactRequest,
      gps,
      evidenceUrls: evidenceUrls.join("; "),

    //=============================
      // New fields only
      trauma: trauma.join("; "),
     
      healthStatus,
      CaptivityDetail
    //=============================
    };
  }

  function applyLoadedData(data: EmergencyData) {
    setRecordId(data.recordId);
    setRecordDate(data.recordDate);
    setVictimId(data.victimId);
    setVictimCategory(data.victimCategory);
    setNumberOfVictims(data.numberOfVictims);
    setNationality(data.nationality);
    setVictimGender(data.victimGender);
    setVictimAge(data.victimAge);
    setGroupNationalities(
      data.groupNationalities
        ? data.groupNationalities
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
    setGroupNationalityInput("");

    setGroupGenders(data.groupGenders);
    setGroupAges(data.groupAges);
    setCountry(data.country);
    setState(data.state);
    setTown(data.town);
    setVillage(data.village);
    setLatitude(data.latitude);
    setLongitude(data.longitude);
    setLocationId(data.locationId);
    setLocationName(data.locationName);
    setLocationType(data.locationType);
    setSituationDescription(data.situationDescription);
    setAccommodation(data.accommodation);
    setAccommodationNeeds(
  data.accommodationNeeds
    ? data.accommodationNeeds.split(";").map((s) => s.trim()).filter(Boolean)
    : []
);
    setNeedsDescription(data.needsDescription);
    setCaptivityStatus(data.captivityStatus);
    setHelpReasons(
      data.helpReasons
        ? data.helpReasons
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [],
    );
    setExtraInfo(data.extraInfo);
    setContactPhoneSelf(data.contactPhoneSelf);
    setContactPhoneTrusted(data.contactPhoneTrusted);
    setContactMessenger(data.contactMessenger);
    setContactOtherHandles(data.contactOtherHandles);
    setContactRequest(data.contactRequest);
    setEvidenceUrls(
      data.evidenceUrls
        ? data.evidenceUrls
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [],
    );
  //===============by ============== New fields
  setCaptivityDetail(data.CaptivityDetail);
    setTrauma(data.trauma ? data.trauma.split(";").map((s) => s.trim()).filter(Boolean) : []);
    setHealthStatus(data.healthStatus || "");
  //=============================
  }

  async function handleSave() {
    const errors = new Set<string>();
    if (!victimCategory || victimCategory.trim() === "")
      errors.add("victimCategory");
    if (!numberOfVictims || numberOfVictims.trim() === "")
      errors.add("numberOfVictims");
    if (!country || country.trim() === "") errors.add("country");
    if (!locationType || locationType.trim() === "") errors.add("locationType");
    if (!captivityStatus || captivityStatus.trim() === "")
      errors.add("captivityStatus");

    setValidationErrors(errors);

    if (errors.size > 0) {
      setStatus(dashboardTexts.requiredFieldsError);
      return;
    }

    try {
      setStatus(dashboardTexts.saving);
      const url = await saveEmergencyData(podBaseUrl, toEmergencyData());
      await makeEmergencyPrivate(podBaseUrl);
      setIsPublic(false);

      setStatus(`${dashboardTexts.savedPrivate}: ${url}`);

      setValidationErrors(new Set());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`error: ${msg}`);
    }
  }

  async function handlePreviewRdf() {
    try {
      setStatus("fetching rdf…");
      const res = await solidFetch(`${podBaseUrl}public/emergency.ttl`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const txt = await res.text();
      setRawRdf(txt);
      setStatus("rdf loaded");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`error: ${msg}`);
    }
  }

  const handleNgoSelection = (ngo: string) => {
    if (trustedNgos.includes(ngo)) {
      setTrustedNgos(trustedNgos.filter((item) => item !== ngo));
    } else {
      setTrustedNgos([...trustedNgos, ngo]);
    }
  };

  const addNgoToList = () => {
    const trimmed = newNgo.trim();
    if (!trimmed) return;

    if (!allNgos.includes(trimmed)) {
      setAllNgos([...allNgos, trimmed]);
    }

    setNewNgo("");
  };

  const selectAllNGOs = () => {
    setTrustedNgos([...allNgos]);
  };

  const deselectAllNGOs = () => {
    setTrustedNgos([]);
  };

  const deleteSelectedNGOs = () => {
    if (trustedNgos.length === 0) {
      return;
    }

    const remaining = allNgos.filter((ngo) => !trustedNgos.includes(ngo));
    setAllNgos(remaining);
    setTrustedNgos([]);

    setNgoAccessMap((prev) => {
      const updated: { [webId: string]: boolean } = { ...prev };
      for (const ngo of trustedNgos) {
        delete updated[ngo];
      }
      return updated;
    });

    setStatus(dashboardTexts.ngosRemovedFromList);
  };

  async function allowAccessToSelectedNGOs() {
    if (!loggedIn || !webId) {
      setStatus("Please log in as a refugee first.");
      return;
    }

    if (!podBaseUrl) {
      setStatus("Could not detect your Pod base URL.");
      return;
    }

    if (trustedNgos.length === 0) {
      setStatus(dashboardTexts.pleaseSelectAtLeastOneNgo);
      return;
    }

    setStatus(dashboardTexts.grantingAccess);

    const emergencyFileUrl = podBaseUrl.endsWith("/")
      ? podBaseUrl + "public/emergency.ttl"
      : podBaseUrl + "/public/emergency.ttl";

    try {
      await grantAccessToSelectedNGOs(
        trustedNgos,
        podBaseUrl,
        webId,
        language,
      );

      const updatedMap: { [webId: string]: boolean } = {};

      for (const ngo of allNgos) {
        try {
          const access = await universalAccess.getAgentAccess(
            emergencyFileUrl,
            ngo,
            { fetch: solidFetch },
          );
          updatedMap[ngo] = !!access?.read;
        } catch {
          updatedMap[ngo] = false;
        }
      }

      setNgoAccessMap(updatedMap);
      setStatus(dashboardTexts.accessGrantedForSelectedNgos);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      const updatedMap: { [webId: string]: boolean } = {};

      for (const ngo of allNgos) {
        try {
          const access = await universalAccess.getAgentAccess(
            emergencyFileUrl,
            ngo,
            { fetch: solidFetch },
          );
          updatedMap[ngo] = !!access?.read;
        } catch {
          updatedMap[ngo] = false;
        }
      }

      setNgoAccessMap(updatedMap);

      const granted = trustedNgos.filter((ngo) => updatedMap[ngo]);
      const failedAfter = trustedNgos.filter((ngo) => !updatedMap[ngo]);

      if (granted.length > 0 && failedAfter.length === 0) {
        setStatus(dashboardTexts.accessGrantedForSelectedNgos);
      } else if (granted.length > 0 && failedAfter.length > 0) {
        setStatus(
          `Access granted for ${granted.length} NGO(s); failed for ${failedAfter.length}: ${failedAfter.join(", ")}`,
        );
      } else {
        setStatus(msg);
      }
    }
  }

  async function revokeAccessForSelectedNGOs() {
    if (!loggedIn || !webId) {
      setStatus("Please log in as a refugee first.");
      return;
    }

    if (!podBaseUrl) {
      setStatus("Could not detect your Pod base URL.");
      return;
    }

    if (trustedNgos.length === 0) {
      setStatus("Please select at least one NGO.");
      return;
    }

    setStatus(dashboardTexts.revokingAccess);

    const emergencyFileUrl = podBaseUrl.endsWith("/")
      ? podBaseUrl + "public/emergency.ttl"
      : podBaseUrl + "/public/emergency.ttl";

    try {
      await revokeAccessFromSelectedNGOs(trustedNgos, podBaseUrl, webId);

      const updatedMap: { [webId: string]: boolean } = {};

      for (const ngo of allNgos) {
        try {
          const access = await universalAccess.getAgentAccess(
            emergencyFileUrl,
            ngo,
            { fetch: solidFetch },
          );
          updatedMap[ngo] = !!access?.read;
        } catch {
          updatedMap[ngo] = false;
        }
      }

      setNgoAccessMap(updatedMap);
      setStatus(dashboardTexts.accessRevoked);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      const updatedMap: { [webId: string]: boolean } = {};

      for (const ngo of allNgos) {
        try {
          const access = await universalAccess.getAgentAccess(
            emergencyFileUrl,
            ngo,
            { fetch: solidFetch },
          );
          updatedMap[ngo] = !!access?.read;
        } catch {
          updatedMap[ngo] = false;
        }
      }

      setNgoAccessMap(updatedMap);

      const revoked = trustedNgos.filter((ngo) => !updatedMap[ngo]);
      const stillHave = trustedNgos.filter((ngo) => updatedMap[ngo]);

      if (revoked.length > 0 && stillHave.length === 0) {
        setStatus("Access revoked for selected NGOs.");
      } else if (revoked.length > 0 && stillHave.length > 0) {
        setStatus(
          `Access revoked for ${revoked.length} NGO(s); failed for ${stillHave.length}: ${stillHave.join(", ")}`,
        );
      } else {
        setStatus(msg);
      }
    }
  }

  async function initNgoInbox() {
    if (!loggedIn || role !== "ngo") {
      setNgoStatus("Please log in as an NGO first.");
      return;
    }

    if (!podBaseUrl) {
      setNgoStatus("Could not detect your Pod base URL.");
      return;
    }

    const base = podBaseUrl.endsWith("/")
      ? podBaseUrl.slice(0, -1)
      : podBaseUrl;
    const indexUrl = `${base}/public/refugeesGranted.ttl`;

    try {
      setNgoStatus("Checking inbox status...");

      try {
        await getSolidDataset(indexUrl, { fetch: solidFetch });
        setNgoStatus("NGO inbox already initialised!");
        return;
      } catch {
        // File does NOT exist – continue to create it
      }

      setNgoStatus("Initialising NGO inbox...");

      const emptyDataset = createSolidDataset();

      await saveSolidDatasetAt(indexUrl, emptyDataset, {
        fetch: solidFetch,
      });

      await universalAccess.setPublicAccess(
        indexUrl,
        { read: true, append: true, write: true },
        { fetch: solidFetch },
      );

      setNgoStatus("NGO inbox initialised successfully.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNgoStatus(`Error initialising NGO inbox: ${msg}`);
    }
  }

  async function loadNgoGrants() {
    if (!loggedIn) {
      setNgoStatus("Please log in first.");
      return;
    }

    if (typeof role !== "undefined" && role !== "ngo") {
      setNgoStatus("Please log in as an NGO to see this list.");
      return;
    }

    if (!podBaseUrl) {
      setNgoStatus("Could not detect your Pod URL.");
      return;
    }

    const base = podBaseUrl.endsWith("/")
      ? podBaseUrl.slice(0, -1)
      : podBaseUrl;
    const indexUrl = `${base}/public/refugeesGranted.ttl`;

    try {
      setNgoStatus("Loading refugees who granted you access…");

      const dataset = await getSolidDataset(indexUrl, { fetch: solidFetch });
      const things = getThingAll(dataset);

      const grants: NgoGrant[] = things
        .filter((t) => getUrl(t, RDF_TYPE) === `${EX}Grant`)
        .map((t) => ({
          refugeeWebId: t.url,
          emergencyFileUrl: getUrl(t, `${EX}emergencyFile`) ?? "",
          grantedAt: getStringNoLocale(t, `${EX}grantedAt`) ?? "",
        }))
        .filter((g) => g.refugeeWebId && g.emergencyFileUrl);

      if (!grants.length) {
        setNgoStatus("No refugees have granted you access yet.");
      } else {
        setNgoStatus(
          `Found ${grants.length} refugee(s) who granted you access.`,
        );
      }

      setNgoGrants(grants);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      if (msg.includes("404")) {
        setNgoStatus("No refugees have granted you access yet.");
        setNgoGrants([]);
      } else {
        setNgoStatus(`Error while loading index: ${msg}`);
        setNgoGrants([]);
      }
    }
  }

  async function queryRefugeeDataDashboard() {
    if (!loggedIn || role !== "ngo") {
      setNgoQueryError("Please log in as an NGO first.");
      return;
    }

    if (ngoGrants.length === 0) {
      setNgoQueryError(
        "No refugees have granted you access yet. Load grants first.",
      );
      return;
    }

    setNgoQueryLoading(true);
    setNgoQueryError("");
    setIsQueryComplete(false);

    try {
      const emergencyFileUrls = ngoGrants.map(
        (grant) => grant.emergencyFileUrl,
      );

      const refugeeData = await queryRefugeeData(emergencyFileUrls, solidFetch);

      const enrichedData = attachGrantsBySource(refugeeData, ngoGrants);
      const failedGrants = findGrantsWithoutResults(refugeeData, ngoGrants);

      setRawNgoData(enrichedData);
      setIsQueryComplete(true);

      if (failedGrants.length > 0) {
        const failedWebIds: string[] = [];
        for (const grant of failedGrants) {
          failedWebIds.push(grant.refugeeWebId);
        }
        setNgoStatus(
          `Data fetched, but ${failedGrants.length} refugee file(s) could not be read: ${failedWebIds.join(", ")}. Please apply filters to visualize.`,
        );
      } else {
        setNgoStatus("Data fetched. Please apply filters to visualize.");
      }

      if (webId) {
        await logViewsForAllGrants(ngoGrants, webId);
      }

      setNgoQueryData([]);
      setNgoCountryStats([]);
      setChartFieldLabel("Country");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setNgoQueryError(`Query error: ${msg}`);
      setNgoStatus(`Error: ${msg}`);
    } finally {
      setNgoQueryLoading(false);
    }
  }

  function getValueForField(
    row: RefugeeData,
    field: string,
  ): string | undefined {
    switch (field) {
      case "Country":
        return row.country;
      case "Town":
        return row.town;
      case "Nationality":
        return row.nationality;
      case "Location Type":
        return row.locationType;
      case "Accommodation":
        return row.accommodation;
      case "Needs":
        return row.accommodationNeeds;
      case "Age":
        return row.age !== undefined ? row.age.toString() : undefined;
      case "Number of Victims":
        return row.numberOfVictims !== undefined
          ? row.numberOfVictims.toString()
          : undefined;
      case "Date":
        return row.recordDate;
      case "Category":
        return row.victimCategory;
      case "State / Region":
        return row.state;
      case "Village":
        return row.village;
      case "Location Name":
        return row.locationName;
      case "Captivity Status":
        return row.captivityStatus;
      case "Gender":
        return row.gender;
      case "Why Need Help":
        return row.helpReasons;
      case "Uploaded Picture":
        return row.evidenceUrls && row.evidenceUrls.trim() !== ""
          ? "Yes"
          : "No";

      default:
        return undefined;
    }
  }

  function handleVisualize() {
    let filteredData = rawNgoData;

    if (filterField !== "All" && filterValue) {
      filteredData = rawNgoData.filter((item) => {
        const v = getValueForField(item, filterField);
        if (!v) return false;

        if (filterField === "Uploaded Picture") {
          return filterValue === "Yes" ? v === "Yes" : v === "No";
        }

        if (filterField === "Why Need Help") {
          const reasons = v
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);
          return reasons.includes(filterValue);
        }

        return v === filterValue;
      });
    }

    setNgoQueryData(filteredData);

    const chartField = filterField === "All" ? "Country" : filterField;
    setChartFieldLabel(chartField);

    const chartStatsMap: Record<string, number> = {};

    filteredData.forEach((row) => {
      const v = getValueForField(row, chartField) || "Unknown";

      if (chartField === "Why Need Help") {
        const reasons = v
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);

        if (reasons.length === 0) {
          chartStatsMap["Unknown"] = (chartStatsMap["Unknown"] || 0) + 1;
        } else {
          reasons.forEach((reason) => {
            chartStatsMap[reason] = (chartStatsMap[reason] || 0) + 1;
          });
        }
      } else {
        chartStatsMap[v] = (chartStatsMap[v] || 0) + 1;
      }
    });

    setNgoCountryStats(
      Object.entries(chartStatsMap).map(([country, count]) => ({
        country,
        count,
      })),
    );
  }

  const handleAddCustomItem = (
    type: "field" | "condition" | "value",
    value: string,
    fieldType?: string,
  ) => {
    const newItem: BuilderItem = {
      id: Math.random().toString(36).slice(2, 11),
      type,
      value,
      fieldType,
    };
    setQueryChain([...queryChain, newItem]);
  };

  const handleDeleteLastItem = () => {
    setQueryChain(queryChain.slice(0, -1));
  };

  const handleExecuteCustomQuery = async () => {
    setCustomQueryLoading(true);
    setCustomQueryError("");
    try {
      const emergencyFileUrls = ngoGrants.map(
        (grant) => grant.emergencyFileUrl,
      );
      const results = await executeCustomQuery(
        queryChain,
        emergencyFileUrls,
        solidFetch,
      );

      const enrichedData = attachGrantsBySource(results, ngoGrants);

      setNgoQueryData(enrichedData);

      const countryStatsMap: Record<string, number> = {};

      const lastFieldItem = [...queryChain]
        .reverse()
        .find((i) => i.type === "field");
      const chartField = lastFieldItem?.value || "Country";
      setChartFieldLabel(chartField);

      enrichedData.forEach((row) => {
        const v = getValueForField(row, chartField) || "Unknown";
        countryStatsMap[v] = (countryStatsMap[v] || 0) + 1;
      });

      setNgoCountryStats(
        Object.entries(countryStatsMap).map(([country, count]) => ({
          country,
          count,
        })),
      );

      setNgoStatus(
        `Custom query executed. Found ${enrichedData.length} records.`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setCustomQueryError(msg);
    } finally {
      setCustomQueryLoading(false);
    }
  };

  const getLastItem = () => queryChain[queryChain.length - 1];

  const canAddFilter = () => {
    const last = getLastItem();
    return (
      !last ||
      (last.type === "condition" &&
        (last.value === "AND" || last.value === "OR"))
    );
  };

  const canAddCondition = () => {
    const last = getLastItem();
    return last && (last.type === "value" || last.type === "field");
  };

  const canAddValue = () => {
    const last = getLastItem();
    return (
      last &&
      last.type === "condition" &&
      (last.value === "Equals" ||
        last.value === "Greater Than" ||
        last.value === "Less Than" ||
        last.value === "Greater Than or Equal" ||
        last.value === "Less Than or Equal")
    );
  };

  const getPriorFieldForValue = () => {
    for (let i = queryChain.length - 1; i >= 0; i--) {
      if (queryChain[i].type === "field") return queryChain[i].value;
    }
    return null;
  };

  const formatQueryChainForDisplay = (chain: BuilderItem[]) => {
    const opToSymbol = (op?: string) => {
      switch (op) {
        case "Equals":
          return "=";
        case "Greater Than":
          return ">";
        case "Less Than":
          return "<";
        case "Greater Than or Equal":
          return ">=";
        case "Less Than or Equal":
          return "<=";
        default:
          return op || "";
      }
    };

    const processClause = (items: BuilderItem[]) => {
      let field = "";
      let op = "";
      let value = "";

      for (const item of items) {
        if (item.type === "field") field = item.value;
        else if (item.type === "condition") op = opToSymbol(item.value);
        else if (item.type === "value") value = item.value;
      }

      if (!field || !op || !value) return null;

      // Display value in quotes for readability (even if numeric/date)
      return `(${field} ${op} "${value}")`;
    };

    const andGroups: string[][] = [];
    let currentOrGroup: string[] = [];
    let currentClauseItems: BuilderItem[] = [];

    for (let i = 0; i < chain.length; i++) {
      const item = chain[i];

      if (
        item.type === "condition" &&
        (item.value === "AND" || item.value === "OR")
      ) {
        const clauseStr = processClause(currentClauseItems);
        if (clauseStr) currentOrGroup.push(clauseStr);
        currentClauseItems = [];

        if (item.value === "AND") {
          if (currentOrGroup.length > 0) andGroups.push(currentOrGroup);
          currentOrGroup = [];
        }
      } else {
        currentClauseItems.push(item);
      }
    }

    const finalClauseStr = processClause(currentClauseItems);
    if (finalClauseStr) currentOrGroup.push(finalClauseStr);
    if (currentOrGroup.length > 0) andGroups.push(currentOrGroup);

    if (andGroups.length === 0) return "";

    // ORs inside a group, AND between groups — with brackets
    return andGroups
      .map((group) => (group.length > 1 ? `(${group.join(" OR ")})` : group[0]))
      .join(" AND ");
  };

  const handleToggleNgoDocs = async () => {
    const newShow = !showNgoDocs;
    setShowNgoDocs(newShow);

    if (newShow && !cdmDocs && !cdmDocsLoading) {
      try {
        setCdmDocsLoading(true);
        setCdmDocsError(null);
        await loadOntology();
        const store = getOntologyStore();
        if (!store) {
          setCdmDocsError("Could not load CDM ontology.");
          return;
        }
        const docs = buildCdmDocsFromStore(store);
        setCdmDocs(docs);
      } catch (e) {
        console.error("Failed to load CDM documentation", e);
        setCdmDocsError("Failed to load CDM documentation.");
      } finally {
        setCdmDocsLoading(false);
      }
    }
  };

  if (!ready) return <div style={{ padding: 24 }}>{loginTexts.loading}</div>;

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 154,
        maxWidth: 1150,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 32,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 0 }}>{loginTexts.title}</h1>
          <p style={{ marginTop: 4, fontSize: "1rem", color: "#555" }}>
            {loginTexts.subtitle}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              marginTop: 4,
              marginBottom: 8,
              fontSize: 14,
            }}
          >
            {loginTexts.selectLanguage}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border:
                  language === "en" ? "2px solid #007bff" : "1px solid #ccc",
                backgroundColor: language === "en" ? "#007bff" : "#ffffff",
                color: language === "en" ? "#ffffff" : "#000000",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("ti")}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border:
                  language === "ti" ? "2px solid #007bff" : "1px solid #ccc",
                backgroundColor: language === "ti" ? "#007bff" : "#ffffff",
                color: language === "ti" ? "#ffffff" : "#000000",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ትግርኛ
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("zh")}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border:
                  language === "zh" ? "2px solid #007bff" : "1px solid #ccc",
                backgroundColor: language === "zh" ? "#007bff" : "#ffffff",
                color: language === "zh" ? "#ffffff" : "#000000",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              中文
            </button>
          </div>
        </div>
      </div>

      {!loggedIn ? (
        <>
          <p
            style={{
              maxWidth: 700,
              lineHeight: 1.4,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            {loginTexts.intro}
          </p>

          <p>{loginTexts.notLoggedIn}</p>

          <p
            style={{
              marginTop: 12,
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            {loginTexts.logInAs}
          </p>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                setRole("refugee");
                window.localStorage.setItem("userRole", "refugee");
                onLogin();
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {loginTexts.btnRefugee}
            </button>

            <button
              onClick={() => {
                setRole("ngo");
                window.localStorage.setItem("userRole", "ngo");
                onLogin();
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#6d28d9",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {loginTexts.btnNgo}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            <strong>{dashboardTexts.loggedIn}</strong>
          </p>
          <p>
            {dashboardTexts.yourWebId} <code>{webId}</code>
          </p>
          <button
            onClick={onLogout}
            style={{
              maxWidth: "20%",
              padding: "8px 24px",
              backgroundColor: "#6d6061ff",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {dashboardTexts.logout}
          </button>
          {loggedIn && role === "refugee" && (
            <>
              <hr style={{ margin: "24px 0" }} />

              <h3>{dashboardTexts.podAndFile}</h3>
              <input
                value={podBaseUrl}
                onChange={(e) => setPodBaseUrl(e.target.value)}
                placeholder="Pod base URL"
                style={{
                  maxWidth: "45%",
                  padding: 8,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  marginTop: 24,
                }}
              >
                {/* LEFT COLUMN */}
                <div>
                  <h4>
                    <span style={{ color: "#dc3545" }}>*</span>-{" "}
                    {dashboardTexts.mandatoryNote}
                  </h4>
                  <h2>{dashboardTexts.record}</h2>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.recordId}
                    </label>
                    <input
                      value={recordId}
                      disabled
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        backgroundColor: "#ffffff",
                        color: "#000000",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.date}
                    </label>
                    <input
                      type="date"
                      value={recordDate}
                      disabled
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        backgroundColor: "#ffffff",
                        color: "#000000",
                      }}
                    />
                  </div>

                  <h2>{dashboardTexts.myDetails}</h2>

                  {/* My Secure Data Place ID (read-only) */}
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.myId}
                    </label>
                    <input
                      value={victimId}
                      disabled
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        backgroundColor: "#ffffff",
                        color: "#000000",
                      }}
                    />
                  </div>

                  {/* Individual person information */}
                  <SearchableDropdown
                    label={dashboardTexts.nationality}
                    value={nationality}
                    onChange={setNationality}
                    options={NATIONALITIES}
                    placeholder={dashboardTexts.searchPlaceholder}
                    emptyText={ngoTexts.noResults}
                  />

                  <SimpleDropdown
                    label={dashboardTexts.gender}
                    value={victimGender}
                    onChange={setVictimGender}
                    options={GENDER_VALUES}
                    getOptionLabel={getGenderLabel}
                    placeholder={dashboardTexts.selectPlaceholder}
                  />

                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.age}
                    </label>
                    <input
                      type="number"
                      value={victimAge}
                      onChange={(e) => setVictimAge(e.target.value)}
                      placeholder={dashboardTexts.enterAge}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  {/* Group information */}
                  <SimpleDropdown
                    label={dashboardTexts.category}
                    value={victimCategory}
                    onChange={setVictimCategory}
                    options={CATEGORY_VALUES}
                    getOptionLabel={getCategoryLabel}
                    placeholder={dashboardTexts.selectPlaceholder}
                    hasError={validationErrors.has("victimCategory")}
                  />

                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.numberInGroup}{" "}
                      <span style={{ color: "#dc3545" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={numberOfVictims}
                      onChange={(e) => setNumberOfVictims(e.target.value)}
                      placeholder={dashboardTexts.enterNumber}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: validationErrors.has("numberOfVictims")
                          ? "2px solid #dc3545"
                          : "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <SearchableDropdown
                      label={dashboardTexts.groupMembersNationality}
                      value={groupNationalityInput}
                      onChange={setGroupNationalityInput}
                      options={NATIONALITIES}
                      placeholder={dashboardTexts.searchPlaceholder}
                      emptyText={ngoTexts.noResults}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          groupNationalityInput &&
                          !groupNationalities.includes(groupNationalityInput)
                        ) {
                          setGroupNationalities([
                            ...groupNationalities,
                            groupNationalityInput,
                          ]);
                          setGroupNationalityInput("");
                        }
                      }}
                      style={{
                        marginTop: 4,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        backgroundColor: "#f3f4f6",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      {dashboardTexts.addNationality}
                    </button>
                    {groupNationalities.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        {dashboardTexts.selectedLabel}{" "}
                        {groupNationalities.map((n, i) => (
                          <span
                            key={n}
                            style={{
                              display: "inline-block",
                              marginRight: 4,
                            }}
                            onClick={() =>
                              setGroupNationalities(
                                groupNationalities.filter((x) => x !== n),
                              )
                            }
                          >
                            {n}
                            {i < groupNationalities.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <SimpleDropdown
                    label={dashboardTexts.groupGenders}
                    value={groupGenders}
                    onChange={setGroupGenders}
                    options={GROUP_GENDER_VALUES}
                    getOptionLabel={getGroupGenderLabel}
                  />

                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.groupAges}
                    </label>
                    <input
                      type="text"
                      value={groupAges}
                      onChange={(e) => setGroupAges(e.target.value)}
                      placeholder="e.g. 8–12, 34, 56"
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  <h2>{dashboardTexts.whereAreYou}</h2>

                  <SearchableDropdown
                    label={dashboardTexts.country}
                    value={country}
                    onChange={setCountry}
                    options={COUNTRIES}
                    hasError={validationErrors.has("country")}
                    placeholder={dashboardTexts.searchPlaceholder}
                    emptyText={ngoTexts.noResults}
                  />
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.state}
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder={dashboardTexts.enterState}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.town}
                    </label>
                    <input
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      placeholder={dashboardTexts.enterTown}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.village}
                    </label>
                    <input
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder={dashboardTexts.enterVillage}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.latitude}
                    </label>
                    <input
                      value={latitude}
                      disabled
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        backgroundColor: "#f5f5f5",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.longitude}
                    </label>
                    <input
                      value={longitude}
                      disabled
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        backgroundColor: "#f5f5f5",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
                    {dashboardTexts.gpsNote}
                  </p>
                  <button
                    onClick={handleGetGPS}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 16,
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {dashboardTexts.getGps}
                  </button>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.locationId}
                    </label>
                    <input
                      value={locationId}
                      disabled
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        backgroundColor: "#ffffff",
                        color: "#000000",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.locationName}
                    </label>
                    <input
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder={dashboardTexts.enterLocationName}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <SimpleDropdown
                    label={dashboardTexts.locationType}
                    value={locationType}
                    onChange={setLocationType}
                    options={LOCATION_TYPE_VALUES}
                    getOptionLabel={getLocationTypeLabel}
                    hasError={validationErrors.has("locationType")}
                    placeholder={dashboardTexts.selectPlaceholder}
                  />
                </div>

              {/* RIGHT COLUMN */}
                <div>
                  <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <h2>{dashboardTexts.whyNeedHelp}</h2>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>
                      {dashboardTexts.youCanTick}
                    </p>
                    {HELP_REASON_VALUES.map((reasonKey) => 
                      (
                      <label
                        key={reasonKey}
                        style={{ display: "block", marginBottom: 4 }}
                      >
                        <input
                          type="checkbox"
                          checked={helpReasons.includes(reasonKey)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setHelpReasons([...helpReasons, reasonKey]);
                            } else {
                              setHelpReasons(
                                helpReasons.filter((r) => r !== reasonKey),
                              );
                            }
                          }}
                          style={{ marginRight: 8 }}
                        />
                        {getHelpReasonLabel(reasonKey)}
                      </label>
                    ))}
                  </div>
                  <h2>{dashboardTexts.currentSituation}</h2>
                  <div style={{ marginBottom: 8 }}>
                    <SimpleDropdown
                      label={dashboardTexts.placeStaying}
                      value={accommodation}
                      onChange={setAccommodation}
                      options={ACCOMMODATION_VALUES}
                      getOptionLabel={getAccommodationLabel}
                      placeholder={dashboardTexts.selectPlaceholder}
                    />

                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.moreSituationDetails}
                    </label>
                    <textarea
                      value={situationDescription}
                      onChange={(e) => setSituationDescription(e.target.value)}
                      placeholder={dashboardTexts.enterSituationDescription}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        minHeight: 100,
                      }}
                    />
                  </div>
                  

<div style={{ marginTop: 16, marginBottom: 16 }}>
  <h2>{dashboardTexts.yourNeeds}</h2>
  <p style={{ fontSize: 14, marginBottom: 8 }}>
    {dashboardTexts.youCanTick}
  </p>

  {NEEDS_VALUES.map((needKey) => (
    <label
      key={needKey}
      style={{ display: "block", marginBottom: 4, cursor: "pointer" }}
    >
      <input
        type="checkbox"
        checked={accommodationNeeds?.includes(needKey)}
        onChange={(e) => {
          setAccommodationNeeds((prev: string[]) => {
            if (e.target.checked) {
              // add safely (avoid duplicates)
              if (!prev.includes(needKey)) {
                return [...prev, needKey];
              }
              return prev;
            } else {
              // remove safely
              return prev.filter((item) => item !== needKey);
            }
          });
        }}
        style={{ marginRight: 8 }}
      />

      {getNeedsLabel(needKey)}
    </label>
  ))}
</div>
{/* ====================== HEALTH SECTION ====================== */}
<h2>{dashboardTexts.health}</h2>

{/* Trauma / Visible Injuries */}
<div style={{ marginBottom: 16 }}>
  <h2>{dashboardTexts.trauma}</h2>
  <p style={{ fontSize: 14, marginBottom: 8 }}>
    {dashboardTexts.youCanTick}
  </p>
  {TRAUMA_VALUES.map((item, index) => {
    const key = ["traumaCuts", "traumaBruises", "traumaBurns", "traumaFractures",
                 "traumaHeadInjury", "traumaGunshot", "traumaSexualViolence",
                 "traumaDehydration", "traumaOther"][index];

    return (
      <label
        key={item}
        style={{ display: "block", marginBottom: 4 }}
      >
        <input
          type="checkbox"
          checked={trauma.includes(item)}
          onChange={(e) => {
            if (e.target.checked) {
              setTrauma([...trauma, item]);
            } else {
              setTrauma(trauma.filter((t) => t !== item));
            }
          }}
          style={{ marginRight: 8 }}
        />
        {language === "en" ? item : dashboardTexts[key as keyof typeof dashboardTexts]}
      </label>
    );
  })}
</div>

{/* Health Status - Free text */}
<div style={{ marginBottom: 16 }}>
  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
    {dashboardTexts.healthStatus}
  </label>
  <textarea
    value={healthStatus}
    onChange={(e) => setHealthStatus(e.target.value)}
    placeholder={dashboardTexts.enterHealthStatus}
    style={{
      width: "100%",
      padding: 8,
      border: "1px solid #ccc",
      borderRadius: 4,
      minHeight: 80,
    }
  /* ===================*/}
  />
</div>


                  <div style={{ marginBottom: 8 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {dashboardTexts.moreNeedsDetails}
                    </label>
                    <textarea
                      value={needsDescription}
                      onChange={(e) => setNeedsDescription(e.target.value)}
                      placeholder={dashboardTexts.enterNeedsDescription}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        minHeight: 100,
                      }}
                    />
                  </div>
     <SimpleDropdown
  label={dashboardTexts.captivityStatus}
  value={captivityStatus}
  onChange={(value) => {
    setCaptivityStatus(value);

    // clear previous input when not "Yes"
    if (value !== "Yes") {
      setCaptivityDetail("");
    }
  }}
  options={CAPTIVITY_STATUS_VALUES}
  getOptionLabel={getCaptivityStatusLabel}
  hasError={validationErrors.has("captivityStatus")}
  placeholder={dashboardTexts.selectPlaceholder}
/>

{/* Added by zebrehe */}
{captivityStatus === "Yes" && (
  <div style={{ marginTop: "10px" }}>
    {dashboardTexts.CaptivityDetail}
    <textarea
      value={CaptivityDetail}
      onChange={(e) => setCaptivityDetail(e.target.value)}
      rows={4}
      style={{ width: "100%", padding: "8px", marginTop: "5px" }}
    />
  </div>
)}
 {/* Added by zebrehe */}

                  {/* Extra information for supporters */}
                  <div style={{ marginBottom: 16 }}>
                    <h2>{dashboardTexts.extraInfoQuestion}</h2>
                    <textarea
                      value={extraInfo}
                      onChange={(e) => setExtraInfo(e.target.value)}
                      placeholder={dashboardTexts.additionalInfoPlaceholder}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Upload pictures / proof */}
                  <div style={{ marginBottom: 16 }}>
                    <h2>{dashboardTexts.uploadPicturesTitle}</h2>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>
                      {dashboardTexts.uploadPicturesInfo}
                    </p>

                    {/* HIDDEN REAL FILE INPUT */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEvidenceInputChange}
                      style={{ display: "none" }}
                    />

                    {/* CUSTOM BUTTON THAT OPENS FILE PICKER */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#f3f4f6",
                        color: "#000000",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {dashboardTexts.chooseFiles}
                    </button>

                    {/* STATUS MESSAGE: "no files selected" or the selected files message */}
                    <p style={{ marginTop: 4, marginBottom: 8, fontSize: 13 }}>
                      {evidenceUploadStatus ?? dashboardTexts.noFilesSelected}
                    </p>

                    <div>
                      <button
                        type="button"
                        onClick={handleEvidenceUploadClick}
                        disabled={evidenceFiles.length === 0}
                        style={{
                          padding: "8px 16px",
                          backgroundColor:
                            evidenceFiles.length === 0 ? "#ccc" : "#0069d9",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor:
                            evidenceFiles.length === 0
                              ? "not-allowed"
                              : "pointer",
                          fontSize: 14,
                        }}
                      >
                        {dashboardTexts.uploadSelected}
                      </button>
                    </div>

                    {evidenceUrls.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {evidenceUrls.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt="Uploaded evidence"
                            style={{
                              maxWidth: 120,
                              maxHeight: 120,
                              objectFit: "cover",
                              borderRadius: 4,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact options */}
                  <div style={{ marginBottom: 16 }}>
                    <h2>{dashboardTexts.waysToContact}</h2>

                    <div style={{ marginBottom: 8 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: 4,
                          fontWeight: 500,
                        }}
                      >
                        {dashboardTexts.myPhoneNumber}
                      </label>
                      <input
                        type="text"
                        value={contactPhoneSelf}
                        onChange={(e) => setContactPhoneSelf(e.target.value)}
                        placeholder="+123…"
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: 4,
                          fontWeight: 500,
                        }}
                      >
                        {dashboardTexts.phoneOfSomeoneWhoKnowsMe}
                      </label>
                      <input
                        type="text"
                        value={contactPhoneTrusted}
                        onChange={(e) => setContactPhoneTrusted(e.target.value)}
                        placeholder="+123…"
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: 4,
                          fontWeight: 500,
                        }}
                      >
                        {dashboardTexts.socialMediaHandles}
                      </label>
                      <input
                        type="text"
                        value={contactMessenger}
                        onChange={(e) => setContactMessenger(e.target.value)}
                        placeholder={dashboardTexts.messengerWhatsappSignal}
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                          marginBottom: 6,
                        }}
                      />
                      <input
                        type="text"
                        value={contactOtherHandles}
                        onChange={(e) => setContactOtherHandles(e.target.value)}
                        placeholder={dashboardTexts.otherHandles}
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                        }}
                      />
                    </div>
                  </div>

                  {/* Contact someone else */}
                  <div style={{ marginBottom: 16 }}>
                    <h2>{dashboardTexts.contactSomeoneElse}</h2>
                    <textarea
                      value={contactRequest}
                      onChange={(e) => setContactRequest(e.target.value)}
                      placeholder={dashboardTexts.writeWhoToContact}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 24,
                    }}
                  >
                    <button
                      onClick={handleSave}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {dashboardTexts.saveToMySecureDataPlace}
                    </button>
                    {validationErrors.size > 0 && (
                      <div
                        style={{
                          color: "#dc3545",
                          fontSize: 14,
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {dashboardTexts.requiredFieldsMessage}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    <button
                      onClick={handlePreviewRdf}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {dashboardTexts.previewRdfCode}
                    </button>
                    {/*<button
                      onClick={handleMakePublic}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Make Public
                    </button>
                    <button
                      onClick={handleMakePrivate}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Make Private
                    </button>*/}
                  </div>
                  <div>
                    <h3>{dashboardTexts.status}</h3>
                    <div
                      style={{
                        fontSize: 12,
                        padding: 12,
                        backgroundColor: "#f5f5f5",
                        color: "#000000",
                        borderRadius: 4,
                        minHeight: 60,
                      }}
                    >
                      {status}
                    </div>
                    <div style={{ marginTop: -8, fontSize: 12 }}>
                      <strong>{dashboardTexts.emergencyFilePublicLabel}</strong>{" "}
                      {isPublic === null
                        ? dashboardTexts.unknown
                        : isPublic
                          ? dashboardTexts.yes
                          : dashboardTexts.no}
                    </div>

                    {rawRdf && (
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          background: "#f6f8fa",
                          color: "#000000",
                          padding: 12,
                          borderRadius: 6,
                          marginTop: 16,
                          fontSize: 10,
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        {rawRdf}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
              <hr style={{ margin: "24px 0" }} />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3>{dashboardTexts.selectTrustedNgos}</h3>
                  {allNgos.map((ngo, index) => {
                    const hasAccess = ngoAccessMap[ngo];
                    const hasViewed = ngoViewMap[ngo];

                    return (
                      <label
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={trustedNgos.includes(ngo)}
                          onChange={() => handleNgoSelection(ngo)}
                        />

                        <div
                          style={{
                            marginLeft: 8,
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: hasAccess ? 600 : 400,
                              color: hasAccess ? "#198754" : "#f46f6fff",
                              textDecoration: hasAccess ? "underline" : "none",
                            }}
                          >
                            {ngo}
                            {hasAccess && (
                              <span style={{ marginLeft: 6 }}>
                                ✓{" "}
                                {hasViewed
                                  ? dashboardTexts.hasAccessedYourFile
                                  : dashboardTexts.alreadyHasAccess.replace(
                                      /^✓\s*/,
                                      "",
                                    )}
                              </span>
                            )}
                          </span>

                          {hasViewed && (
                            <span
                              style={{
                                marginTop: 2,
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 4,
                                backgroundColor: "#ffe0f0",
                                color: "#b30059",
                                border: "1px solid #f5b2d1",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {dashboardTexts.ngoViewedYourData}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}

                  <div style={{ marginTop: 16 }}>
                    <input
                      type="text"
                      value={newNgo}
                      onChange={(e) => setNewNgo(e.target.value)}
                      placeholder={dashboardTexts.addNewNgo}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    />
                    <button
                      onClick={addNgoToList}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      {dashboardTexts.addNgo}
                    </button>
                    <button
                      onClick={selectAllNGOs}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      {dashboardTexts.selectAll}
                    </button>
                    <button
                      onClick={deselectAllNGOs}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      {dashboardTexts.deselectAll}
                    </button>
                    <button
                      onClick={deleteSelectedNGOs}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        marginTop: 8,
                        display: "inline-block",
                      }}
                    >
                      {dashboardTexts.deleteSelectedNgos}
                    </button>
                  </div>

                  <button
                    onClick={allowAccessToSelectedNGOs}
                    style={{
                      width: "100%",
                      padding: "8px 16px",
                      marginTop: 16,
                      backgroundColor: "#ffc107",
                      color: "black",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {dashboardTexts.allowTrustedRead}
                  </button>

                  <button
                    onClick={revokeAccessForSelectedNGOs}
                    style={{
                      width: "100%",
                      padding: "8px 16px",
                      marginTop: 8,
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {dashboardTexts.revokeSelectedAccess}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {loggedIn && role === "ngo" && (
        <div style={{ marginTop: "24px" }}>
          <h2>{ngoTexts.dashboardTitle}</h2>
          <p>{ngoTexts.loggedInAsNgo}</p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            <button
              onClick={initNgoInbox}
              style={{ padding: "6px 12px", marginRight: 4 }}
            >
              {ngoTexts.initInbox}
            </button>

            <button
              onClick={loadNgoGrants}
              style={{ padding: "6px 12px", marginRight: 4 }}
            >
              {ngoTexts.loadRefugees}
            </button>

            <button
              onClick={handleToggleNgoDocs}
              style={{
                padding: "6px 12px",
                marginRight: 4,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {showNgoDocs ? ngoTexts.hideCdm : ngoTexts.showCdm}
            </button>
          </div>

          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            {ngoQueryError || ngoStatus}
          </p>

          <h3>
            {ngoTexts.refugeesGranted} ({ngoGrants.length})
          </h3>
          {ngoGrants.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                marginBottom: 16,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {ngoGrants.map((grant, i) => (
                <div
                  key={i}
                  style={{
                    padding: 8,
                    borderBottom:
                      i === ngoGrants.length - 1 ? "none" : "1px solid #eee",
                  }}
                >
                  <div>
                    <strong>{ngoTexts.refugeeWebId}</strong> {grant.refugeeWebId}
                  </div>
                  <div>
                    <strong>{ngoTexts.emergencyFile}</strong>{" "}
                    <code style={{ fontSize: 12 }}>
                      {grant.emergencyFileUrl}
                    </code>
                  </div>
                  {grant.grantedAt && (
                    <div>
                      <strong>{ngoTexts.grantedAt}</strong>{" "}
                      {new Date(grant.grantedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showNgoDocs && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                {ngoTexts.cdmDocsTitle}
              </h3>
              <p style={{ fontSize: 14, marginBottom: 8 }}>
                {ngoTexts.cdmDocsIntro}
              </p>

              {cdmDocsLoading && (
                <p style={{ fontSize: 14 }}>{ngoTexts.loadingCdm}</p>
              )}

              {cdmDocsError && (
                <p style={{ fontSize: 14, color: "#b91c1c" }}>{cdmDocsError}</p>
              )}

              {!cdmDocsLoading && !cdmDocsError && cdmDocs && (
                <>
                  <h4 style={{ marginBottom: 4 }}>{ngoTexts.coreClasses}</h4>
                  <ul style={{ fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                    {cdmDocs.classes.map((t) => (
                      <li key={t.localName}>
                        <strong>{`hds:${t.localName}`}</strong> –{" "}
                        {t.comment || t.label}
                      </li>
                    ))}
                  </ul>

                  <h4 style={{ marginBottom: 4 }}>{ngoTexts.recordProperties}</h4>
                  <ul style={{ fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                    {cdmDocs.record.map((t) => (
                      <li key={t.localName}>
                        <strong>{`hds:${t.localName}`}</strong> –{" "}
                        {t.comment || t.label}
                      </li>
                    ))}
                  </ul>

                  <h4 style={{ marginBottom: 4 }}>{ngoTexts.victimProperties}</h4>
                  <ul style={{ fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                    {cdmDocs.victim.map((t) => (
                      <li key={t.localName}>
                        <strong>{`hds:${t.localName}`}</strong> –{" "}
                        {t.comment || t.label}
                      </li>
                    ))}
                  </ul>

                  <h4 style={{ marginBottom: 4 }}>{ngoTexts.locationProperties}</h4>
                  <ul style={{ fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                    {cdmDocs.location.map((t) => (
                      <li key={t.localName}>
                        <strong>{`hds:${t.localName}`}</strong> –{" "}
                        {t.comment || t.label}
                      </li>
                    ))}
                  </ul>

                  <h4 style={{ marginBottom: 4 }}>
                    {ngoTexts.situationProperties}
                  </h4>
                  <ul style={{ fontSize: 14, marginTop: 4, marginBottom: 0 }}>
                    {cdmDocs.situation.map((t) => (
                      <li key={t.localName}>
                        <strong>{`hds:${t.localName}`}</strong> –{" "}
                        {t.comment || t.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={queryRefugeeDataDashboard}
              disabled={ngoQueryLoading}
              style={{
                padding: "8px 16px",
                backgroundColor: ngoQueryLoading ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: ngoQueryLoading ? "not-allowed" : "pointer",
              }}
            >
              {ngoQueryLoading ? ngoTexts.querying : ngoTexts.queryData}
            </button>

            {isQueryComplete && (
              <button
                onClick={() => setCustomQueryMode(!customQueryMode)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6f42c1",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {customQueryMode
                  ? ngoTexts.exitCustomMode
                  : ngoTexts.enterCustomMode}
              </button>
            )}
          </div>

          {!customQueryMode && isQueryComplete && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 6,
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                {ngoTexts.filterData}
              </h4>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                      fontWeight: "bold",
                    }}
                  >
                    {ngoTexts.selectField}
                  </label>
                  <select
                    value={filterField}
                    onChange={(e) => {
                      setFilterField(e.target.value);
                      setFilterValue("");
                    }}
                    style={{
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      minWidth: 150,
                    }}
                  >
                    <option value="All">{ngoTexts.allNoFilter}</option>
                    <option value="Country">{ngoTexts.fieldCountry}</option>
                    <option value="Town">{ngoTexts.fieldTown}</option>
                    <option value="Nationality">{ngoTexts.fieldNationality}</option>
                    <option value="Location Type">{ngoTexts.fieldLocationType}</option>
                    <option value="Accommodation">{ngoTexts.fieldAccommodation}</option>
                    <option value="Needs">{ngoTexts.fieldNeeds}</option>
                    <option value="Age">{ngoTexts.fieldAge}</option>
                    <option value="Number of Victims">{ngoTexts.fieldVictims}</option>
                    <option value="Date">{ngoTexts.fieldDate}</option>
                    <option value="Category">{ngoTexts.fieldCategory}</option>
                    <option value="State / Region">{ngoTexts.fieldState}</option>
                    <option value="Village">{ngoTexts.fieldVillage}</option>
                    <option value="Location Name">{ngoTexts.fieldLocationName}</option>
                    <option value="Captivity Status">{ngoTexts.fieldCaptivity}</option>
                    <option value="Gender">{ngoTexts.fieldGender}</option>
                    <option value="Why Need Help">{ngoTexts.fieldWhyNeedHelp}</option>
                    <option value="Uploaded Picture">{ngoTexts.fieldUploadedPicture}</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                      fontWeight: "bold",
                    }}
                  >
                    {ngoTexts.selectValue}
                  </label>
                  {filterField === "Date" ? (
                    <input
                      type="date"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        minWidth: 150,
                      }}
                    />
                  ) : (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      disabled={filterField === "All"}
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        minWidth: 150,
                      }}
                    >
                      {filterField !== "All" && (
                        <>
                          <option value="">{ngoTexts.all}</option>

                          {(() => {
                            let values: string[] = [];

                            if (filterField === "Why Need Help") {
                              values = Array.from(
                                new Set(
                                  rawNgoData.flatMap((item) =>
                                    (item.helpReasons ?? "")
                                      .split(";")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  ),
                                ),
                              );
                            } else {
                              values = Array.from(
                                new Set(
                                  rawNgoData
                                    .map((item) => {
                                      switch (filterField) {
                                        case "Country":
                                          return item.country;
                                        case "Town":
                                          return item.town;
                                        case "Nationality":
                                          return item.nationality;
                                        case "Location Type":
                                          return item.locationType;
                                        case "Accommodation":
                                          return item.accommodation;
                                        case "Needs":
                                          return item.accommodationNeeds;
                                        case "Age":
                                          return item.age?.toString();
                                        case "Number of Victims":
                                          return item.numberOfVictims?.toString();
                                        case "Date":
                                          return item.recordDate;
                                        case "Category":
                                          return item.victimCategory;
                                        case "State / Region":
                                          return item.state;
                                        case "Village":
                                          return item.village;
                                        case "Location Name":
                                          return item.locationName;
                                        case "Captivity Status":
                                          return item.captivityStatus;
                                        case "Gender":
                                          return item.gender;
                                        case "Uploaded Picture":
                                          return item.evidenceUrls &&
                                            item.evidenceUrls.trim() !== ""
                                            ? "Yes"
                                            : "No";
                                        default:
                                          return "";
                                      }
                                    })
                                    .filter(
                                      (v): v is string =>
                                        !!v &&
                                        typeof v === "string" &&
                                        v.trim() !== "",
                                    ),
                                ),
                              );
                            }

                            return values.sort().map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ));
                          })()}
                        </>
                      )}
                    </select>
                  )}
                </div>

                <button
                  onClick={handleVisualize}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    alignSelf: "flex-end",
                    marginBottom: 1,
                  }}
                >
                  {ngoTexts.visualize}
                </button>
              </div>
            </div>
          )}

          {customQueryMode && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 20,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  padding: 16,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  minHeight: 150,
                }}
              >
                <h4 style={{ marginTop: 0 }}>{ngoTexts.queryBuilder}</h4>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#555" }}>
                  <strong>{ngoTexts.readableQuery}</strong>{" "}
                  {formatQueryChainForDisplay(queryChain) || (
                    <span style={{ color: "#999", fontStyle: "italic" }}>
                      {ngoTexts.noFilters}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  {queryChain.length === 0 && (
                    <span style={{ color: "#999", fontStyle: "italic" }}>
                      {ngoTexts.noFiltersYet}
                    </span>
                  )}
                  {queryChain.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 16,
                        fontSize: 12,
                        fontWeight: "bold",
                        backgroundColor:
                          item.type === "field"
                            ? "#e3f2fd"
                            : item.type === "value"
                              ? "#e8f5e9"
                              : "#fff3e0",
                        color:
                          item.type === "field"
                            ? "#0d47a1"
                            : item.type === "value"
                              ? "#1b5e20"
                              : "#e65100",
                        border: "1px solid #ddd",
                      }}
                    >
                      {item.value}
                    </div>
                  ))}
                </div>
                {customQueryError && (
                  <p style={{ color: "red", fontSize: 12, marginTop: 8 }}>
                    {customQueryError}
                  </p>
                )}
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: "bold" }}>
                    {ngoTexts.addFilterField}
                  </label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select
                      id="customFieldSelect"
                      style={{ flex: 1, padding: 4 }}
                    >
                      <option value="Country">{ngoTexts.fieldCountry}</option>
                      <option value="Town">{ngoTexts.fieldTown}</option>
                      <option value="Nationality">{ngoTexts.fieldNationality}</option>
                      <option value="Location Type">{ngoTexts.fieldLocationType}</option>
                      <option value="Accommodation">{ngoTexts.fieldAccommodation}</option>
                      <option value="Needs">{ngoTexts.fieldNeeds}</option>
                      <option value="Age">{ngoTexts.fieldAge}</option>
                      <option value="Number of Victims">
                        {ngoTexts.fieldVictims}
                      </option>
                      <option value="Date">{ngoTexts.fieldDate}</option>
                      <option value="Category">{ngoTexts.fieldCategory}</option>
                      <option value="State / Region">{ngoTexts.fieldState}</option>
                      <option value="Village">{ngoTexts.fieldVillage}</option>
                      <option value="Location Name">{ngoTexts.fieldLocationName}</option>
                      <option value="Captivity Status">{ngoTexts.fieldCaptivity}</option>
                      <option value="Gender">{ngoTexts.fieldGender}</option>
                      <option value="Why Need Help">{ngoTexts.fieldWhyNeedHelp}</option>
                      <option value="Uploaded Picture">{ngoTexts.fieldUploadedPicture}</option>
                    </select>

                    <button
                      disabled={!canAddFilter()}
                      onClick={() => {
                        const sel = document.getElementById(
                          "customFieldSelect",
                        ) as HTMLSelectElement;
                        handleAddCustomItem("field", sel.value);
                      }}
                      style={{
                        padding: "4px 8px",
                        cursor: canAddFilter() ? "pointer" : "not-allowed",
                        opacity: canAddFilter() ? 1 : 0.5,
                      }}
                    >
                      {ngoTexts.add}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: "bold" }}>
                    {ngoTexts.addCondition}
                  </label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select
                      id="customConditionSelect"
                      style={{ flex: 1, padding: 4 }}
                    >
                      {getLastItem()?.type === "field" && (
                        <>
                          <option value="Equals">{ngoTexts.equals}</option>
                          {(getLastItem()?.value === "Age" ||
                            getLastItem()?.value === "Number of Victims" ||
                            getLastItem()?.value === "Date") && (
                            <>
                              <option value="Greater Than">{ngoTexts.greaterThan}</option>
                              <option value="Less Than">{ngoTexts.lessThan}</option>
                              <option value="Greater Than or Equal">
                                {ngoTexts.greaterOrEqual}
                              </option>
                              <option value="Less Than or Equal">
                                {ngoTexts.lessOrEqual}
                              </option>
                            </>
                          )}
                        </>
                      )}
                      {getLastItem()?.type === "value" && (
                        <option value="AND">AND</option>
                      )}
                      {getLastItem()?.type === "value" && (
                        <option value="OR">OR</option>
                      )}
                    </select>
                    <button
                      disabled={!canAddCondition()}
                      onClick={() => {
                        const sel = document.getElementById(
                          "customConditionSelect",
                        ) as HTMLSelectElement;
                        if (sel.value)
                          handleAddCustomItem("condition", sel.value);
                      }}
                      style={{
                        padding: "4px 8px",
                        cursor: canAddCondition() ? "pointer" : "not-allowed",
                        opacity: canAddCondition() ? 1 : 0.5,
                      }}
                    >
                      {ngoTexts.add}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: "bold" }}>
                    {ngoTexts.addValue}
                  </label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {getPriorFieldForValue() === "Age" ||
                    getPriorFieldForValue() === "Number of Victims" ? (
                      <input
                        id="customValueInput"
                        type="number"
                        placeholder="Enter number"
                        style={{ flex: 1, padding: 4 }}
                      />
                    ) : getPriorFieldForValue() === "Date" ? (
                      <input
                        id="customValueInput"
                        type="date"
                        style={{ flex: 1, padding: 4 }}
                      />
                    ) : (
                      <select
                        id="customValueSelect"
                        style={{ flex: 1, padding: 4 }}
                      >
                        {canAddValue() &&
                          getPriorFieldForValue() &&
                          (() => {
                            const f = getPriorFieldForValue();
                            let values: string[] = [];

                            if (f === "Why Need Help") {
                              values = Array.from(
                                new Set(
                                  rawNgoData.flatMap((item) =>
                                    (item.helpReasons ?? "")
                                      .split(";")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  ),
                                ),
                              );
                            } else if (f === "Uploaded Picture") {
                              values = Array.from(
                                new Set(
                                  rawNgoData.map((item) =>
                                    item.evidenceUrls &&
                                    item.evidenceUrls.trim() !== ""
                                      ? "Yes"
                                      : "No",
                                  ),
                                ),
                              );
                            } else {
                              values = Array.from(
                                new Set(
                                  rawNgoData
                                    .map((item) => {
                                      switch (f) {
                                        case "Country":
                                          return item.country;
                                        case "Town":
                                          return item.town;
                                        case "Nationality":
                                          return item.nationality;
                                        case "Location Type":
                                          return item.locationType;
                                        case "Accommodation":
                                          return item.accommodation;
                                        case "Needs":
                                          return item.accommodationNeeds;
                                        case "Category":
                                          return item.victimCategory;
                                        case "State / Region":
                                          return item.state;
                                        case "Village":
                                          return item.village;
                                        case "Location Name":
                                          return item.locationName;
                                        case "Captivity Status":
                                          return item.captivityStatus;
                                        case "Gender":
                                          return item.gender;
                                        default:
                                          return "";
                                      }
                                    })
                                    .filter(
                                      (v): v is string =>
                                        !!v &&
                                        typeof v === "string" &&
                                        v.trim() !== "",
                                    ),
                                ),
                              );
                            }

                            return values.sort().map((val) => (
                              <option key={val} value={val}>
                                {val}
                              </option>
                            ));
                          })()}
                      </select>
                    )}
                    <button
                      disabled={!canAddValue()}
                      onClick={() => {
                        const field = getPriorFieldForValue();
                        if (
                          field === "Age" ||
                          field === "Number of Victims" ||
                          field === "Date"
                        ) {
                          const input = document.getElementById(
                            "customValueInput",
                          ) as HTMLInputElement;
                          if (input.value && field)
                            handleAddCustomItem("value", input.value, field);
                        } else {
                          const sel = document.getElementById(
                            "customValueSelect",
                          ) as HTMLSelectElement;
                          if (sel.value && field)
                            handleAddCustomItem("value", sel.value, field);
                        }
                      }}
                      style={{
                        padding: "4px 8px",
                        cursor: canAddValue() ? "pointer" : "not-allowed",
                        opacity: canAddValue() ? 1 : 0.5,
                      }}
                    >
                      {ngoTexts.add}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={handleDeleteLastItem}
                    disabled={queryChain.length === 0}
                    style={{
                      flex: 1,
                      padding: 8,
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {ngoTexts.deleteLast}
                  </button>
                  <button
                    onClick={handleExecuteCustomQuery}
                    disabled={queryChain.length === 0 || customQueryLoading}
                    style={{
                      flex: 1,
                      padding: 8,
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {customQueryLoading ? ngoTexts.running : ngoTexts.runQuery}
                  </button>
                </div>
              </div>
            </div>
          )}

          {ngoQueryData.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <h3>
                  {ngoTexts.detailedData} ({ngoQueryData.length}{" "}
                  {ngoTexts.records})
                </h3>
                <div
                  style={{
                    overflowX: "auto",
                    marginTop: 12,
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        backgroundColor: "#4a5568",
                        color: "white",
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldCountry}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldTown}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldNationality}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldLocationType}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldAccommodation}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldNeeds}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.fieldAge}
                        </th>
                        <th
                          style={{
                            padding: 8,
                            textAlign: "left",
                            borderBottom: "2px solid #fff",
                          }}
                        >
                          {ngoTexts.victims}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ngoQueryData.map((data, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid #dee2e6",
                            backgroundColor:
                              i % 2 === 0 ? "#2d3748" : "#1a202c",
                            color: "white",
                          }}
                        >
                          <td style={{ padding: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <span>{data.country || "—"}</span>
                              {data.emergencyFileUrl && (
                                <button
                                  onClick={async () => {
                                    if (webId) {
                                      await logNgoViewFromNgo(
                                        data.emergencyFileUrl!,
                                        webId,
                                      );
                                    }
                                    window.open(
                                      `${data.emergencyFileUrl!}?raw=1`,
                                      "_blank",
                                    );
                                  }}
                                  style={{
                                    marginTop: 4,
                                    padding: "4px 6px",
                                    fontSize: 10,
                                    borderRadius: 4,
                                    border: "none",
                                    cursor: "pointer",
                                    backgroundColor: "#3182ce",
                                    color: "white",
                                    alignSelf: "flex-start",
                                  }}
                                >
                                  {ngoTexts.viewDetailed}
                                </button>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: 8 }}>{data.town || "—"}</td>
                          <td style={{ padding: 8 }}>
                            {data.nationality || "—"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {data.locationType || "—"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {data.accommodation || "—"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {data.accommodationNeeds || "—"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {data.age !== undefined ? data.age : "—"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {data.numberOfVictims !== undefined
                              ? data.numberOfVictims
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  style={{
                    padding: 12,
                    border: "2px solid #fff",
                    borderRadius: 4,
                    backgroundColor: "#4a5568",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 13,
                      color: "white",
                    }}
                  >
                    {chartFieldLabel}
                  </h4>
                  <div style={{ height: 200 }}>
                    {ngoCountryStats.length > 0 ? (
                      <Pie
                        data={{
                          labels: ngoCountryStats.map((s) => s.country),
                          datasets: [
                            {
                              data: ngoCountryStats.map((s) => s.count),
                              backgroundColor: [
                                "#FF6384",
                                "#36A2EB",
                                "#FFCE56",
                                "#4BC0C0",
                                "#9966FF",
                                "#FF9F40",
                              ],
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            legend: {
                              labels: { color: "white", font: { size: 10 } },
                              position: "bottom",
                            },
                          },
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          color: "#e2e8f0",
                          fontSize: 12,
                        }}
                      >
                        No data to visualize.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      {role === "refugee" ? (
        <p style={{ fontSize: 12, color: "#666" }}>{loginTexts.footer}</p>
      ) : (
        <p style={{ fontSize: 12, color: "#666" }}>
          This dashboard lets you view refugee emergency data that has been
          voluntarily shared with you by refugees. All records remain stored in
          each refugee&apos;s Solid Pod and access can be revoked at any time.
        </p>
      )}
    </div>
  );
}
