import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Quote, QuoteService } from '../../../../data-access/quote.service';
import { QuoteTableComponent } from '../quote-table/quote-table.component';
import { QuoteCardsComponent } from '../quote-cards/quote-cards.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quote-list',
  imports: [
    CommonModule, 
    MatIconModule, 
    QuoteTableComponent, 
    QuoteCardsComponent
  ],
  templateUrl: './quote-list.component.html',
  styleUrl: './quote-list.component.scss'
})
export class QuoteListComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private quoteService = inject(QuoteService);
  private resizeSubscription?: Subscription;

  @Input() quotes: Quote[] = [];
  @Input() isAdmin: boolean = false;
  
  @Output() updateQuoteStatusEvent = new EventEmitter<{id: string, status: Quote['status']}>();
  @Output() convertQuoteToInvoiceEvent = new EventEmitter<string>();

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

  viewQuote(quoteId: string) {
    this.router.navigate(['/billing/quote', quoteId]);
  }

  async updateQuoteStatus(quoteId: string, status: Quote['status']) {
    try {
      await this.quoteService.updateQuoteStatus(quoteId, status);
      this.updateQuoteStatusEvent.emit({ id: quoteId, status });
    } catch (error) {
      console.error('Error updating quote status:', error);
    }
  }

  async convertQuoteToInvoice({id: quoteId, invoiceNumber}: {id: string, invoiceNumber: string}) {
    try {
      await this.quoteService.convertQuoteToInvoice(quoteId, invoiceNumber);
      this.convertQuoteToInvoiceEvent.emit(quoteId);
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
    }
  }
}