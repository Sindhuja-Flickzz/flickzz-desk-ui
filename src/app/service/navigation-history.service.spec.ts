import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NavigationHistoryService } from './navigation-history.service';

@Component({ template: '' })
class NavigationTestPageComponent {}

describe('NavigationHistoryService', () => {
  beforeEach(() => {
    sessionStorage.removeItem('flickzz-navigation-history');
    TestBed.configureTestingModule({
      declarations: [NavigationTestPageComponent],
      imports: [RouterTestingModule.withRoutes([
        { path: 'first', component: NavigationTestPageComponent },
        { path: 'second', component: NavigationTestPageComponent }
      ])]
    });
  });

  it('navigates to the latest previous page and removes the current visit from history', async () => {
    const router = TestBed.inject(Router);
    const navigationHistory = TestBed.inject(NavigationHistoryService);

    await router.navigateByUrl('/first?filter=mine');
    navigationHistory.initialize();
    await router.navigateByUrl('/second');

    expect(navigationHistory.currentPage).toBe('/second');
    expect(navigationHistory.previousPage).toBe('/first?filter=mine');

    await navigationHistory.navigateBack();

    expect(router.url).toBe('/first?filter=mine');
    expect(navigationHistory.currentPage).toBe('/first?filter=mine');
    expect(navigationHistory.previousPage).toBeUndefined();
  });
});
