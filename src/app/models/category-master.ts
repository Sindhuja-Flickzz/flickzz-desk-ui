export interface CategorySubCategory {
  subCategoryId?: number;
  subCategoryName?: string;
  isActive?: boolean;
}

export interface CategoryMaster {
  categoryId?: number;
  categoryName?: string;
  subCategories?: CategorySubCategory[];
  subCategoryList?: CategorySubCategory[];
  businessPartnerId?: number;
  isActive?: boolean;
  createdBy?: number;
  updatedBy?: number;
}
