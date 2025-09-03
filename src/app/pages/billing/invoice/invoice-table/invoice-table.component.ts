import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Invoice } from '../../../../data-access/invoice.service';

@Component({
  selector: 'app-invoice-table',
  imports: [CommonModule, MatIconModule],
  templateUrl: './invoice-table.component.html',
  styleUrl: './invoice-table.component.scss'
})
export class InvoiceTableComponent {
  @Input() invoices: Invoice[] = [];
  @Input() isAdmin: boolean = false;
  
  @Output() viewInvoiceEvent = new EventEmitter<string>();
  @Output() updateInvoiceStatusEvent = new EventEmitter<{id: string, status: Invoice['status']}>();

  viewInvoice(invoiceId: string) {
    this.viewInvoiceEvent.emit(invoiceId);
  }

  updateInvoiceStatus(invoiceId: string, status: Invoice['status']) {
    this.updateInvoiceStatusEvent.emit({ id: invoiceId, status });
  }

  getStatusBadgeClass(status: Invoice['status']): string {
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
