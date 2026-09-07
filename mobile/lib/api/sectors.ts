import { supabase } from '../supabase';
import type { Sector } from '../types';

// V1 : un utilisateur a un unique secteur propre, créé automatiquement à
// l'inscription (trigger handle_new_user en base). On filtre explicitement
// sur owner_id : un manager invité sur le secteur d'une autre déléguée a
// aussi accès en lecture à ce secteur (voir has_sector_access), il ne faut
// donc pas se contenter du premier secteur accessible.
export async function getMySector(): Promise<Sector> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sectors')
    .select('*')
    .eq('owner_id', auth.user!.id)
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}
