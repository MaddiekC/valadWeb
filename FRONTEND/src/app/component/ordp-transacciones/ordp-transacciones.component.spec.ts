import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdpTransaccionesComponent } from './ordp-transacciones.component';

describe('OrdpTransaccionesComponent', () => {
  let component: OrdpTransaccionesComponent;
  let fixture: ComponentFixture<OrdpTransaccionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdpTransaccionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdpTransaccionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
