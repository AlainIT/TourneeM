// Edge Function: import-targeting
//
// Entrée : { sector_id: string, storage_path: string, nom_fichier: string }
//   - storage_path pointe vers un fichier .xlsx/.csv déjà uploadé dans le bucket
//     Storage "imports" par le client.
// Effet :
//   1. Parse le fichier (colonnes du fichier de ciblage réel — voir docs/ARCHITECTURE.md).
//   2. Géocode les adresses en lot via l'API Adresse (gouv.fr).
//   3. Calcule potentiel_score (0-100, normalisation percentile de PRESSION VM).
//   4. Upsert des médecins sur (sector_id, onekey), marque actif=false ceux absents
//      du nouveau fichier, écrit les poids produits, trace l'import.
//
// Auth : appelé par l'app avec le JWT utilisateur ; on revérifie l'accès au secteur
// avec ce JWT (RLS) avant de basculer sur la clé service_role pour les écritures en lot.

import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type RawRow = Record<string, unknown>;

interface ParsedDoctor {
  onekey: string;
  rpps: string | null;
  specialite: string | null;
  nom: string;
  prenom: string | null;
  lieu_exercice: string | null;
  etablissement: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  uga: string | null;
  secteur_code: string | null;
  region: string | null;
  pression_vm: number | null;
  mode_reception: string | null;
  ciblage: string;
  action: string | null;
  rationnel: string | null;
  frequence_max: number | null;
  products: Record<string, number>;
}

const MODE_RECEPTION_MAP: Record<string, string> = {
  "LIBRE": "LIBRE",
  "SUR RDV": "SUR_RDV",
  "SUR RENDEZ-VOUS": "SUR_RDV",
  "ALÉATOIRE": "ALEATOIRE",
  "ALEATOIRE": "ALEATOIRE",
  "NRP": "NRP",
  "NPP": "NPP",
  "INACTIF": "INACTIF",
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toUpperCase();
}

function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function cleanNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Le fichier réel a une ligne d'instructions en ligne 1 et les en-têtes en ligne 2.
// On cherche la première ligne contenant "ONEKEY" plutôt que de fixer un numéro de
// ligne, pour rester robuste si un futur export change de mise en page.
function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i].some((c) => normalizeHeader(c) === "ONEKEY")) return i;
  }
  throw new Error("Colonne ONEKEY introuvable dans les 10 premières lignes du fichier.");
}

function parseWorkbook(bytes: Uint8Array): ParsedDoctor[] {
  const wb = XLSX.read(bytes, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const headerRowIdx = findHeaderRow(rows);
  const headers = rows[headerRowIdx].map(normalizeHeader);
  const dataRows = rows.slice(headerRowIdx + 1);

  const idx = (name: string) => headers.indexOf(name);
  const productCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.startsWith("POIDS UGA "));

  const iOnekey = idx("ONEKEY");
  const iRpps = idx("RPPS");
  const iSpecialite = idx("SPECIALITE");
  const iNom = idx("NOM");
  const iPrenom = idx("PRENOM");
  const iLieu = idx("LIEU D'EXERCICE PRINCIPAL");
  const iEtab = idx("ETABLISSEMENT");
  const iAdresse = idx("ADRESSE");
  const iVille = idx("VILLE");
  const iCp = idx("CODE POSTAL");
  const iUga = idx("UGA");
  const iSecteur = idx("SECTEUR");
  const iRegion = idx("REGION");
  const iPression = idx("PRESSION VM");
  const iMode = idx("MODE RECEPTION");
  // "CIBLAGE PROPOSE" prime sur "CIBLAGE C1/C2 ..." s'il est renseigné (décision finale de la déléguée).
  const iCiblageProp = headers.findIndex((h) => h.startsWith("CIBLAGE PROPOSE"));
  const iCiblageSrc = headers.findIndex((h) => h.startsWith("CIBLAGE C1") || h.startsWith("CIBLAGE C2"));
  const iAction = idx("ACTION");
  const iRationnel = idx("RATIONNEL");
  const iFreqMax = idx("FREQUENCE MAXIMUM");

  if (iOnekey === -1 || iNom === -1) {
    throw new Error("Colonnes obligatoires manquantes (ONEKEY, NOM).");
  }

  const out: ParsedDoctor[] = [];
  for (const row of dataRows) {
    const onekey = cleanStr(row[iOnekey]);
    if (!onekey) continue; // ligne vide en fin de feuille

    const ciblageRaw =
      (iCiblageProp !== -1 ? cleanStr(row[iCiblageProp]) : null) ??
      (iCiblageSrc !== -1 ? cleanStr(row[iCiblageSrc]) : null) ??
      "HC";
    const ciblage = ["P1", "P2", "P3", "HC"].includes(ciblageRaw.toUpperCase())
      ? ciblageRaw.toUpperCase()
      : "HC";

    const modeRaw = iMode !== -1 ? cleanStr(row[iMode]) : null;
    const mode_reception = modeRaw ? MODE_RECEPTION_MAP[modeRaw.toUpperCase()] ?? null : null;

    const products: Record<string, number> = {};
    for (const { h, i } of productCols) {
      const val = cleanNum(row[i]);
      if (val !== null) products[h.replace("POIDS UGA ", "").trim()] = val;
    }

    out.push({
      onekey,
      rpps: iRpps !== -1 ? cleanStr(row[iRpps]) : null,
      specialite: iSpecialite !== -1 ? cleanStr(row[iSpecialite]) : null,
      nom: cleanStr(row[iNom]) ?? "",
      prenom: iPrenom !== -1 ? cleanStr(row[iPrenom]) : null,
      lieu_exercice: iLieu !== -1 ? cleanStr(row[iLieu]) : null,
      etablissement: iEtab !== -1 ? cleanStr(row[iEtab]) : null,
      adresse: iAdresse !== -1 ? cleanStr(row[iAdresse]) : null,
      ville: iVille !== -1 ? cleanStr(row[iVille]) : null,
      code_postal: iCp !== -1 ? cleanStr(row[iCp]) : null,
      uga: iUga !== -1 ? cleanStr(row[iUga]) : null,
      secteur_code: iSecteur !== -1 ? cleanStr(row[iSecteur]) : null,
      region: iRegion !== -1 ? cleanStr(row[iRegion]) : null,
      pression_vm: iPression !== -1 ? cleanNum(row[iPression]) : null,
      mode_reception,
      ciblage,
      action: iAction !== -1 ? cleanStr(row[iAction]) : null,
      rationnel: iRationnel !== -1 ? cleanStr(row[iRationnel]) : null,
      frequence_max: iFreqMax !== -1 ? cleanNum(row[iFreqMax]) : null,
      products,
    });
  }
  return out;
}

