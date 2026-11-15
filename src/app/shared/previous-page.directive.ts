import { Directive, HostListener } from '@angular/core';
import { NavigationHistoryService } from '../service/navigation-history.service';

@Directive({
  selector: '[appPreviousPage]',
  standalone: true
})
export class PreviousPageDirective {
  constructor(private navigationHistory: NavigationHistoryService) {}

  @HostListener('click')
  navigateBack(): void {
    void this.navigationHistory.navigateBack();
  }
}
