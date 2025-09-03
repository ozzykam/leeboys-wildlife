import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Quote } from '../../../../data-access/quote.service';

@Component({
  selector: 'app-quote-cards',
  imports: [CommonModule, MatIconModule],
  templateUrl: './quote-cards.component.html',
  styleUrl: './quote-cards.component.scss'
})
export class QuoteCardsComponent {
  @Input() quotes: Quote[] = [];
  @Input() isAdmin: boolean = false;
  
  @Output() viewQuoteEvent = new EventEmitter<string>();
  @Output() updateQuoteStatusEvent = new EventEmitter<{id: string, status: Quote['status']}>();
  @Output() convertQuoteToInvoiceEvent = new EventEmitter<{id: string, invoiceNumber: string}>();

  viewQuote(quoteId: string) {
    this.viewQuoteEvent.emit(quoteId);
  }

  updateQuoteStatus(quoteId: string, status: Quote['status']) {
    this.updateQuoteStatusEvent.emit({ id: quoteId, status });
  }

  convertQuoteToInvoice(quoteId: string, invoiceNumber: string) {
    this.convertQuoteToInvoiceEvent.emit({ id: quoteId, invoiceNumber });
  }

  getStatusBadgeClass(status: Quote['status']): string {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
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
}
