import { supabase } from '../supabase';
import type { Sector } from '../types';

// V1 : un utilisateur a un unique secteur, créé automatiquement à l'inscription
// (trigger handle_new_user en base). On prend le premier secteur accessible.
export async function getMySector(): Promise<Sector> {
  const { data, error } = await supabase.from('sectors').select('*').limit(1).single();
  if (error) throw error;
  return data;
}
