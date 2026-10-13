import { QueryEngine } from "@comunica/query-sparql";
import {
  fetchAndParseOntology,
  expandProperty,
  generateSparqlPrefixes,
} from "./ontologyParser";
import type { Bindings } from "@comunica/types";

export type SolidFetch = typeof fetch;

export type RefugeeData = {
  country?: string;
  town?: string;
  nationality?: string;
  locationType?: string;
  accommodation?: string;
  accommodationNeeds?: string;
  age?: number;
  numberOfVictims?: number;
  recordDate?: string;
  victimCategory?: string;
  state?: string;
  village?: string;
  locationName?: string;
  captivityStatus?: string;
  trauma?: string;
  healthStatus?: string;
  CaptivityDetail?: string
  gender?: string;
  helpReasons?: string;
  evidenceUrls?: string;
};

export type RefugeeDataWithSource = RefugeeData & {
  sourceUrl: string;
};

export type QueryFilters = {
  country?: string;
  need?: string;
};

const myEngine = new QueryEngine();

async function executeQuery<T>(
  query: string,
  sources: string[],
  fetch: SolidFetch,
  mapper: (binding: Bindings) => T,
): Promise<T[]> {
  const validSources = sources.filter(
    (s) => s && s.trim() !== "" && s.startsWith("http"),
  );

  if (!validSources.length) {
    console.warn("No valid sources provided to executeQuery");
    return [];
  }

  console.log("Executing query with valid sources:", validSources);

  try {
    // Comunica Solid engine expects an authenticated fetch
    const bindingsStream = await myEngine.queryBindings(query, {
      sources: validSources,
      fetch,
    });

    const results: T[] = [];
    const bindings = await bindingsStream.toArray();
    for (const binding of bindings) {
      results.push(mapper(binding));
    }

    return results;
  } catch (error) {
    console.error("Error in executeQuery:", error);
    throw error;
  }
}

