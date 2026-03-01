import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { sanitizeSearchInput } from '../lib/formatters';
import type { PstrRecord, PstrFilters, PaginationParams, PaginatedResponse } from '../types/database';

const PSTR_QUERY_KEY = 'pstr-records';

export function usePstrRecords(
  filters: PstrFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 25 }
) {
  return useQuery({
    queryKey: [PSTR_QUERY_KEY, filters, pagination],
    queryFn: async (): Promise<PaginatedResponse<PstrRecord>> => {
      const { page, pageSize, sortBy = 'sequence_no', sortOrder = 'desc' } = pagination;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('pstr_records')
        .select('*, patron:patrons(*)', { count: 'exact' })
        .range(from, to)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply filters — sanitize user input to prevent PostgREST filter injection
      if (filters.search) {
        const safe = sanitizeSearchInput(filters.search);
        if (safe.length > 0) {
          query = query.or(
            `compliance_notes.ilike.%${safe}%,` +
            `red_flag.ilike.%${safe}%`
          );
        }
      }
      if (filters.reason?.length) {
        query = query.in('reason', filters.reason);
      }
      if (filters.location?.length) {
        query = query.in('location', filters.location);
      }
      if (filters.year?.length) {
        query = query.in('year', filters.year);
      }
      if (filters.risk_rating?.length) {
        query = query.in('risk_rating', filters.risk_rating);
      }
      if (filters.str_committee_action?.length) {
        query = query.in('str_committee_action', filters.str_committee_action);
      }
      if (filters.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }
      if (filters.amount_min !== undefined) {
        query = query.gte('transaction_amount', filters.amount_min);
      }
      if (filters.amount_max !== undefined) {
        query = query.lte('transaction_amount', filters.amount_max);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data as PstrRecord[],
        count: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
  });
}

export function usePstrRecord(id: string | undefined) {
  return useQuery({
    queryKey: [PSTR_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('pstr_records')
        .select('*, patron:patrons(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as PstrRecord;
    },
    enabled: !!id,
  });
}

export function useCreatePstr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: Partial<PstrRecord>) => {
      const { data, error } = await supabase
        .from('pstr_records')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PSTR_QUERY_KEY] });
    },
  });
}

export function useUpdatePstr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PstrRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('pstr_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PSTR_QUERY_KEY] });
    },
  });
}

export function useDeletePstr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pstr_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PSTR_QUERY_KEY] });
    },
  });
}
