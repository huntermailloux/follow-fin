import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface WordleWord {
  id: number;
  date: string | null;
  solution: string | null;
  puzzle_id: number | null;
  editor: string | null;
  print_date: string | null;
  days_since_launch: number | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.key);
  }

  async getAllWords(): Promise<WordleWord[]> {
    const batchSize = 1000;
    let page = 0;
    let all: WordleWord[] = [];

    while (true) {
      const from = page * batchSize;
      const { data, error } = await this.supabase
        .from('wordle_words')
        .select('id, date, solution, puzzle_id, editor, print_date, days_since_launch')
        .order('date', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw new Error(`Supabase error ${error.code}: ${error.message}`);

      all = all.concat((data ?? []) as WordleWord[]);
      if ((data ?? []).length < batchSize) break;
      page++;
    }

    return all;
  }

  async backfillMissingWords(startDate: string, endDate: string): Promise<WordleWord[]> {
    // Proxy through our serverless function to avoid CORS on the NYT API
    const res = await fetch('/api/backfill-wordles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    });
    if (!res.ok) return [];
    const { words } = await res.json();
    if (!words?.length) return [];

    // Upsert using the browser Supabase client
    const fetched: WordleWord[] = [];
    for (const word of words) {
      const { data, error } = await this.supabase
        .from('wordle_words')
        .insert(word)
        .select('id, date, solution, puzzle_id, editor, print_date, days_since_launch');

      if (!error && data) {
        fetched.push(...(data as WordleWord[]));
      }
    }
    return fetched;
  }
}
