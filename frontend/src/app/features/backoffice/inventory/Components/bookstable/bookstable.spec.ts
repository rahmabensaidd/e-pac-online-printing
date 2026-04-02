import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bookstable } from './bookstable';

describe('Bookstable', () => {
  let component: Bookstable;
  let fixture: ComponentFixture<Bookstable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bookstable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bookstable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
