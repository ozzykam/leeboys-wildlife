import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesCalendarComponent } from './services-calendar.component';

describe('ServicesCalendarComponent', () => {
  let component: ServicesCalendarComponent;
  let fixture: ComponentFixture<ServicesCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesCalendarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicesCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
