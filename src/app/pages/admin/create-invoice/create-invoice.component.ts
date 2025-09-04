import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { InvoiceService, Invoice, InvoiceItem } from '../../../data-access/invoice.service';
import { QuoteService, Quote, QuoteItem } from '../../../data-access/quote.service';
import { AuthService, UserProfile } from '../../../data-access/auth.service';
import { Observable, of, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-invoice',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './create-invoice.component.html',
  styleUrl: './create-invoice.component.scss'
})
export class CreateInvoiceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private invoiceService = inject(InvoiceService);
  private quoteService = inject(QuoteService);
  private authService = inject(AuthService);

  documentForm!: FormGroup;
  isSubmitting = false;
  currentUser$ = this.authService.user$;
  
  // Component state
  mode: 'quote' | 'invoice' = 'quote';
  selectedUser: UserProfile | null = null;
  serviceRequestId?: string;

  ngOnInit() {
    this.initializeForm();
    this.checkRouteParams();
  }

  checkRouteParams() {
    // Load customer data from route params passed from User Management
    this.route.queryParams.subscribe(params => {
      this.serviceRequestId = params['serviceRequestId'];
      this.mode = params['mode'] === 'quote' ? 'quote' : 'invoice';
      
      // Pre-populate with customer data from User Management
      if (params['customerName']) {
        this.prefillCustomerData(params);
      }
    });
  }

  prefillCustomerData(params: any) {
    // Create a UserProfile-like object from route params
    this.selectedUser = {
      uid: params['customerId'] || '',
      firstName: params['customerFirstName'] || '',
      lastName: params['customerLastName'] || '',
      displayName: params['customerName'] || '',
      email: params['customerEmail'] || '',
      phone: params['customerPhone'] || '',
      role: 'user' as 'user',
      address: {
        street: params['customerStreet'] || '',
        city: params['customerCity'] || '',
        state: params['customerState'] || '',
        zipCode: params['customerZipCode'] || ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Pre-populate form with customer data
    this.documentForm.patchValue({
      customerName: this.selectedUser.displayName,
      customerEmail: this.selectedUser.email,
      customerAddress: this.selectedUser.address
    });
  }

  initializeForm() {
    this.documentForm = this.fb.group({
      customerName: ['', [Validators.required]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerAddress: this.fb.group({
        street: ['', [Validators.required]],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        zipCode: ['', [Validators.required]]
      }),
      items: this.fb.array([this.createItemFormGroup()]),
      taxRate: [0.08, [Validators.required, Validators.min(0), Validators.max(1)]],
      validUntil: ['', [Validators.required]], // For quotes
      notes: ['']
    });

    // Set default valid until date to 30 days from now
    const defaultValidUntil = new Date();
    defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
    this.documentForm.patchValue({
      validUntil: defaultValidUntil.toISOString().split('T')[0]
    });
  }

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      description: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get items(): FormArray {
    return this.documentForm.get('items') as FormArray;
  }


  addItem() {
    this.items.push(this.createItemFormGroup());
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  getItemTotal(index: number): number {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    return quantity * unitPrice;
  }

  getSubtotal(): number {
    return this.items.controls.reduce((sum, item, index) => {
      return sum + this.getItemTotal(index);
    }, 0);
  }

  getTaxAmount(): number {
    const subtotal = this.getSubtotal();
    const taxRate = this.documentForm.get('taxRate')?.value || 0;
    return subtotal * taxRate;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTaxAmount();
  }

  async saveAsQuote() {
    if (this.documentForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      try {
        const formValue = this.documentForm.value;
        const currentUser = await firstValueFrom(this.currentUser$);
        
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        // Generate quote number
        const quoteNumber = await this.quoteService.generateQuoteNumber();

        // Process items
        const items: QuoteItem[] = formValue.items.map((item: any, index: number) => ({
          id: `item_${index + 1}`,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: this.getItemTotal(index)
        }));

        // Calculate totals
        const totals = this.quoteService.calculateQuoteTotals(items, formValue.taxRate);

        // Create quote
        const quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'> = {
          quoteNumber,
          customerId: this.selectedUser?.uid || '',
          customerName: formValue.customerName,
          customerEmail: formValue.customerEmail,
          customerAddress: formValue.customerAddress,
          items,
          subtotal: totals.subtotal,
          taxRate: formValue.taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          status: 'draft',
          validUntil: new Date(formValue.validUntil),
          issueDate: new Date(),
          notes: formValue.notes,
          createdBy: currentUser.uid,
          ...(this.selectedUser?.billingAccountId && { billingAccountId: this.selectedUser.billingAccountId }),
          ...(this.serviceRequestId && { serviceRequestId: this.serviceRequestId })
        };

        await this.quoteService.createQuote(quote);
        
        // Navigate back to admin dashboard
        await this.router.navigate(['/admin'], { queryParams: { tab: 'invoices' } });
        
      } catch (error) {
        console.error('Error creating quote:', error);
        // may want to show a toast notification or error message here
        alert('Failed to create quote. Please try again.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async createDirectInvoice() {
    if (this.documentForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      try {
        const formValue = this.documentForm.value;
        const currentUser = await firstValueFrom(this.currentUser$);
        
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        // Generate invoice number
        const invoiceNumber = await this.invoiceService.generateInvoiceNumber();

        // Process items
        const items: InvoiceItem[] = formValue.items.map((item: any, index: number) => ({
          id: `item_${index + 1}`,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: this.getItemTotal(index)
        }));

        // Calculate totals
        const totals = this.invoiceService.calculateInvoiceTotals(items, formValue.taxRate);

        // Create invoice
        const invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
          invoiceNumber,
          customerId: this.selectedUser?.uid || '',
          customerName: formValue.customerName,
          customerEmail: formValue.customerEmail,
          customerAddress: formValue.customerAddress,
          items,
          subtotal: totals.subtotal,
          taxRate: formValue.taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          status: 'draft',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          issueDate: new Date(),
          notes: formValue.notes,
          createdBy: currentUser.uid
        };

        await this.invoiceService.createInvoice(invoice);
        
        // Navigate back to admin dashboard
        await this.router.navigate(['/admin'], { queryParams: { tab: 'invoices' } });
        
      } catch (error) {
        console.error('Error creating invoice:', error);
        // Might want to show a toast notification or error message here
        alert('Failed to create invoice. Please try again.');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  onCancel() {
    this.router.navigate(['/admin']);
  }
}
