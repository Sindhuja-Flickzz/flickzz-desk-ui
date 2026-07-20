import { FormBuilder } from '@angular/forms';
import { SupportCategoryComponent } from './support-category.component';

describe('SupportCategoryComponent', () => {
  it('should populate form controls from nested assignment data when editing', () => {
    const component = new SupportCategoryComponent(
      new FormBuilder(),
      {} as any,
      {} as any,
      { queryParamMap: { subscribe: () => undefined } } as any,
      { back: jasmine.createSpy('back') } as any
    );

    component.startEdit({
      assignmentId: 77,
      supportGroupId: null,
      subCategoryId: null,
      supportGroup: { supportGroupId: 10, groupName: 'Group A' },
      subCategory: { subCategoryId: 20, subCategoryName: 'Sub A' }
    } as any);

    expect(component.assignmentForm.get('supportGroupId')?.value).toBe(10);
    expect(component.assignmentForm.get('subCategoryId')?.value).toBe(20);
    expect(component.selectedSupportGroup?.id).toBe(10);
    expect(component.selectedSubCategory?.id).toBe(20);
  });
});
