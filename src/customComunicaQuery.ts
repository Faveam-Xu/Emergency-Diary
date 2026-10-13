import { QueryEngine } from "@comunica/query-sparql";
import type { RefugeeDataWithSource } from "./comunicaQuery";
import {
  fetchAndParseOntology,
  expandProperty,
  generateSparqlPrefixes,
} from "./ontologyParser";

export type SolidFetch = typeof fetch;

const myEngine = new QueryEngine();

export type BuilderItem = {
  id: string;
  type: "field" | "condition" | "value";
  value: string;
  fieldType?: string;
};

const getVarName = (field: string) => {
  switch (field) {
    case "Country":
      return "?country";
    case "Town":
      return "?town";
    case "Nationality":
      return "?nationality";
    case "Location Type":
      return "?locationType";
    case "Accommodation":
      return "?accommodation";
    case "Needs":
      return "?accommodationNeeds";
    case "Age":
      return "?age";
    case "Number of Victims":
      return "?numberOfVictims";
    case "Date":
      return "?recordDate";
    case "Category":
      return "?victimCategory";
    case "State / Region":
      return "?state";
    case "Village":
      return "?village";
    case "Location Name":
      return "?locationName";
    case "Captivity Status":
      return "?captivityStatus";
    case "Gender":
      return "?gender";
    case "Why Need Help":
      return "?helpReasons";
    case "Uploaded Picture":
      return "?evidenceUrls";
         // ================= NEW FIELDS =================
    case "Trauma":
      return "?trauma";
    case "Health Status":
      return "?healthStatus";
    case "Captivity Detail":
      return "?CaptivityDetail";
    // ==============================================
    default:
      return "?unknown";
  }
};

export async function executeCustomQuery(
  chain: BuilderItem[],
  sources: string[],
  fetch: SolidFetch,
): Promise<RefugeeDataWithSource[]> {
  if (!sources || sources.length === 0) return [];

  const mapping = await fetchAndParseOntology();
  const prefixes = generateSparqlPrefixes(mapping.prefixes);

  const andGroups: string[][] = [];
  let currentOrGroup: string[] = [];
  let currentClauseItems: BuilderItem[] = [];

  const processClause = (items: BuilderItem[]): string | null => {
    if (items.length === 0) return null;

    let field = "";
    let op = "";
    let value = "";
    let fieldType = "";

    for (const item of items) {
      if (item.type === "field") {
        field = item.value;
      } else if (item.type === "condition") {
        if (item.value === "Equals") op = "=";
        else if (item.value === "Greater Than") op = ">";
        else if (item.value === "Less Than") op = "<";
        else if (item.value === "Greater Than or Equal") op = ">=";
        else if (item.value === "Less Than or Equal") op = "<=";
      } else if (item.type === "value") {
        value = item.value;
        fieldType = item.fieldType || field;
      }
    }

    if (field && value && op) {
      const key = fieldType || field;

      if (key === "Uploaded Picture") {
        const evVar = getVarName("Uploaded Picture");
        if (value === "Yes") {
          return `BOUND(${evVar})`;
        }
        if (value === "No") {
          return `!BOUND(${evVar})`;
        }
      }

      if (key === "Why Need Help") {
        const varName = getVarName("Why Need Help");

        return `CONTAINS(STR(${varName}), "${value}")`;
      }

      const varName = getVarName(key);

      const isNumeric = key === "Age" || key === "Number of Victims";
      const isDate = key === "Date";

      let valStr: string;
      let varExpr: string;

      if (isNumeric) {
        valStr = value;
        varExpr = `xsd:integer(${varName})`;
      } else if (isDate) {
        valStr = `"${value}"`;
        varExpr = varName;
      } else {
        valStr = `"${value}"`;
        varExpr = varName;
      }

      return `${varExpr} ${op} ${valStr}`;
    }

    return null;
  };

  for (let i = 0; i < chain.length; i++) {
    const item = chain[i];

    if (
      item.type === "condition" &&
      (item.value === "AND" || item.value === "OR")
    ) {
      const clauseSparql = processClause(currentClauseItems);
      if (clauseSparql) {
        currentOrGroup.push(clauseSparql);
      }
      currentClauseItems = [];

      if (item.value === "AND") {
        if (currentOrGroup.length > 0) {
          andGroups.push(currentOrGroup);
        }
        currentOrGroup = [];
      }
    } else {
      currentClauseItems.push(item);
    }
  }

  const finalClauseSparql = processClause(currentClauseItems);
  if (finalClauseSparql) {
    currentOrGroup.push(finalClauseSparql);
  }
  if (currentOrGroup.length > 0) {
    andGroups.push(currentOrGroup);
  }

  const sparqlFilter = andGroups
    .map((group) => {
      const groupStr = group.map((c) => `(${c})`).join(" || ");
      return `(${groupStr})`;
    })
    .join(" && ");

  const filterBlock = sparqlFilter ? `FILTER (${sparqlFilter})` : "";

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
  const evidenceUrlsProp = "<http://example.org/ns#evidenceUrls>";
  const traumaProp = expandProperty("hds:trauma", mapping);
const healthStatusProp = expandProperty("hds:healthStatus", mapping);
const captivityDetailProp = expandProperty("hds:CaptivityDetail", mapping);

  const query = `
  ${prefixes}
  SELECT ?country ?town ?nationality ?locationType ?accommodation ?accommodationNeeds
         ?age ?numberOfVictims ?recordDate ?victimCategory ?state ?village
         ?locationName ?captivityStatus ?gender ?helpReasons ?evidenceUrls
         ?trauma ?healthStatus ?CaptivityDetail
  WHERE {


    OPTIONAL { ?loc ${countryProp} ?country . }
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
      ?sit ${evidenceUrlsProp} ?evidenceUrls .
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

    ${filterBlock}
  }
`;

  console.log("Executing Custom Query:", query);

  const results: RefugeeDataWithSource[] = [];

  for (const source of sources) {
    try {
      const bindingsStream = await myEngine.queryBindings(query, {
        sources: [source],
        fetch,
      });

      const bindings = await bindingsStream.toArray();
      for (const binding of bindings) {
        results.push({
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
          trauma: binding.get("trauma")?.value,
healthStatus: binding.get("healthStatus")?.value,
CaptivityDetail: binding.get("CaptivityDetail")?.value,
          sourceUrl: source,
        });
      }
    } catch (err) {
      console.error(`Error querying source ${source}:`, err);
    }
  }

  return results;
}