// Score 0-100 par rang percentile de PRESSION VM sur le fichier importé.
// Simple, stable, ne dépend pas d'un maximum théorique arbitraire.
function computePotentielScores(doctors: ParsedDoctor[]): Map<string, number> {
  const withPression = doctors
    .map((d) => ({ onekey: d.onekey, v: d.pression_vm }))
    .filter((d): d is { onekey: string; v: number } => d.v !== null)
    .sort((a, b) => a.v - b.v);

  const scores = new Map<string, number>();
  const n = withPression.length;
  withPression.forEach((d, rank) => {
    const pct = n <= 1 ? 100 : Math.round((rank / (n - 1)) * 100);
    scores.set(d.onekey, pct);
  });
  return scores;
}

interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  status: "ok" | "failed" | "partial";
}

// Géocodage en lot via l'API Adresse (data.gouv.fr) : endpoint CSV, jusqu'à
// plusieurs dizaines de milliers de lignes en une requête. Adapté aux ~400
// lignes d'un cycle de ciblage.
async function geocodeBatch(
  doctors: ParsedDoctor[],
): Promise<Map<string, GeocodeResult>> {
  const header = "onekey;adresse;code_postal;ville\n";
  const csvBody = doctors
    .map((d) =>
      [d.onekey, d.adresse ?? "", d.code_postal ?? "", d.ville ?? ""]
        .map((v) => String(v).replace(/;/g, ",").replace(/\n/g, " "))
        .join(";")
    )
    .join("\n");

  const form = new FormData();
  form.append(
    "data",
    new Blob([header + csvBody], { type: "text/csv" }),
    "adresses.csv",
  );
  form.append("columns", "adresse");
  form.append("postcode", "code_postal");
  form.append("result_columns", "onekey");
  form.append("result_columns", "result_latitude");
  form.append("result_columns", "result_longitude");
  form.append("result_columns", "result_score");

  const res = await fetch("https://api-adresse.data.gouv.fr/search/csv/", {
    method: "POST",
    body: form,
  });

  const results = new Map<string, GeocodeResult>();
  if (!res.ok) {
    console.error("Geocoding API error", res.status, await res.text());
    return results; // toutes les lignes resteront "pending" -> traitées par un retry ultérieur
  }

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim().length);
  const resultHeader = lines[0].split(";").map((h) => h.trim());
  const iOnekey = resultHeader.indexOf("onekey");
  const iLat = resultHeader.indexOf("result_latitude");
  const iLon = resultHeader.indexOf("result_longitude");
  const iScore = resultHeader.indexOf("result_score");

  for (const line of lines.slice(1)) {
    const cols = line.split(";");
    const onekey = cols[iOnekey];
    if (!onekey) continue;
    const lat = cleanNum(cols[iLat]);
    const lon = cleanNum(cols[iLon]);
    const score = cleanNum(cols[iScore]);
    if (lat !== null && lon !== null) {
      results.set(onekey, {
        latitude: lat,
        longitude: lon,
        status: score !== null && score < 0.5 ? "partial" : "ok",
      });
    } else {
      results.set(onekey, { latitude: null, longitude: null, status: "failed" });
    }
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { sector_id, storage_path, nom_fichier } = await req.json();
    if (!sector_id || !storage_path) {
      return new Response(JSON.stringify({ error: "sector_id et storage_path requis" }), { status: 400 });
    }

    // Vérification d'accès au secteur avec le JWT de l'appelant (RLS).
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: sector, error: sectorErr } = await userClient
      .from("sectors")
      .select("id")
      .eq("id", sector_id)
      .maybeSingle();
    if (sectorErr || !sector) {
      return new Response(JSON.stringify({ error: "Secteur inaccessible" }), { status: 403 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: importRow, error: importInsertErr } = await admin
      .from("imports")
      .insert({ sector_id, nom_fichier: nom_fichier ?? storage_path, statut: "en_cours" })
      .select()
      .single();
    if (importInsertErr) throw importInsertErr;

    const { data: fileBlob, error: downloadErr } = await admin.storage
      .from("imports")
      .download(storage_path);
    if (downloadErr) throw downloadErr;

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const parsed = parseWorkbook(bytes);
    if (parsed.length === 0) {
      throw new Error("Aucune ligne médecin trouvée dans le fichier.");
    }

    const potentielScores = computePotentielScores(parsed);
    const geocodes = await geocodeBatch(parsed);

    const { data: existing } = await admin
      .from("doctors")
      .select("id, onekey, ciblage, actif")
      .eq("sector_id", sector_id);
    const existingByOnekey = new Map((existing ?? []).map((d) => [d.onekey, d]));

    let nbCrees = 0;
    let nbMaj = 0;
    const seenOnekeys = new Set<string>();

    for (const d of parsed) {
      seenOnekeys.add(d.onekey);
      const geo = geocodes.get(d.onekey);
      const prev = existingByOnekey.get(d.onekey);

      const row = {
        sector_id,
        onekey: d.onekey,
        rpps: d.rpps,
        specialite: d.specialite,
        nom: d.nom,
        prenom: d.prenom,
        lieu_exercice: d.lieu_exercice,
        etablissement: d.etablissement,
        adresse: d.adresse,
        ville: d.ville,
        code_postal: d.code_postal,
        uga: d.uga,
        secteur_code: d.secteur_code,
        region: d.region,
        pression_vm: d.pression_vm,
        mode_reception: d.mode_reception,
        ciblage: d.ciblage,
        ciblage_precedent: prev && prev.ciblage !== d.ciblage ? prev.ciblage : (prev?.ciblage ?? null),
        action: d.action,
        rationnel: d.rationnel,
        frequence_max: d.frequence_max,
        potentiel_score: potentielScores.get(d.onekey) ?? null,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        geocoding_status: geo?.status ?? "pending",
        geocoding_source: geo ? "api_adresse_gouv" : null,
        actif: true,
        last_import_id: importRow.id,
      };

      const { data: upserted, error: upsertErr } = await admin
        .from("doctors")
        .upsert(row, { onConflict: "sector_id,onekey" })
        .select("id")
        .single();
      if (upsertErr) throw upsertErr;

      prev ? nbMaj++ : nbCrees++;

      if (Object.keys(d.products).length) {
        const weightRows = Object.entries(d.products).map(([product_code, poids]) => ({
          doctor_id: upserted.id,
          product_code,
          poids,
        }));
        const { error: weightsErr } = await admin
          .from("doctor_product_weights")
          .upsert(weightRows, { onConflict: "doctor_id,product_code" });
        if (weightsErr) throw weightsErr;
      }
    }

    // Retrait de ciblage : médecins connus du secteur, absents de ce nouvel import.
    const toRetire = (existing ?? [])
      .filter((d) => d.actif && !seenOnekeys.has(d.onekey))
      .map((d) => d.id);
    if (toRetire.length) {
      const { error: retireErr } = await admin
        .from("doctors")
        .update({ actif: false })
        .in("id", toRetire);
      if (retireErr) throw retireErr;
    }

    await admin
      .from("imports")
      .update({
        statut: "termine",
        nb_lignes_total: parsed.length,
        nb_crees: nbCrees,
        nb_maj: nbMaj,
        nb_retires: toRetire.length,
      })
      .eq("id", importRow.id);

    return new Response(
      JSON.stringify({
        import_id: importRow.id,
        nb_lignes_total: parsed.length,
        nb_crees: nbCrees,
        nb_maj: nbMaj,
        nb_retires: toRetire.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
    });
  }
});
