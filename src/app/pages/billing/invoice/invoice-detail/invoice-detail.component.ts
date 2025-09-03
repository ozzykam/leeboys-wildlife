import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InvoiceService, Invoice } from '../../../../data-access/invoice.service';
import { AuthService } from '../../../../data-access/auth.service';
import { Observable, switchMap } from 'rxjs';

@Component({
  selector: 'app-invoice-detail',
  imports: [CommonModule, MatIconModule],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss'
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);

  invoice$!: Observable<Invoice | null>;
  currentUser$ = this.authService.user$;
  isAdmin$ = this.authService.isAdmin$;
  isLoading = true;

  ngOnInit() {
    this.invoice$ = this.route.params.pipe(
      switchMap(params => {
        const invoiceId = params['id'];
        return this.invoiceService.getInvoiceById(invoiceId);
      })
    );
    
    // Handle loading state
    this.invoice$.subscribe(invoice => {
      this.isLoading = false;
      if (!invoice) {
        this.router.navigate(['/billing']);
      }
    });
  }

  getStatusBadgeClass(status: Invoice['status']): string {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
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

  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']) {
    try {
      await this.invoiceService.updateInvoiceStatus(invoiceId, status);
      // The observable will automatically update the UI
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Failed to update invoice status. Please try again.');
    }
  }

  goBack() {
    this.router.navigate(['/billing'], { queryParams: { tab: 'invoices' } });
  }

  printInvoice() {
    window.print();
  }
}
