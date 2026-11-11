import {
  getSolidDataset,
  getContainedResourceUrlAll,
  getFile,
  deleteFile,
  deleteContainer,
  getContentType,
  universalAccess,
} from "@inrupt/solid-client";

import { solidFetch } from "./auth";
import { ensurePrivateContainer, grantAccessToSelectedNGOs } from "./accessControl";
import {
  loadEmergencyData,
  saveEmergencyData,
  loadEmergencyDataFromUrl,
  loadNgoList,
  saveNgoList,
  loadNgoListFromUrl,
  ensureEvidenceUrlsPresent,
} from "./solidDatanew";
import { stripImageMetadata, randomEvidenceFileName } from "./imageUtils";
import { type AppLanguage, tr } from "./i18n";

export type MigrationResult = {
  // true if anything was actually moved from public/ to private/.
  migrated: boolean;
  // true if the migration could not be completed; nothing was deleted.
  failed: boolean;
  message: string;
};

async function resourceExists(url: string): Promise<boolean> {
  try {
    const response = await solidFetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * One-time migration for refugees who saved data under the old public/
 * layout before PR0-2 locked storage down to private/. Safe to call on
 * every refugee login: once nothing is left under public/, it is a no-op
 * (requirement 6). Never deletes a legacy file before its private
 * replacement has been confirmed readable (requirement 4/5).
 */
export async function migrateLegacyPublicData(
  podBaseUrl: string,
  webId: string,
  knownNgoWebIds: string[],
  language: AppLanguage,
): Promise<MigrationResult> {
  let migratedAnything = false;
  let failed = false;
  const grantedNgoWebIds: string[] = [];

  await ensurePrivateContainer(podBaseUrl, webId);

  // --- 1. ngoList.ttl: copy (as structured data, not raw bytes - the file's
  //        internal node IRIs are rooted at its own URL) if private doesn't
  //        already have one, then drop the legacy copy. ---
  const publicNgoListUrl = `${podBaseUrl}public/ngoList.ttl`;
  if (await resourceExists(publicNgoListUrl)) {
    const privateNgoListExisted = await resourceExists(
      `${podBaseUrl}private/ngoList.ttl`,
    );
    if (!privateNgoListExisted) {
      try {
        const legacyNgos = await loadNgoListFromUrl(publicNgoListUrl);
        if (legacyNgos) {
          await saveNgoList(podBaseUrl, legacyNgos);
        }
      } catch (e) {
        console.error("Error migrating legacy ngoList.ttl", e);
        failed = true;
      }
    }

    if (!failed) {
      const verified = await loadNgoList(podBaseUrl);
      if (verified !== null) {
        try {
          await deleteFile(publicNgoListUrl, { fetch: solidFetch });
          migratedAnything = true;
        } catch (e) {
          console.error("Error deleting legacy public/ngoList.ttl", e);
          failed = true;
        }
      } else {
        failed = true;
      }
    }
  }

  // Re-read whichever NGO list is now current (migrated, pre-existing
  // private one, or the caller's in-memory list as a last resort) so we
  // know which NGOs to check for pre-existing access below.
  const currentNgos = (await loadNgoList(podBaseUrl)) ?? knownNgoWebIds;

  // --- 2. emergency.ttl: same copy-as-structured-data approach. Before we
  //        lose the ability to read the legacy file's ACL, note which known
  //        NGOs already had explicit read access to it (requirement 7). ---
  const publicEmergencyUrl = `${podBaseUrl}public/emergency.ttl`;
  if (!failed && (await resourceExists(publicEmergencyUrl))) {
    for (const ngo of currentNgos) {
      try {
        const access = await universalAccess.getAgentAccess(
          publicEmergencyUrl,
          ngo,
          { fetch: solidFetch },
        );
        if (access?.read) {
          grantedNgoWebIds.push(ngo);
        }
      } catch (e) {
        console.warn("Could not check legacy NGO access for", ngo, e);
      }
    }

    const privateEmergencyExisted = await resourceExists(
      `${podBaseUrl}private/emergency.ttl`,
    );
    if (!privateEmergencyExisted) {
      try {
        const legacyData = await loadEmergencyDataFromUrl(publicEmergencyUrl);
        if (legacyData) {
          await saveEmergencyData(podBaseUrl, legacyData);
        } else {
          failed = true;
        }
      } catch (e) {
        console.error("Error migrating legacy emergency.ttl", e);
        failed = true;
      }
    }

    if (!failed) {
      const verified = await loadEmergencyData(podBaseUrl);
      if (verified !== null) {
        try {
          await deleteFile(publicEmergencyUrl, { fetch: solidFetch });
          migratedAnything = true;
        } catch (e) {
          console.error("Error deleting legacy public/emergency.ttl", e);
          failed = true;
        }
      } else {
        failed = true;
      }
    }
  }

  // --- 3. evidence/: download each photo, strip EXIF again (it was
  //        uploaded before that was in place), re-upload under a random
  //        name in private/evidence/, and only once every photo has a
  //        verified private copy do we rewrite emergency.ttl's evidenceUrls
  //        and delete the legacy originals + container. ---
  const publicEvidenceContainerUrl = `${podBaseUrl}public/evidence/`;
  if (!failed && (await resourceExists(publicEvidenceContainerUrl))) {
    let containedUrls: string[] = [];
    try {
      const containerDataset = await getSolidDataset(
        publicEvidenceContainerUrl,
        { fetch: solidFetch },
      );
      containedUrls = getContainedResourceUrlAll(containerDataset);
    } catch (e) {
      console.error("Error listing legacy public/evidence/", e);
      failed = true;
    }

    const urlMap: Record<string, string> = {};

    for (const oldUrl of containedUrls) {
      try {
        const file = await getFile(oldUrl, { fetch: solidFetch });
        const contentType = getContentType(file) ?? "image/jpeg";
        const cleaned = await stripImageMetadata(file, contentType);
        const newUrl = `${podBaseUrl}private/evidence/${randomEvidenceFileName(contentType)}`;

        const putResponse = await solidFetch(newUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: cleaned,
        });
        if (!putResponse.ok) {
          throw new Error(`${putResponse.status} ${putResponse.statusText}`);
        }

        const verifyResponse = await solidFetch(newUrl);
        if (!verifyResponse.ok) {
          throw new Error(
            `Could not verify migrated copy at ${newUrl}: ${verifyResponse.status}`,
          );
        }

        urlMap[oldUrl] = newUrl;
      } catch (e) {
        console.error("Error migrating legacy evidence photo", oldUrl, e);
        failed = true;
      }
    }

    if (Object.keys(urlMap).length > 0) {
      try {
        // Merge, don't just replace: every migrated photo's new URL must
        // end up referenced even if the record never mentioned its old
        // URL in the first place (e.g. it was uploaded but never saved).
        await ensureEvidenceUrlsPresent(
          podBaseUrl,
          Object.values(urlMap),
          Object.keys(urlMap),
        );
      } catch (e) {
        console.error("Error rewriting evidenceUrls after migration", e);
        failed = true;
      }
    }

    // Only delete legacy originals (and the now-empty container) if every
    // single contained file was successfully migrated and verified.
    if (
      !failed &&
      containedUrls.length > 0 &&
      containedUrls.every((u) => u in urlMap)
    ) {
      for (const oldUrl of containedUrls) {
        try {
          await deleteFile(oldUrl, { fetch: solidFetch });
        } catch (e) {
          console.error("Error deleting legacy evidence photo", oldUrl, e);
          failed = true;
        }
      }
      if (!failed) {
        try {
          await deleteContainer(publicEvidenceContainerUrl, {
            fetch: solidFetch,
          });
        } catch (e) {
          console.warn("Could not delete empty public/evidence/", e);
        }
        migratedAnything = true;
      }
    }
  }

  // --- 4. Any NGO that already had explicit read access to the legacy
  //        public emergency.ttl should keep access to its private
  //        replacement, via the normal grant flow (requirement 7). ---
  if (!failed && grantedNgoWebIds.length > 0) {
    try {
      await grantAccessToSelectedNGOs(
        grantedNgoWebIds,
        podBaseUrl,
        webId,
        language,
      );
    } catch (e) {
      console.error("Error restoring NGO access after migration", e);
      failed = true;
    }
  }

  // --- 5. Self-heal: any photo already sitting in private/evidence/ that
  //        the record doesn't reference yet - e.g. uploaded in a session
  //        that was closed before Save, or left behind by an earlier,
  //        incomplete run of this migration - gets linked back in now
  //        (requirement 3). Runs regardless of whether there was anything
  //        to migrate from public/, since it's an independent concern. ---
  let healedOrphans = false;
  if (!failed) {
    const privateEvidenceContainerUrl = `${podBaseUrl}private/evidence/`;
    try {
      if (await resourceExists(privateEvidenceContainerUrl)) {
        const containerDataset = await getSolidDataset(
          privateEvidenceContainerUrl,
          { fetch: solidFetch },
        );
        const containedUrls = getContainedResourceUrlAll(containerDataset);

        const currentData = await loadEmergencyData(podBaseUrl);
        const referenced = new Set(
          (currentData?.evidenceUrls ?? "")
            .split(";")
            .map((u) => u.trim())
            .filter(Boolean),
        );
        const orphanUrls = containedUrls.filter((u) => !referenced.has(u));

        if (orphanUrls.length > 0) {
          await ensureEvidenceUrlsPresent(podBaseUrl, orphanUrls);
          healedOrphans = true;
        }
      }
    } catch (e) {
      // Non-fatal: don't block login, or the public-data migration result
      // above, over this - the next login will simply retry.
      console.error("Error healing orphaned evidence photos", e);
    }
  }

  if (failed) {
    return {
      migrated: false,
      failed: true,
      message: tr(
        language,
        "Could not finish migrating old public data to private storage. Nothing was deleted; please try again later.",
        "ዝሓለፈ ህዝባዊ ዳታ ናብ ውሽጣዊ ኣካል ምትሕልላፍ ኣይተዓወተን። ዝኾነ ፋይል ኣይተደምሰሰን፣ ደሓር ደጊም ፈትን።",
        "无法完成将旧公开数据迁移到私有存储。未删除任何文件，请稍后重试。",
      ),
    };
  }

  if (!migratedAnything && !healedOrphans) {
    return { migrated: false, failed: false, message: "" };
  }

  if (migratedAnything && healedOrphans) {
    return {
      migrated: true,
      failed: false,
      message: tr(
        language,
        "Old public data has been migrated to private storage, and some evidence photos have been re-linked to your record.",
        "ዝሓለፈ ህዝባዊ ዳታ ናብ ውሽጣዊ ኣካል ተሰጋጊሩ ኣሎ፣ ገለ ኣብ መረጋገጺ ዝነበሩ ስእልታት እውን ምስ መረዳእታኻ ተኣሳሲሮም።",
        "已将旧数据迁移到私有存储，并重新关联了一些未被记录引用的证据照片。",
      ),
    };
  }

  if (healedOrphans) {
    return {
      migrated: true,
      failed: false,
      message: tr(
        language,
        "Found evidence photos that weren't linked to your record and added them back.",
        "ምስ መረዳእታኻ ዘይተኣሳሰሩ ናይ መረጋገጺ ስእልታት ተረኽቡ፣ ተመሊሶም ተኣሳሲሮም ኣለዉ።",
        "发现了未关联到你记录的证据照片，已重新添加。",
      ),
    };
  }

  return {
    migrated: true,
    failed: false,
    message: tr(
      language,
      "Old public data has been migrated to private storage.",
      "ዝሓለፈ ህዝባዊ ዳታ ናብ ውሽጣዊ ኣካል ተሰጋጊሩ ኣሎ።",
      "已将旧数据迁移到私有存储。",
    ),
  };
}
