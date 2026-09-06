import { supabase } from '../supabase';
import type { Profile } from '../types';

export async function getMyProfile(): Promise<Profile> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user!.id)
    .single();
  if (error) throw error;
  return data;
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lon: number;
}

// Géocodage d'une adresse unique (saisie manuelle du domicile) via l'API
// Adresse (data.gouv.fr) — contrairement à l'import de masse, un simple GET
// suffit ici, pas besoin du point d'entrée batch CSV.
export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Recherche d'adresse indisponible.");
  const json = await res.json();
  return (json.features ?? []).map((f: any) => ({
    label: f.properties.label as string,
    lon: f.geometry.coordinates[0] as number,
    lat: f.geometry.coordinates[1] as number,
  }));
}

export async function updateHomeAddress(params: {
  adresse: string;
  lat: number;
  lon: number;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('profiles')
    .update({
      adresse_domicile: params.adresse,
      domicile_lat: params.lat,
      domicile_lon: params.lon,
    })
    .eq('id', auth.user!.id);
  if (error) throw error;
}

export async function clearHomeAddress(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('profiles')
    .update({ adresse_domicile: null, domicile_lat: null, domicile_lon: null })
    .eq('id', auth.user!.id);
  if (error) throw error;
}
