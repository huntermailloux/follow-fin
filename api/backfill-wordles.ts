import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.body ?? {};
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const dates = dateRange(startDate, endDate);
  if (dates.length === 0) {
    return res.status(200).json({ words: [] });
  }

  const words: any[] = [];

  for (const date of dates) {
    try {
      const nytRes = await fetch(`https://www.nytimes.com/svc/wordle/v2/${date}.json`);
      if (!nytRes.ok) continue;
      const nyt: any = await nytRes.json();
      if (!nyt.solution || !nyt.print_date) continue;

      words.push({
        date:              nyt.print_date,
        solution:          nyt.solution,
        puzzle_id:         nyt.id,
        editor:            nyt.editor,
        print_date:        nyt.print_date,
        days_since_launch: nyt.days_since_launch,
      });
    } catch {
      // Skip dates that fail
    }
  }

  return res.status(200).json({ words });
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
