import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { sanitizeSearchInput } from '../lib/formatters';
import type { Patron } from '../types/database';

const PATRONS_KEY = 'patrons';

export function usePatrons(search?: string, page = 1, pageSize = 25) {
  return useQuery({
    queryKey: [PATRONS_KEY, search, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('patrons')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('last_name');

      if (search) {
        const safe = sanitizeSearchInput(search);
        if (safe.length > 0) {
          query = query.or(
            `last_name.ilike.%${safe}%,first_name.ilike.%${safe}%,patron_number.ilike.%${safe}%`
          );
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data as Patron[],
        count: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
  });
}

export function usePatron(id: string | undefined) {
  return useQuery({
    queryKey: [PATRONS_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('patrons')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Patron;
    },
    enabled: !!id,
  });
}

export function usePatronSearch(searchTerm: string) {
  return useQuery({
    queryKey: [PATRONS_KEY, 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const safe = sanitizeSearchInput(searchTerm);
      if (safe.length < 2) return [];
      const { data, error } = await supabase
        .from('patrons')
        .select('id, patron_number, last_name, first_name')
        .or(`last_name.ilike.%${safe}%,first_name.ilike.%${safe}%,patron_number.ilike.%${safe}%`)
        .limit(10);
      if (error) throw error;
      return data as Patron[];
    },
    enabled: searchTerm.length >= 2,
  });
}

export function useCreatePatron() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patron: Partial<Patron>) => {
      const { data, error } = await supabase
        .from('patrons')
        .insert(patron)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PATRONS_KEY] });
    },
  });
}
