import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService, WordleWord } from '../services/supabase.service';

interface PageButton {
  label: string;
  page: number | null;
}

type SortColumn = 'days_since_launch' | 'date' | 'solution';

@Component({
  selector: 'app-wordle-table',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wordle-table.component.html',
  styleUrl: './wordle-table.component.scss'
})
export class WordleTableComponent implements OnInit, OnDestroy {
  allWords: WordleWord[] = [];
  paginatedWords: WordleWord[] = [];
  availableYears: number[] = [];
  pageItems: PageButton[] = [];

  searchInput = '';
  yearInput = '';
  monthInput = '';

  sortColumn: SortColumn = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  totalPages = 0;
  totalFiltered = 0;
  readonly pageSize = 50;

  loading = true;
  error: string | null = null;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly months = [
    { value: '1',  label: 'January'   },
    { value: '2',  label: 'February'  },
    { value: '3',  label: 'March'     },
    { value: '4',  label: 'April'     },
    { value: '5',  label: 'May'       },
    { value: '6',  label: 'June'      },
    { value: '7',  label: 'July'      },
    { value: '8',  label: 'August'    },
    { value: '9',  label: 'September' },
    { value: '10', label: 'October'   },
    { value: '11', label: 'November'  },
    { value: '12', label: 'December'  },
  ];

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    try {
      const words = await this.supabase.getAllWords();
      this.allWords = words;
      this.availableYears = [...new Set(
        words.filter(w => w.date).map(w => this.parseYear(w.date!))
      )].sort((a, b) => b - a);
      this.applyFilters();
    } catch (err: any) {
      this.error = err.message || 'Failed to load words. Check Supabase credentials.';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  get hasActiveFilters(): boolean {
    return this.searchInput !== '' || this.yearInput !== '' || this.monthInput !== '';
  }

  onSearchChange() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.applyFilters();
    }, 250);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  sort(column: SortColumn) {
    if (this.sortColumn === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDir = column === 'date' ? 'desc' : 'asc';
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters() {
    this.searchInput = '';
    this.yearInput = '';
    this.monthInput = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  changePage(page: number | null) {
    if (page === null || page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  sortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  private applyFilters() {
    let words = this.allWords;
    const search = this.searchInput.trim().toLowerCase();

    if (search) {
      words = words.filter(w => w.solution?.toLowerCase().includes(search));
    }
    if (this.yearInput) {
      const y = Number(this.yearInput);
      words = words.filter(w => w.date && this.parseYear(w.date) === y);
    }
    if (this.monthInput) {
      const m = Number(this.monthInput);
      words = words.filter(w => w.date && this.parseMonth(w.date) === m);
    }

    const dir = this.sortDir === 'asc' ? 1 : -1;
    words = [...words].sort((a, b) => {
      switch (this.sortColumn) {
        case 'solution':
          return (a.solution ?? '').localeCompare(b.solution ?? '') * dir;
        case 'days_since_launch':
          return ((a.days_since_launch ?? 0) - (b.days_since_launch ?? 0)) * dir;
        default:
          return (a.date ?? '').localeCompare(b.date ?? '') * dir;
      }
    });

    this.totalFiltered = words.length;
    this.totalPages = Math.max(1, Math.ceil(words.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedWords = words.slice(start, start + this.pageSize);
    this.buildPageItems();
  }

  private buildPageItems() {
    const total = this.totalPages;
    const current = this.currentPage;
    const items: PageButton[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) items.push({ label: String(i), page: i });
      this.pageItems = items;
      return;
    }

    const nums = new Set<number>([1, total]);
    for (let p = Math.max(2, current - 2); p <= Math.min(total - 1, current + 2); p++) {
      nums.add(p);
    }

    const sorted = Array.from(nums).sort((a, b) => a - b);
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) items.push({ label: '…', page: null });
      items.push({ label: String(p), page: p });
      prev = p;
    }

    this.pageItems = items;
  }

  private parseYear(dateStr: string): number {
    return Number(dateStr.slice(0, 4));
  }

  private parseMonth(dateStr: string): number {
    return Number(dateStr.slice(5, 7));
  }
}
