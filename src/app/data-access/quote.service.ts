import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { InvoiceService } from './invoice.service';
import { Observable, firstValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id?: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  billingAccountId?: string;
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
  validUntil: Date;
  issueDate: Date;
  notes?: string;
  serviceRequestId?: string; // Link to service request if created from there
  invoiceId?: string; // Link to invoice if converted
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string; // Admin user ID who created the quote
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private firestoreService = inject(FirestoreService);
  private invoiceService = inject(InvoiceService);
  private collectionName = 'quotes';

  // Create a new quote
  async createQuote(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const quoteData = {
      ...quote,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await this.firestoreService.addDocument(this.collectionName, quoteData);
    return docRef.id;
  }

  // Get all quotes (admin only)
  getAllQuotes(): Observable<Quote[]> {
    return this.firestoreService.getCollectionObservable(this.collectionName);
  }

  // Get quotes for a specific customer
  getQuotesByCustomer(customerId: string): Observable<Quote[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName, 
      [{ field: 'customerId', operator: '==', value: customerId }]
    );
  }

  // Get a single quote by ID
  getQuoteById(quoteId: string): Observable<Quote | null> {
    return this.firestoreService.getDocumentObservable(this.collectionName, quoteId);
  }

  // Update quote status
  async updateQuoteStatus(quoteId: string, status: Quote['status']): Promise<void> {
    await this.firestoreService.updateDocument(this.collectionName, quoteId, {
      status,
      updatedAt: new Date()
    });
  }

  // Update entire quote
  async updateQuote(quoteId: string, updates: Partial<Quote>): Promise<void> {
    await this.firestoreService.updateDocument(this.collectionName, quoteId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  // Delete a quote
  async deleteQuote(quoteId: string): Promise<void> {
    await this.firestoreService.deleteDocument(this.collectionName, quoteId);
  }

  // Generate next quote number
  async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    try {
      // Get all quotes using the new getCollection method
      const allQuotes = await this.firestoreService.getCollection(this.collectionName) || [];
      const currentYearQuotes = allQuotes.filter(quote => 
        quote.quoteNumber?.startsWith(`QUO-${year}-`)
      );
      
      const quoteCount = currentYearQuotes.length + 1;
      return `QUO-${year}-${quoteCount.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating quote number:', error);
      // Fallback to timestamp-based approach
      return `QUO-${year}-${Date.now().toString().slice(-4)}`;
    }
  }

  // Convert quote to invoice
  async convertQuoteToInvoice(quoteId: string, invoiceNumber: string): Promise<string> {
    const quote = await firstValueFrom(this.getQuoteById(quoteId));
    if (!quote) {
      throw new Error('Quote not found');
    }

    // Create invoice data from quote
    const invoiceData = {
      invoiceNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      items: quote.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      status: 'draft' as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      issueDate: new Date(),
      notes: quote.notes,
      createdBy: quote.createdBy,
      quoteId: quote.id // Link back to original quote
    };

    // Create invoice using injected invoice service
    const invoiceId = await this.invoiceService.createInvoice(invoiceData);

    // Update quote status and link to invoice
    await this.updateQuote(quoteId, {
      status: 'converted',
      invoiceId
    });

    return invoiceId;
  }

  // Calculate quote totals
  calculateQuoteTotals(items: QuoteItem[], taxRate: number = 0.08) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    
    return {
      subtotal,
      taxAmount,
      total
    };
  }
}