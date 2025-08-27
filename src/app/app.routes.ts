import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Home route
  { 
    path: '', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  
  // Auth routes (only accessible when NOT logged in)
  { 
    path: 'signup', 
    canActivate: [GuestGuard],
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent)
  },
  { 
    path: 'login', 
    canActivate: [GuestGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  
  // Customer routes (authentication required)
  { 
    path: 'account', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent)
  },
  { 
    path: 'schedule-service', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent) // Temporary - will create scheduler component later
  },
  { 
    path: 'upcoming-services', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent) // Temporary - will create services-calendar component later
  },
  { 
    path: 'billing', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent) // Temporary - will create billing component later
  },
  
  // Public pages
  { 
    path: 'solutions', 
    loadComponent: () => import('./pages/solutions/solutions.component').then(m => m.SolutionsComponent)
  },
  { 
    path: 'about', 
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  { 
    path: 'contact', 
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  
  // Admin routes (admin authentication required)
  { 
    path: 'admin', 
    canActivate: [AdminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent)
  },
  
  // Fallback route
  { 
    path: '**', 
    redirectTo: '' 
  }
];
