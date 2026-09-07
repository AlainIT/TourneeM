import { supabase } from '../supabase';
import type { Sector } from '../types';

export interface ManagedSector {
  sector: Sector;
}

// Secteurs sur lesquels je suis invitée en tant que manager (lecture seule).
export async function listManagedSectors(): Promise<ManagedSector[]> {
  const { data, error } = await supabase
    .from('sector_members')
    .select('sectors(*)')
    .eq('role', 'manager');
  if (error) throw error;
  return (data ?? [])
    .map((row: any) => row.sectors)
    .filter((s: Sector | null): s is Sector => !!s)
    .map((sector: Sector) => ({ sector }));
}

export interface SectorManager {
  user_id: string;
  email: string;
}

export async function listSectorManagers(sectorId: string): Promise<SectorManager[]> {
  const { data, error } = await supabase.rpc('list_sector_managers', { target_sector_id: sectorId });
  if (error) throw error;
  return data ?? [];
}

export async function inviteManager(sectorId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('invite_manager_by_email', {
    target_sector_id: sectorId,
    manager_email: email.trim(),
  });
  if (error) throw error;
}

export async function revokeManager(sectorId: string, managerId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_sector_member', {
    target_sector_id: sectorId,
    member_user_id: managerId,
  });
  if (error) throw error;
}
