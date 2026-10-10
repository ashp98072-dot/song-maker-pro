import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
export type ReportKind = 'song' | 'list' | 'comment' | 'user';
export type ModerationReport = Database['public']['Functions']['community_admin_reports']['Returns'][number];
export const REPORT_REASONS = { abuse: 'Acoso o discriminación', spam: 'Spam o fraude', sexual: 'Contenido sexual o explotación', violence: 'Violencia o amenazas', privacy: 'Datos personales', rights: 'Derechos de autor', other: 'Otro motivo' };
export type ReportReason = keyof typeof REPORT_REASONS;
export const MODERATION_CHANGED = 'community-moderation-changed';
export const RULES_REQUEST = 'community-rules-request';

export async function reportContent(kind: ReportKind, id: string, reason: ReportReason, details: string) {
  const { error } = await supabase.rpc('community_report', { p_kind: kind, p_target_id: id, p_reason: reason, p_details: details.trim() });
  if (error) throw new Error(error.message || 'No se pudo enviar el reporte');
}
export async function setUserBlocked(id: string, blocked: boolean) {
  const { error } = await supabase.rpc('community_set_block', { p_user_id: id, p_block: blocked });
  if (error) throw new Error(error.message || 'No se pudo cambiar el bloqueo');
  window.dispatchEvent(new Event(MODERATION_CHANGED));
}
export async function fetchMyBlocks() {
  const { data, error } = await supabase.rpc('community_my_blocks');
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function fetchModerationReports() {
  const { data, error } = await supabase.rpc('community_admin_reports');
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function resolveModerationReport(id: string, action: string, note: string) {
  const { error } = await supabase.rpc('community_admin_resolve', { p_report_id: id, p_action: action, p_note: note.trim() });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(MODERATION_CHANGED));
}
let rulesRequest: Promise<boolean> | null = null;
/** No local acceptance flag: Supabase is authoritative for the current account. */
export async function ensureCommunityRules(): Promise<boolean> {
  const { data, error } = await supabase.rpc('community_rules_status');
  if (error) throw new Error('No se pudieron consultar las reglas de Comunidad. Revisa la conexión.');
  if (data) return true;
  if (!rulesRequest) {
    rulesRequest = new Promise<boolean>(resolve => window.dispatchEvent(new CustomEvent(RULES_REQUEST, { detail: resolve })))
      .finally(() => { rulesRequest = null; });
  }
  return rulesRequest;
}
