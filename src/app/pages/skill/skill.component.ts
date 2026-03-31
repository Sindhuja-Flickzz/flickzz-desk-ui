import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { SkillService } from '../../service/skill.service';
import { SkillMaster, SkillRequest } from '../../models/skill-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-skill',
  templateUrl: './skill.component.html',
  styleUrls: ['./skill.component.scss']
})
export class SkillComponent implements OnInit {
  skillForm: FormGroup;
  activeTab: 'create' | 'list' = 'create';
  pageTitle = 'Create Skill';
  isEditMode = false;
  originalFormValue: any = null;

  skills: SkillMaster[] = [];
  skillList: string[] = []; // for create tab
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private skillService: SkillService,
    private dialog: MatDialog
  ) {
    this.skillForm = this.fb.group({
      skillId: [null],
      skillName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAllData();

    this.skillForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.loadSkillList();
    this.loading = false;
  }

  loadSkillList(): void {
    this.skillService.getAllSkills().subscribe({
      next: (result) => {
        this.skills = (result as any).attributes || [];
      },
      error: (err) => {
        console.error('Failed to load skills:', err);
      }
    });
  }

  selectTab(tab: 'create' | 'list'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.pageTitle = this.isEditMode ? 'Edit Skill' : 'Create Skill';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Skill';
      this.resetForm();
      this.loadSkillList();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Skill';
    this.skillForm.reset();
    this.skillList = [];
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
  }

  addSkill(): void {    
    this.submitError = '';
    this.submitSuccess = '';
    const skillName = this.skillForm.value.skillName?.trim();
    if (!skillName) {
      this.formError.skillName = 'Skill name is required';
      return;
    }
    if (this.skillList.includes(skillName)) {
      this.formError.skillName = 'Skill already added';
      return;
    }
    this.skillList.push(skillName);
    this.skillForm.patchValue({ skillName: '' });
    this.formError = {};
  }

  removeSkill(skillName: string): void {    
    this.submitError = '';
    this.submitSuccess = '';
    this.skillList = this.skillList.filter(s => s !== skillName);
  }

  onSave(): void {
    this.formError = {};

    if (this.isEditMode) {
      // Update single skill
      Object.keys(this.skillForm.controls).forEach(key => {
        const field = this.skillForm.get(key);
        if (field?.hasError('required')) {
          this.formError[key] = `${key} is required`;
        }
      });

      if (Object.keys(this.formError).length > 0) {
        return;
      }

      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        return;
      }

      const payload: SkillRequest = {
        skillId: this.skillForm.value.skillId,
        skillName: this.skillForm.value.skillName,
        createdBy: localStorage.getItem('userRole') || '',
        updatedBy: localStorage.getItem('userRole') || ''
      };

      this.skillService.updateSkill(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Skill updated successfully.';
          setTimeout(() => {
            this.skillForm.markAsPristine();
            this.originalFormValue = this.skillForm.getRawValue();
            this.loadSkillList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update skill error', err);
          this.submitError = err.error?.message || 'Failed to update skill.';
        }
      });
    } else {
      // Create multiple skills
      if (this.skillList.length === 0) {
        this.formError.skillName = 'At least one skill is required';
        return;
      }

      const requests: SkillRequest[] = this.skillList.map(name => ({
        skillName: name,
        createdBy: localStorage.getItem('userRole') || '',
        updatedBy: localStorage.getItem('userRole') || ''
      }));

      this.skillService.createSkills(requests).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Skills created successfully.';
          setTimeout(() => {
            this.activeTab = 'list';
            this.loadSkillList();
            this.resetForm();
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create skills error', err);
          this.submitError = err.error?.description || 'Failed to create skills.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.skillForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  onViewSkill(skill: SkillMaster): void {
    this.formError = {};
    this.activeTab = 'create';
    this.isEditMode = true;
    this.pageTitle = 'Edit Skill';
    this.skillForm.patchValue({
      skillId: skill.skillId,
      skillName: skill.skillName
    });
    this.skillList = []; // for edit, list is empty
    this.originalFormValue = this.skillForm.getRawValue();
  }

  onDeleteSkill(skill: SkillMaster): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Skill',
      message: `Are you sure you want to delete skill "${skill.skillName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showCancel: true,
      type: 'delete'
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.skillService.deleteSkill(skill.skillId).subscribe({
        next: () => {
          this.loadSkillList();
          this.submitSuccess = 'Skill deleted successfully.';
        },
        error: (err) => {
          console.error('Delete skill error', err);
          this.submitError = err.error?.message || 'Failed to delete skill.';
        }
      });
    });
  }
}