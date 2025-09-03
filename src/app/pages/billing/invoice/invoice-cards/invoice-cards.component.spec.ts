import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceCardsComponent } from './invoice-cards.component';

describe('InvoiceCardsComponent', () => {
  let component: InvoiceCardsComponent;
  let fixture: ComponentFixture<InvoiceCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