export async function queryRefugeeData(
  emergencyFileUrls: string[],
  fetch: SolidFetch,
  filters: QueryFilters = {},
): Promise<RefugeeDataWithSource[]> {
  const results: RefugeeDataWithSource[] = [];
  const mapping = await fetchAndParseOntology();
  const prefixes = generateSparqlPrefixes(mapping.prefixes);

  for (const source of emergencyFileUrls) {
    if (!source || source.trim() === "") continue;

    const countryProp = expandProperty("hds:country", mapping);
    const townProp = expandProperty("hds:town", mapping);
    const locationTypeProp = expandProperty("hds:locationType", mapping);
    const nationalityProp = expandProperty("hds:nationality", mapping);
    const accommodationProp = expandProperty("hds:accommodation", mapping);
    const needsProp = expandProperty("hds:needs", mapping);
    const ageProp = expandProperty("hds:age", mapping);
    const numVictimsProp = expandProperty("hds:number", mapping);
    const recordDateProp = expandProperty("hds:updatedAt", mapping);
    const victimCategoryProp = expandProperty("hds:category", mapping);
    const stateProp = expandProperty("hds:state", mapping);
    const villageProp = expandProperty("hds:village", mapping);
    const locationNameProp = expandProperty("hds:locationName", mapping);
    const captivityStatusProp = expandProperty("hds:captivityStatus", mapping);
    const genderProp = expandProperty("hds:gender", mapping);
    const helpReasonsProp = expandProperty("hds:helpReasons", mapping);

    //************************************************************************* */
    const traumaProp = expandProperty("hds:trauma", mapping);
    const healthStatusProp = expandProperty("hds:healthStatus", mapping);
    const captivityDetailProp = expandProperty("hds:CaptivityDetail", mapping);
    //************************************************************************ */

    const locationBlock = filters.country
      ? `?loc ${countryProp} "${filters.country}" . BIND("${filters.country}" AS ?country)`
      : `OPTIONAL { ?loc ${countryProp} ?country . }`;

    const situationBlock = filters.need
      ? `?sit ${needsProp} "${filters.need}" . BIND("${filters.need}" AS ?accommodationNeeds)`
      : `OPTIONAL { ?sit ${needsProp} ?accommodationNeeds . }`;

    const query = `
      ${prefixes}
      SELECT ?country ?town ?nationality ?locationType ?accommodation
                 ?accommodationNeeds ?age ?numberOfVictims ?recordDate
                 ?victimCategory ?state ?village ?locationName ?captivityStatus
                 ?gender ?helpReasons ?evidenceUrls
                 ?trauma ?healthStatus ?CaptivityDetail
          WHERE {

        ${locationBlock}
        OPTIONAL { ?loc ${townProp} ?town . }
        OPTIONAL { ?loc ${locationTypeProp} ?locationType . }
        OPTIONAL { ?loc ${stateProp} ?state . }
        OPTIONAL { ?loc ${villageProp} ?village . }
        OPTIONAL { ?loc ${locationNameProp} ?locationName . }

        OPTIONAL {
          ?vic a hds:Victim .
          ?vic ${nationalityProp} ?nationality .
        }
        OPTIONAL {
          ?vic a hds:Victim .
          ?vic ${ageProp} ?age .
        }
        OPTIONAL {
          ?vic a hds:Victim .
          ?vic ${genderProp} ?gender .
        }

        OPTIONAL {
          ?vic a hds:Victim .
          ?vic ${victimCategoryProp} ?victimCategory .
        }

        OPTIONAL {
          ?vic ${numVictimsProp} ?numberOfVictims .
        }
        OPTIONAL {
          ?rec ${recordDateProp} ?recordDate .
        }

        ${situationBlock}
        OPTIONAL {
          ?sit a hds:Situation .
          ?sit ${accommodationProp} ?accommodation .
        }
        OPTIONAL {
          ?sit a hds:Situation .
          ?sit ${needsProp} ?accommodationNeeds .
        }
        OPTIONAL {
          ?sit a hds:Situation .
          ?sit ${helpReasonsProp} ?helpReasons .
        }
        OPTIONAL {
          ?sit a hds:Situation .
          ?sit <http://example.org/ns#evidenceUrls> ?evidenceUrls .
        }

        OPTIONAL {
          ?sit a hds:Situation .
          ?sit ${captivityStatusProp} ?captivityStatus .
        }
           OPTIONAL {
  ?vic a hds:Victim .
  ?vic ${healthStatusProp} ?healthStatus .
}

OPTIONAL {
  ?sit a hds:Situation .
  ?sit ${traumaProp} ?trauma .
}

OPTIONAL {
  ?sit a hds:Situation .
  ?sit ${captivityDetailProp} ?CaptivityDetail .
}
      }
      LIMIT 1
    `;

    try {
      //console.log(`[Standard Query] Executing query on ${source}:`, query);
      const fileResults = await executeQuery(
        query,
        [source],
        fetch,
        (binding: Bindings) => {
          //console.log(`[Standard Query] Raw binding for ${source}:`, binding.toString());
          return {
            country: binding.get("country")?.value,
            town: binding.get("town")?.value,
            nationality: binding.get("nationality")?.value,
            locationType: binding.get("locationType")?.value,
            accommodation: binding.get("accommodation")?.value,
            accommodationNeeds: binding.get("accommodationNeeds")?.value,
            age: (() => {
              const ageLiteral = binding.get("age");
              return ageLiteral ? parseInt(ageLiteral.value, 10) : undefined;
            })(),
            numberOfVictims: (() => {
              const victimsLiteral = binding.get("numberOfVictims");
              return victimsLiteral
                ? parseInt(victimsLiteral.value, 10)
                : undefined;
            })(),
            recordDate: binding.get("recordDate")?.value,
            victimCategory: binding.get("victimCategory")?.value,
            state: binding.get("state")?.value,
            village: binding.get("village")?.value,
            locationName: binding.get("locationName")?.value,
            captivityStatus: binding.get("captivityStatus")?.value,
            gender: binding.get("gender")?.value,
            helpReasons: binding.get("helpReasons")?.value,
            evidenceUrls: binding.get("evidenceUrls")?.value,

            // ==========================================
            // 🆕 NEW VARIABLES MAPPING START
            // ==========================================
            trauma: binding.get("trauma")?.value,
            healthStatus: binding.get("healthStatus")?.value,
            CaptivityDetail: binding.get("CaptivityDetail")?.value,
            // ==========================================
            // 🆕 NEW VARIABLES MAPPING END
          };
        },
      );

      if (fileResults.length > 0) {
        const resultWithSource: RefugeeDataWithSource = {
          ...fileResults[0],
          sourceUrl: source,
        };
        results.push(resultWithSource);
      }
    } catch (err) {
      console.error(`Error querying file ${source}:`, err);
    }
  }

  return results;
}

export async function queryCountryStatistics(
  emergencyFileUrls: string[],
  fetch: SolidFetch,
  filters: QueryFilters = {},
): Promise<{ country: string; count: number }[]> {
  const data = await queryRefugeeData(emergencyFileUrls, fetch, filters);

  const stats: Record<string, number> = {};
  for (const row of data) {
    const c = row.country || "Unknown";
    stats[c] = (stats[c] || 0) + 1;
  }

  return Object.entries(stats).map(([country, count]) => ({ country, count }));
}

export async function queryAccommodationNeeds(
  emergencyFileUrls: string[],
  fetch: SolidFetch,
  filters: QueryFilters = {},
): Promise<{ need: string; count: number }[]> {
  const data = await queryRefugeeData(emergencyFileUrls, fetch, filters);

  const stats: Record<string, number> = {};
  for (const row of data) {
    const n = row.accommodationNeeds || "Unknown";
    stats[n] = (stats[n] || 0) + 1;
  }

  return Object.entries(stats).map(([need, count]) => ({ need, count }));
}
