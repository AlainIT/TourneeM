import { supabase } from '../supabase';
import type { Doctor } from '../types';

export async function listDoctors(sectorId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('sector_id', sectorId)
    .order('nom', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDoctor(id: string): Promise<Doctor> {
  const { data, error } = await supabase.from('doctors').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
