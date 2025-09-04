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
    path: 'login', 
    canActivate: [GuestGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'activate-account',
    canActivate: [GuestGuard],
    loadComponent: () => import('./pages/account/activate-account/activate-account.component').then(m => m.ActivateAccountComponent)
  },
  
  // Customer routes (authentication required)
  { 
    path: 'account', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent)
  },
  { 
    path: 'edit-profile', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/account/edit-profile/edit-profile.component').then(m => m.EditProfileComponent)
  },
  { 
    path: 'schedule-service', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/scheduler/scheduler.component').then(m => m.SchedulerComponent) // Temporary - will create scheduler component later
  },
  { 
    path: 'upcoming-services', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/services-calendar/services-calendar.component').then(m => m.ServicesCalendarComponent) // Temporary - will create services-calendar component later
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
  { 
    path: 'admin/create-invoice', 
    canActivate: [AdminGuard],
    loadComponent: () => import('./pages/admin/create-invoice/create-invoice.component').then(m => m.CreateInvoiceComponent)
  },
  { 
    path: 'billing', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/billing/billing.component').then(m => m.BillingComponent)
  },
  { 
    path: 'billing/invoice/:id', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/billing/invoice/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent)
  },
  { 
    path: 'billing/quote/:id', 
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/billing/quote/quote.component').then(m => m.QuoteComponent)
  },
  { 
    path: 'create-user', 
    canActivate: [AdminGuard],
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent)
  },
  
  // Fallback route
  { 
    path: '**', 
    redirectTo: '' 
  }
];
