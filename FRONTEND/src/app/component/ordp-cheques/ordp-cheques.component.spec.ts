import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdpChequesComponent } from './ordp-cheques.component';

describe('OrdpChequesComponent', () => {
  let component: OrdpChequesComponent;
  let fixture: ComponentFixture<OrdpChequesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdpChequesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdpChequesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
