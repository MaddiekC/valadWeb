import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtsComponent } from './ats.component';

describe('AtsComponent', () => {
  let component: AtsComponent;
  let fixture: ComponentFixture<AtsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
