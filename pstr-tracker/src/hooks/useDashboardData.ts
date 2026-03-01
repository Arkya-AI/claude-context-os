import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DashboardKpi, ChartDataPoint, MonthlyTrend } from '../types/database';

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async (): Promise<DashboardKpi> => {
      const [totalRes, highRiskRes, submittedRes, monitoringRes, archivedRes] = await Promise.all([
        supabase.from('pstr_records').select('*', { count: 'exact', head: true }),
        supabase.from('pstr_records').select('*', { count: 'exact', head: true }).eq('risk_rating', 'HIGH'),
        supabase.from('pstr_records').select('*', { count: 'exact', head: true }).eq('str_committee_action', 'SUBMIT_TO_AMLC'),
        supabase.from('pstr_records').select('*', { count: 'exact', head: true }).eq('str_committee_action', 'FOR_MONITORING'),
        supabase.from('pstr_records').select('*', { count: 'exact', head: true }).eq('str_committee_action', 'ARCHIVE'),
      ]);

      // Current month volume
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyRes = await supabase
        .from('pstr_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart);

      // Pending actions (records without STR committee decision)
      const pendingRes = await supabase
        .from('pstr_records')
        .select('*', { count: 'exact', head: true })
        .is('str_committee_action', null);

      return {
        totalPstrs: totalRes.count ?? 0,
        highRiskCount: highRiskRes.count ?? 0,
        submittedToAmlc: submittedRes.count ?? 0,
        forMonitoring: monitoringRes.count ?? 0,
        archived: archivedRes.count ?? 0,
        monthlyVolume: monthlyRes.count ?? 0,
        pendingActions: pendingRes.count ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useMonthlyTrends() {
  return useQuery({
    queryKey: ['dashboard-monthly-trends'],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      const { data, error } = await supabase.rpc('get_monthly_trends');
      if (error) {
        // Fallback: fetch raw data and compute client-side
        const { data: records, error: fetchError } = await supabase
          .from('pstr_records')
          .select('transaction_date, transaction_amount')
          .not('transaction_date', 'is', null)
          .order('transaction_date');
        if (fetchError) throw fetchError;

        const monthMap = new Map<string, MonthlyTrend>();
        for (const r of records ?? []) {
          if (!r.transaction_date) continue;
          const d = new Date(r.transaction_date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const existing = monthMap.get(key) ?? { month: key, count: 0, amount: 0 };
          existing.count += 1;
          existing.amount += r.transaction_amount ?? 0;
          monthMap.set(key, existing);
        }
        return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
      }
      return data as MonthlyTrend[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useReasonDistribution() {
  return useQuery({
    queryKey: ['dashboard-reason-distribution'],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_reason_distribution');
      if (error) {
        // Fallback: client-side aggregation
        const { data: records, error: fetchError } = await supabase
          .from('pstr_records')
          .select('reason')
          .not('reason', 'is', null);
        if (fetchError) throw fetchError;
        const counts = new Map<string, number>();
        for (const r of records ?? []) {
          const key = r.reason ?? 'Unknown';
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
      }
      return (data as { label: string; value: number }[]) ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useLocationDistribution() {
  return useQuery({
    queryKey: ['dashboard-location-distribution'],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_location_distribution');
      if (error) {
        const { data: records, error: fetchError } = await supabase
          .from('pstr_records')
          .select('location')
          .not('location', 'is', null);
        if (fetchError) throw fetchError;
        const counts = new Map<string, number>();
        for (const r of records ?? []) {
          const key = r.location ?? 'Unknown';
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
      }
      return (data as { label: string; value: number }[]) ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useStrActionDistribution() {
  return useQuery({
    queryKey: ['dashboard-str-action-distribution'],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_str_action_distribution');
      if (error) {
        const { data: records, error: fetchError } = await supabase
          .from('pstr_records')
          .select('str_committee_action')
          .not('str_committee_action', 'is', null);
        if (fetchError) throw fetchError;
        const counts = new Map<string, number>();
        for (const r of records ?? []) {
          const key = r.str_committee_action ?? 'Unknown';
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
      }
      return (data as { label: string; value: number }[]) ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useYearlyComparison() {
  return useQuery({
    queryKey: ['dashboard-yearly-comparison'],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_yearly_comparison');
      if (error) {
        const { data: records, error: fetchError } = await supabase
          .from('pstr_records')
          .select('year')
          .not('year', 'is', null);
        if (fetchError) throw fetchError;
        const counts = new Map<string, number>();
        for (const r of records ?? []) {
          const key = String(r.year);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => a.label.localeCompare(b.label));
      }
      return (data as { label: string; value: number }[]) ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}
