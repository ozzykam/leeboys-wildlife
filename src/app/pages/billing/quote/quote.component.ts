import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { QuoteService, Quote } from '../../../data-access/quote.service';
import { InvoiceService } from '../../../data-access/invoice.service';
import { AuthService } from '../../../data-access/auth.service';
import { Observable, switchMap } from 'rxjs';

@Component({
  selector: 'app-quote',
  imports: [CommonModule, MatIconModule],
  templateUrl: './quote.component.html',
  styleUrl: './quote.component.scss'
})
export class QuoteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quoteService = inject(QuoteService);
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);

  quote$!: Observable<Quote | null>;
  currentUser$ = this.authService.user$;
  isAdmin$ = this.authService.isAdmin$;
  isLoading = true;
  isConverting = false;

  ngOnInit() {
    this.quote$ = this.route.params.pipe(
      switchMap(params => {
        const quoteId = params['id'];
        return this.quoteService.getQuoteById(quoteId);
      })
    );
    
    // Handle loading state
    this.quote$.subscribe(quote => {
      this.isLoading = false;
      if (!quote) {
        this.router.navigate(['/billing']);
      }
    });
  }

  getStatusBadgeClass(status: Quote['status']): string {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800`;
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async updateQuoteStatus(quoteId: string, status: Quote['status']) {
    try {
      await this.quoteService.updateQuoteStatus(quoteId, status);
      // The observable will automatically update the UI
    } catch (error) {
      console.error('Error updating quote status:', error);
      alert('Failed to update quote status. Please try again.');
    }
  }

  async convertToInvoice(quoteId: string) {
    if (this.isConverting) return;
    
    this.isConverting = true;
    try {
      const invoiceNumber = await this.invoiceService.generateInvoiceNumber();
      const invoiceId = await this.quoteService.convertQuoteToInvoice(quoteId, invoiceNumber);
      
      // Navigate to the new invoice
      this.router.navigate(['/billing/invoice', invoiceId]);
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
      alert('Failed to convert quote to invoice. Please try again.');
    } finally {
      this.isConverting = false;
    }
  }

  goBack() {
    this.router.navigate(['/billing'], { queryParams: { tab: 'quotes' } });
  }

  printQuote() {
    window.print();
  }
}
