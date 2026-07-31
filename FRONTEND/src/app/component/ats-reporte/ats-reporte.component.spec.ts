import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtsReporteComponent } from './ats-reporte.component';

describe('AtsReporteComponent', () => {
  let component: AtsReporteComponent;
  let fixture: ComponentFixture<AtsReporteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtsReporteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtsReporteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
