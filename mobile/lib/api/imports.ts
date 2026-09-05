import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../supabase';
import type { ImportRecord } from '../types';

export interface ImportResult {
  import_id: string;
  nb_lignes_total: number;
  nb_crees: number;
  nb_maj: number;
  nb_retires: number;
}

// Le chemin Storage de Supabase rejette espaces, accents et autres caractères
// spéciaux ("Invalid key") : on ne nettoie que le chemin de stockage, le nom
// affiché à l'utilisatrice (nom_fichier) reste inchangé.
function sanitizeForStorageKey(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents (diacritiques Unicode combinants)
    .replace(/[^a-zA-Z0-9.\-_]/g, '_'); // remplace tout le reste (espaces, etc.) par "_"
}

// 1) pick un fichier xlsx/csv, 2) upload dans Storage (bucket "imports"),
// 3) appelle l'Edge Function qui parse + géocode + upsert.
export async function pickAndImportTargetingFile(sectorId: string): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const file = picked.assets[0];
  const response = await fetch(file.uri);
  const bytes = await response.arrayBuffer();

  const storagePath = `${sectorId}/${Date.now()}-${sanitizeForStorageKey(file.name)}`;
  const { error: uploadErr } = await supabase.storage
    .from('imports')
    .upload(storagePath, bytes, {
      contentType: file.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data, error } = await supabase.functions.invoke('import-targeting', {
    body: { sector_id: sectorId, storage_path: storagePath, nom_fichier: file.name },
  });
  if (error) throw error;
  return data as ImportResult;
}

export async function listImports(sectorId: string): Promise<ImportRecord[]> {
  const { data, error } = await supabase
    .from('imports')
    .select('*')
    .eq('sector_id', sectorId)
    .order('date_import', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
