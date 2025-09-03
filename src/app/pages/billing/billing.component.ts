import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { InvoiceService, Invoice } from '../../data-access/invoice.service';
import { QuoteService, Quote } from '../../data-access/quote.service';
import { AuthService, UserProfile } from '../../data-access/auth.service';
import { InvoiceListComponent } from './invoice/invoice.component';
import { QuoteListComponent } from './quote/quote-list/quote-list.component';
import { Observable, map, switchMap, of, first } from 'rxjs';

@Component({
  selector: 'app-billing',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    InvoiceListComponent,
    QuoteListComponent
  ],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private quoteService = inject(QuoteService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  invoices$!: Observable<Invoice[]>;
  quotes$!: Observable<Quote[]>;
  currentUser$ = this.authService.user$;
  isAdmin$ = this.authService.isAdmin$;
  isLoading = true;
  currentTab: 'invoices' | 'quotes' = 'invoices';
  statusFilter: Invoice['status'] | Quote['status'] | 'all' = 'all';
  
  get statusOptions() {
    if (this.currentTab === 'quotes') {
      return [
        { value: 'all', label: 'All Quotes' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'converted', label: 'Converted' }
      ];
    } else {
      return [
        { value: 'all', label: 'All Invoices' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' }
      ];
    }
  }

  ngOnInit() {
    // Check for tab parameter from route
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'quotes') {
        this.currentTab = 'quotes';
      }
    });
    
    this.loadInvoices();
    this.loadQuotes();
  }

  loadInvoices() {
    this.invoices$ = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          this.isLoading = false;
          return of([]);
        }
        
        return this.authService.isAdmin$.pipe(
          switchMap(isAdmin => {
            // If admin, show all invoices; if user, show only their invoices
            if (isAdmin) {
              return this.invoiceService.getAllInvoices();
            } else {
              return this.invoiceService.getInvoicesByCustomer(user.uid);
            }
          })
        );
      }),
      map(invoices => {
        this.isLoading = false;
        
        // Apply status filter
        if (this.statusFilter === 'all') {
          return invoices.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }
        
        return invoices
          .filter(invoice => invoice.status === this.statusFilter)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      })
    );
  }

  loadQuotes() {
    this.quotes$ = this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }
        
        return this.authService.isAdmin$.pipe(
          switchMap(isAdmin => {
            // If admin, show all quotes; if user, show only their quotes
            if (isAdmin) {
              return this.quoteService.getAllQuotes();
            } else {
              return this.quoteService.getQuotesByCustomer(user.uid);
            }
          })
        );
      }),
      map(quotes => {
        // Apply status filter
        if (this.statusFilter === 'all') {
          return quotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }
        
        return quotes
          .filter(quote => quote.status === this.statusFilter)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      })
    );
  }

  onStatusFilterChange() {
    if (this.currentTab === 'invoices') {
      this.loadInvoices();
    } else {
      this.loadQuotes();
    }
  }

  setTab(tab: 'invoices' | 'quotes') {
    this.currentTab = tab;
    this.statusFilter = 'all'; // Reset filter when switching tabs
  }

  getStatusBadgeClass(status: Invoice['status'] | Quote['status']): string {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-600`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'converted':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  formatDate(date: Date | any): string {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleDateString();
    }
    
    // Handle Date objects
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    }
    
    // Fallback
    const fallbackDate = new Date(date);
    return isNaN(fallbackDate.getTime()) ? 'Invalid Date' : fallbackDate.toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  handleInvoiceStatusUpdate(event: {id: string, status: Invoice['status']}) {
    // The invoice service will handle the update, and the observable will automatically refresh
    console.log('Invoice status updated:', event);
  }

  handleQuoteStatusUpdate(event: {id: string, status: Quote['status']}) {
    // The quote service will handle the update, and the observable will automatically refresh
    console.log('Quote status updated:', event);
  }

  handleConvertQuoteToInvoice(quoteId: string) {
    // The quote service will handle the conversion, and the observables will automatically refresh
    console.log('Quote converted to invoice:', quoteId);
    // Reload both quotes and invoices to reflect changes
    this.loadQuotes();
    this.loadInvoices();
  }

  getStatusCount(status: Invoice['status'] | Quote['status'], items: Invoice[] | Quote[]): number {
    return items.filter(item => item.status === status).length;
  }

}
