import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AdminComponent } from './admin/admin.component';
import { AuthGuard } from '@auth0/auth0-angular';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard]
    },
    { 
        path: '**',
        redirectTo: ''
    }
];
