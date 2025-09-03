import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Invoice, InvoiceService } from '../../../data-access/invoice.service';
import { InvoiceTableComponent } from './invoice-table/invoice-table.component';
import { InvoiceCardsComponent } from './invoice-cards/invoice-cards.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-invoice-list',
  imports: [
    CommonModule, 
    MatIconModule, 
    InvoiceTableComponent, 
    InvoiceCardsComponent
  ],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceListComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private invoiceService = inject(InvoiceService);
  private resizeSubscription?: Subscription;

  @Input() invoices: Invoice[] = [];
  @Input() isAdmin: boolean = false;
  
  @Output() updateInvoiceStatusEvent = new EventEmitter<{id: string, status: Invoice['status']}>();

  isDesktop = false;

  ngOnInit() {
    this.checkScreenSize();
    this.resizeSubscription = new Subscription();
    
    // Add event listener for window resize
    const resizeHandler = () => {
      this.checkScreenSize();
    };
    
    window.addEventListener('resize', resizeHandler);
    
    // Store cleanup function
    this.resizeSubscription.add(() => {
      window.removeEventListener('resize', resizeHandler);
    });
  }

  ngOnDestroy() {
    this.resizeSubscription?.unsubscribe();
  }

  private checkScreenSize() {
    this.isDesktop = window.innerWidth >= 1024;
  }

  viewInvoice(invoiceId: string) {
    this.router.navigate(['/billing/invoice', invoiceId]);
  }

  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']) {
    try {
      await this.invoiceService.updateInvoiceStatus(invoiceId, status);
      this.updateInvoiceStatusEvent.emit({ id: invoiceId, status });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    }
  }
}
