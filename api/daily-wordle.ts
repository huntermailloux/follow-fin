import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel automatically sets this header on cron invocations
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  let nytRes: any;
  let nyt: any;
  try {
    nytRes = await fetch(`https://www.nytimes.com/svc/wordle/v2/${dateStr}.json`);
    if (!nytRes.ok) {
      return res.status(502).json({ error: `NYT API returned ${nytRes.status} for ${dateStr}` });
    }
    nyt = await nytRes.json();
  } catch (err: any) {
    return res.status(502).json({ error: `Failed to fetch NYT data: ${err?.message ?? err}` });
  }

  if (!nyt.solution || !nyt.print_date) {
    return res.status(502).json({ error: 'Unexpected NYT response shape', received: nyt });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from('wordle_words').insert({
    date:              nyt.print_date,
    solution:          nyt.solution,
    puzzle_id:         nyt.id,
    editor:            nyt.editor,
    print_date:        nyt.print_date,
    days_since_launch: nyt.days_since_launch,
  });

  if (error) return res.status(500).json({ error: error.message, details: error });

  return res.status(200).json({ ok: true, date: dateStr, word: nyt.solution });
}
