import { Routes } from '@angular/router';
import { WordleTableComponent } from './wordle-table/wordle-table.component';

export const routes: Routes = [
  { path: '', component: WordleTableComponent },
  { path: '**', redirectTo: '' }
];
