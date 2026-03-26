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

  const nytRes = await fetch(`https://www.nytimes.com/svc/wordle/v2/${dateStr}.json`);
  if (!nytRes.ok) {
    return res.status(502).json({ error: `NYT API returned ${nytRes.status} for ${dateStr}` });
  }

  const nyt = await nytRes.json();

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { error } = await supabase.from('wordle_words').upsert({
    date:              nyt.print_date,
    solution:          nyt.solution,
    puzzle_id:         nyt.id,
    editor:            nyt.editor,
    print_date:        nyt.print_date,
    days_since_launch: nyt.days_since_launch,
  }, { onConflict: 'date' });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, date: dateStr, word: nyt.solution });
}
