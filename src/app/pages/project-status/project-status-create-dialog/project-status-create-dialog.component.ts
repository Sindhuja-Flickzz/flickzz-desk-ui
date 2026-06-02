import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-project-status-create-dialog',
  templateUrl: './project-status-create-dialog.component.html',
  styleUrls: ['./project-status-create-dialog.component.scss']
})
export class ProjectStatusCreateDialogComponent {
  form: FormGroup;
  selectedColor: string = '#1976d2';
  colorOptions: string[] = [
    '#1976d2', // Blue
    '#388e3c', // Green
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#d32f2f', // Red
    '#00796b', // Teal
    '#fbc02d', // Amber
    '#c2185b'  // Pink
  ];

  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<ProjectStatusCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orgId: number }
  ) {
    this.form = this.formBuilder.group({
      progressName: ['', [Validators.required, Validators.minLength(3)]],
      progressSequence: [0, [Validators.required, Validators.min(1)]],
      colorCode: [this.selectedColor, Validators.required]
    });
  }

  onColorSelected(color: string): void {
    this.selectedColor = color;
    this.form.patchValue({ colorCode: color });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid) {
      const result = {
        ...this.form.value,
        orgId: this.data.orgId
      };
      this.dialogRef.close(result);
    }
  }

  getFormattedColorName(color: string): string {
    const colorNames: { [key: string]: string } = {
      '#1976d2': 'Blue',
      '#388e3c': 'Green',
      '#f57c00': 'Orange',
      '#7b1fa2': 'Purple',
      '#d32f2f': 'Red',
      '#00796b': 'Teal',
      '#fbc02d': 'Amber',
      '#c2185b': 'Pink'
    };
    return colorNames[color] || color;
  }
}
