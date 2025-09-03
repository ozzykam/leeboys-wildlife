import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { Observable } from 'rxjs';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  issueDate: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string; // Admin user ID who created the invoice
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private firestoreService = inject(FirestoreService);
  private collectionName = 'invoices';

  // Create a new invoice
  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const invoiceData = {
      ...invoice,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await this.firestoreService.addDocument(this.collectionName, invoiceData);
    return docRef.id;
  }

  // Get all invoices (admin only)
  getAllInvoices(): Observable<Invoice[]> {
    return this.firestoreService.getCollectionObservable(this.collectionName);
  }

  // Get invoices for a specific customer
  getInvoicesByCustomer(customerId: string): Observable<Invoice[]> {
    return this.firestoreService.getCollectionQuery(
      this.collectionName, 
      [{ field: 'customerId', operator: '==', value: customerId }]
    );
  }

  // Get a single invoice by ID
  getInvoiceById(invoiceId: string): Observable<Invoice | null> {
    return this.firestoreService.getDocumentObservable(this.collectionName, invoiceId);
  }

  // Update invoice status
  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Promise<void> {
    await this.firestoreService.updateDocument(this.collectionName, invoiceId, {
      status,
      updatedAt: new Date()
    });
  }

  // Update entire invoice
  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<void> {
    await this.firestoreService.updateDocument(this.collectionName, invoiceId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  // Delete an invoice
  async deleteInvoice(invoiceId: string): Promise<void> {
    await this.firestoreService.deleteDocument(this.collectionName, invoiceId);
  }

  // Generate next invoice number
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    try {
      // Get all invoices using the new getCollection method
      const allInvoices = await this.firestoreService.getCollection(this.collectionName) || [];
      const currentYearInvoices = allInvoices.filter(invoice => 
        invoice.invoiceNumber?.startsWith(`INV-${year}-`)
      );
      
      const invoiceCount = currentYearInvoices.length + 1;
      return `INV-${year}-${invoiceCount.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to timestamp-based approach
      return `INV-${year}-${Date.now().toString().slice(-4)}`;
    }
  }

  // Calculate invoice totals
  calculateInvoiceTotals(items: InvoiceItem[], taxRate: number = 0.08) {
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