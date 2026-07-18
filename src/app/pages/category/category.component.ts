import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { PageEvent } from '@angular/material/paginator';
import { CompanyService } from '../../service/company.service';
import { CategoryService } from '../../service/category.service';
import { CategoryMaster } from '../../models/category-master';
import { USER_ROLES } from '../../data/app_constants';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Category';
  categoryForm: FormGroup;
  categories: CategoryMaster[] = [];
  filteredCategories: CategoryMaster[] = [];
  searchValue = '';
  loading = false;
  isSubmitting = false;
  formError: Record<string, string> = {};
  submitSuccess = '';
  submitError = '';
  isEditMode = false;
  editingCategoryId: number | null = null;
  subCategoryInput = '';
  selectedSubCategories: string[] = [];
  hoveredSubCategoryCategoryId: number | null = null;
  selectionMode: 'internal' | 'bp' = 'internal';
  selectedContextOrgId = Number(localStorage.getItem('userOrgId') || 0);
  businessPartnerId: number | null = null;
  businessPartnerName: string | null = null;
  contextLabel = 'Using your organization configuration';
  bpOptions: any[] = [];
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private location: Location
  ) {
    this.categoryForm = this.fb.group({
      categoryId: [null],
      categoryName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const orgId = params.get('orgId');
      const bpId = params.get('businessPartnerId');
      const bpName = params.get('companyName');
      this.selectionMode = mode === 'bp' ? 'bp' : 'internal';
      this.selectedContextOrgId = orgId ? Number(orgId) : Number(localStorage.getItem('userOrgId') || 0);
      this.businessPartnerId = bpId ? Number(bpId) : null;
      this.businessPartnerName = bpName || null;
      this.contextLabel = this.selectionMode === 'bp'
        ? `Using business partner configuration for ${this.businessPartnerName || this.businessPartnerId}`
        : 'Using your organization configuration';
    });

    if (this.selectionMode === 'bp' && !this.businessPartnerId) {
      this.loadBpOptions();
    }
  }

  backToPrevious(): void {
    this.location.back();
  }

  selectTab(tab: 'create' | 'list'): void {
    this.activeTab = tab;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    if (tab === 'create') {
      if (!this.isEditMode) {
        this.resetForm();
      }
      this.pageTitle = this.isEditMode ? 'Edit Category' : 'Create Category';
      return;
    }

    this.isEditMode = false;
    this.editingCategoryId = null;
    this.pageTitle = 'Create Category';
    this.resetForm();
    this.loadCategories();
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingCategoryId = null;
    this.pageTitle = 'Create Category';
    this.categoryForm.reset({
      categoryId: null,
      categoryName: ''
    });
    this.subCategoryInput = '';
    this.selectedSubCategories = [];
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  addSubCategory(): void {
    const value = (this.subCategoryInput || '').trim();
    if (!value) {
      this.formError['subCategories'] = 'Please enter a subcategory name.';
      return;
    }

    if (this.selectedSubCategories.some((item) => item.toLowerCase() === value.toLowerCase())) {
      this.formError['subCategories'] = 'This subcategory has already been added.';
      return;
    }

    this.formError['subCategories'] = '';
    this.selectedSubCategories.push(value);
    this.subCategoryInput = '';
  }

  removeSubCategory(index: number): void {
    this.selectedSubCategories.splice(index, 1);
  }

  loadBpOptions(): void {
    const orgId = Number(localStorage.getItem('userOrgId') || 0);
    if (!orgId) {
      this.bpOptions = [];
      return;
    }

    this.companyService.getServiceProviderList(orgId).subscribe({
      next: (response) => {
        this.bpOptions = (response as any).attributes || response || [];
      },
      error: () => {
        this.bpOptions = [];
      }
    });
  }

  selectBp(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.businessPartnerId = value ? Number(value) : null;
    this.formError['businessPartner'] = '';
  }

  startEdit(category: CategoryMaster): void {
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';
    this.isEditMode = true;
    this.editingCategoryId = category.categoryId ?? null;
    this.pageTitle = 'Edit Category';
    this.activeTab = 'create';
    this.categoryForm.patchValue({
      categoryId: category.categoryId ?? null,
      categoryName: category.categoryName || ''
    });
    this.selectedSubCategories = this.extractSubCategoryNames(category);
  }

  onSave(): void {
    this.isSubmitting = true;
    this.formError = {};
    this.submitError = '';
    this.submitSuccess = '';

    const categoryName = (this.categoryForm.get('categoryName')?.value || '').trim();
    if (!categoryName) {
      this.formError['categoryName'] = 'Category name is required.';
    }

    if (this.selectedSubCategories.length === 0) {
      this.formError['subCategories'] = 'Please add at least one subcategory.';
    }

    if (this.selectionMode === 'bp' && !this.businessPartnerId) {
      this.formError['businessPartner'] = 'Please select a business partner.';
    }

    if (Object.keys(this.formError).length > 0) {
      this.isSubmitting = false;
      return;
    }

    const payload: any = {
      categoryId: this.editingCategoryId,
      categoryName,
      subCategories: this.selectedSubCategories,
      businessPartnerId: this.businessPartnerId ?? this.selectedContextOrgId,
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isActive: true,
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    const request$ = this.isEditMode && this.editingCategoryId
      ? this.categoryService.updateCategory(payload)
      : this.categoryService.createCategory(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = this.isEditMode ? 'Category updated successfully.' : 'Category created successfully.';
        setTimeout(() => {
          this.loadCategories();
          this.resetForm();
          this.activeTab = 'list';
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(this.isEditMode ? 'Update category error' : 'Create category error', err);
        this.submitError = err.error?.description || err.error?.message || (this.isEditMode ? 'Failed to update category.' : 'Failed to create category.');
      }
    });
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getAllCategories(this.businessPartnerId).subscribe({
      next: (result) => {
        this.categories = this.normalizeCategories(result);
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.categories = [];
        this.filteredCategories = [];
        this.loading = false;
      }
    });
  }

  normalizeCategories(result: any): CategoryMaster[] {
    if (Array.isArray(result)) {
      return result;
    }
    if (Array.isArray((result as any)?.attributes)) {
      return (result as any).attributes;
    }
    if (Array.isArray((result as any)?.data)) {
      return (result as any).data;
    }
    if (Array.isArray((result as any)?.categories)) {
      return (result as any).categories;
    }
    return result ? [result] : [];
  }

  deleteCategory(category: CategoryMaster): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Category',
        message: `Are you sure you want to delete category "${category.categoryName}"?`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || !category.categoryId) {
        return;
      }

      this.loading = true;
      this.categoryService.deleteCategory(category.categoryId).subscribe({
        next: () => {
          this.loading = false;
          this.submitSuccess = 'Category deleted successfully.';
          this.loadCategories();
        },
        error: (err) => {
          this.loading = false;
          console.error('Delete category error', err);
          this.submitError = err.error?.message || err.error?.description || 'Failed to delete category.';
        }
      });
    });
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    if (!term) {
      this.filteredCategories = this.categories;
    } else {
      this.filteredCategories = this.categories.filter((category) => {
        const categoryName = category.categoryName || '';
        const subCategories = this.extractSubCategoryNames(category).join(', ');
        return categoryName.toLowerCase().includes(term) || subCategories.toLowerCase().includes(term);
      });
    }
    this.totalRecords = this.filteredCategories.length;
    this.currentPage = 0;
  }

  getPaginatedCategories(): CategoryMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredCategories.slice(startIndex, endIndex);
  }

  getCategorySubCategories(category: CategoryMaster): string[] {
    return this.extractSubCategoryNames(category);
  }

  getCategoryOrganization(): string {
    if (this.selectionMode === 'bp') {
      return this.businessPartnerName || localStorage.getItem('userOrgName') || '-';
    }
    return localStorage.getItem('userOrgName') || '-';
  }

  extractSubCategoryNames(category: CategoryMaster): string[] {
    const source = (category as any).subCategories || (category as any).subCategoryList || (category as any).subcategories || (category as any).subCategorys || [];
    if (Array.isArray(source)) {
      return source
        .map((item: any) => {
          if (typeof item === 'string') {
            return item;
          }
          return item?.subCategoryName || item?.name || item?.subcategoryName || '';
        })
        .filter(Boolean);
    }
    return [];
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
