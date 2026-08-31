import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { PlantService } from '../../service/plant.service';
import { AgentService } from '../../service/agent.service';
import { CountryMasterVO, PlantMaster, PlantMasterRequest } from '../../models/plant-master';
import { CalendarMasterVO } from '../../models/calendar-master';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { USER_ROLES, DAYS_OF_WEEK } from 'src/app/data/app_constants';
import { AgentSkillMapping } from 'src/app/models/user-vo';

interface AgentSuggestion {
  agentId: number;
  agentName: string;
  mailId?: string;
  accessId?: string;
}

interface AgentPlantMappingVO {
  mappingId: number;
  active: boolean;
  agent?: {
    agentId: number;
    agentName: string;
    agentSkillsMappings: AgentSkillMapping[];
    mailId?: string;
    accessId?: string;
  };
  plant?: {
    plantId: number;
    plantName: string;
    region?: CountryMasterVO;
    calendar?: CalendarMasterVO;
  };
}

@Component({
  selector: 'app-plant',
  templateUrl: './plant.component.html',
  styleUrls: ['./plant.component.scss']
})
export class PlantComponent implements OnInit {
  plantForm: FormGroup;
  activeTab: 'create' | 'list' | 'mapping' = 'create';
  pageTitle = 'Create Plant';
  isEditMode = false;
  originalFormValue: any = null;

  countries: CountryMasterVO[] = [];
  calendars: CalendarMasterVO[] = [];
  daysOfWeek = DAYS_OF_WEEK;
  plants: PlantMaster[] = [];
  activePlants: PlantMaster[] = [];
  filteredPlants: PlantMaster[] = [];
  activeAgents: AgentSuggestion[] = [];
  searchValue = '';
  selectedPlantId: number | null = null;

  mappingForm: FormGroup;
  mappingPlantSuggestions: { [key: number]: PlantMaster[] } = {};
  mappingAgentSuggestions: { [key: number]: AgentSuggestion[] } = {};
  agentSkillsByRow: { [key: number]: string[] } = {};
  mappingFilter = '';
  selectedMappingPlantId: number | null = null;
  mappingRowVisibility: boolean[] = [];
  mappingError = '';
  mappingSuccess = '';
  isMappingSubmitting = false;
  loading = false;
  formError: any = {};
  submitSuccess = '';
  submitError = '';
  isSubmitting = false;
  userOrgId: string = '';
  error: string | null = null;  

  alphanumericPattern = '^[a-zA-Z0-9 ]+$';

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalRecords = 0;
  currentPage = 0;

  // WeekOff popover state
  hoveredWeekOffPlantId: number | null = null;
  openWeekOffPlantId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private plantService: PlantService,
    private agentService: AgentService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.plantForm = this.fb.group({
      plantId: [null],
      plantName: ['', Validators.required],
      countryId: [null, Validators.required],
      calendarId: [null, Validators.required],
      weekOff: this.fb.array(this.createDaysCheckboxes())
    });

    this.mappingForm = this.fb.group({
      rows: this.fb.array([])
    });

    this.userOrgId = localStorage.getItem('userOrgId') || '';
  }

  ngOnInit(): void {
    this.loadAllData();

    this.plantForm.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        return;
      }
      this.submitError = '';
      this.submitSuccess = '';
    });
  }

  loadAllData(): void {
    this.loading = true;
    this.plantService.getAllCountries().subscribe({
      next: (response) => { this.countries = (response as any).attributes || []; },
      error: () => { this.countries = []; }
    });

    this.plantService.getAllCalendars(this.userOrgId).subscribe({
      next: (response) => { this.calendars = (response as any).attributes || []; },
      error: () => { this.calendars = []; }
    });

    this.loadActiveAgents();
    this.loadActivePlantList();
    this.plantForm.patchValue({
        countryId: "",
        calendarId: ""
    });
    this.loadPlantList();
    this.loading = false;
  }

  loadPlantList(): void {
    this.error = null;
    this.plantService.getAllPlants(this.userOrgId).subscribe({
      next: (result) => {
        this.plants = (result as any).attributes || [];
        this.searchValue = '';
        this.filterBySearch();
        this.currentPage = 0; // Reset to first page
      },
      error: (err) => {        
        this.error = err.error?.description || 'Failed to load plants. Please try again.';
        console.error('Failed to load plants:', err);
      }
    });
  }

  loadActivePlantList(): void {
    this.error = null;
    this.plantService.getActivePlants(this.userOrgId).subscribe({
      next: (result) => {
        this.activePlants = (result as any).attributes || [];
      },
      error: (err) => {
        this.activePlants = [];
        console.error('Failed to load active plants:', err);
      }
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.activeTab = 'list';  
  }

  backToHome(): void {
    this.router.navigate(['/settings']);
  }

  selectTab(tab: 'create' | 'list' | 'mapping'): void {
    this.formError = {};
    this.activeTab = tab;
    if (tab === 'create') {
      this.resetForm();
      this.pageTitle = this.isEditMode ? 'Edit Plant' : 'Create Plant';
    }
    if (tab === 'list') {
      this.isEditMode = false;
      this.pageTitle = 'Create Plant';
      this.resetForm();
      this.loadPlantList();
    }
    if (tab === 'mapping') {
      this.isEditMode = false;
      this.pageTitle = 'Map Plant to Agent';
      this.mappingError = '';
      this.mappingSuccess = '';
      this.mappingFilter = '';
      this.selectedMappingPlantId = null;
      this.loadActivePlantList();
      this.loadActiveAgents();
      this.loadPlantAgentMappings();
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.pageTitle = 'Create Plant';
    this.plantForm.reset({ isActive: true });
    this.originalFormValue = null;
    this.submitError = '';
    this.submitSuccess = '';
    this.plantForm.patchValue({
        countryId: "",
        calendarId: ""
    });
    // Reset weekOff checkboxes
    this.weekOffArray.controls.forEach(ctrl => ctrl.setValue(false));
  }

  onSave(): void {
    // this.isSubmitting = true;
    this.formError = {};

    Object.keys(this.plantForm.controls).forEach(key => {
        const field = this.plantForm.get(key);
        if (field?.hasError('required')) {
          this.formError[key] = key === 'plantName' ? 'Plant Name is required' : `${key} is required`;
        }
        if (key === 'plantName' && field?.hasError('pattern')) {
          this.formError[key] = 'Plant Name can contain only letters and numbers';
        }
        return;
    });

    if (Object.keys(this.formError).length === 0) {
      console.log('No errors');
    } else {
      console.log('Errors:', this.formError);
      return
    }

    const selectedWeekOff = this.daysOfWeek.filter((_, index) => this.weekOffArray.at(index).value);

    const payload: PlantMasterRequest = {
      plantId: this.plantForm.value.plantId,
      plantName: this.plantForm.value.plantName,
      countryId: Number(this.plantForm.value.countryId),
      calendarId: Number(this.plantForm.value.calendarId),
      weekOff: selectedWeekOff,
      companyId: Number(localStorage.getItem('userOrgId') || 0),
      createdBy: Number(localStorage.getItem('userId')),
      updatedBy: Number(localStorage.getItem('userId')),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    if (this.isEditMode) {
      if (!this.isFormChanged()) {
        this.submitError = 'No changes to update.';
        return;
      }

      this.plantService.updatePlant(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Plant updated successfully.';
          setTimeout(() => {
            this.plantForm.markAsPristine();
            this.originalFormValue = this.plantForm.getRawValue();
            this.loadPlantList();
            this.activeTab = 'list';
            this.isEditMode = false;
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update plant error', err);
          this.submitError = err.error?.message || 'Failed to update plant.';
        }
      });
    } else {
      this.plantService.createPlant(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'Plant created successfully.';
          setTimeout(() => {
            this.loadPlantList();
            this.resetForm();
            this.activeTab = 'list';
          }, 2000);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create plant error', err);
          this.submitError = err.error?.message || 'Failed to create plant.';
        }
      });
    }
  }

  isFormChanged(): boolean {
    if (!this.originalFormValue) {
      return true;
    }
    const current = this.plantForm.getRawValue();
    return JSON.stringify(current) !== JSON.stringify(this.originalFormValue);
  }

  onViewPlant(plant: PlantMaster): void {
    this.formError = {};
    this.activeTab = 'create';
    this.isEditMode = true;
    this.pageTitle = 'Edit Plant';
    this.plantForm.patchValue({
      plantId: plant.plantId,
      plantName: plant.plantName,
      countryId: plant.region?.countryId || null,
      calendarId: plant.calendar?.calendarId || null,
      isActive: plant.isActive,
      createdBy: plant.createdBy,
      updatedBy: plant.updatedBy || plant.createdBy
    });
    // Prefill weekOff if available on the plant object (accept multiple property shapes)
    const rawWeekOff = (plant as any).weekOff || (plant as any).weekoff || (plant as any).weekOffs || (plant as any).week_off || [];
    if (Array.isArray(rawWeekOff) && rawWeekOff.length > 0) {
      const names = rawWeekOff.map((item: any) => typeof item === 'string' ? item : (item?.weekOff || item?.weekoff || item?.name || ''));
      this.daysOfWeek.forEach((day, idx) => {
        const isOff = names.includes(day);
        this.weekOffArray.at(idx).setValue(isOff);
      });
    } else {
      this.weekOffArray.controls.forEach(ctrl => ctrl.setValue(false));
    }
    this.originalFormValue = this.plantForm.getRawValue();
  }

  createDaysCheckboxes(): any[] {
    return this.daysOfWeek.map(() => this.fb.control(false));
  }

  get weekOffArray(): FormArray {
    return this.plantForm.get('weekOff') as FormArray;
  }

  getWeekOffControl(index: number): FormControl {
    return this.weekOffArray.at(index) as FormControl;
  }

  getWeekOffLabel(item: any): string {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    if (typeof item.weekOff === 'string') return item.weekOff;
    if (typeof item.weekoff === 'string') return item.weekoff;
    if (typeof item.name === 'string') return item.name;

    // Try to find a string property or nested weekOff
    for (const key of Object.keys(item)) {
      const val = item[key];
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object') {
        if (typeof val.weekOff === 'string') return val.weekOff;
        if (typeof val.name === 'string') return val.name;
      }
    }

    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }

  loadActiveAgents(): void {
    if (!this.userOrgId) {
      this.activeAgents = [];
      return;
    }

    this.agentService.getActiveAgentList(this.userOrgId).subscribe({
      next: (response) => {
        this.activeAgents = this.normalizeAgentResponse(response);
      },
      error: (err) => {
        console.error('Failed to load active agents:', err);
        this.activeAgents = [];
      }
    });
  }

  normalizeAgentResponse(response: any): AgentSuggestion[] {
    const list = (response as any)?.attributes || response;
    const items = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];

    return items
      .map((item: any) => ({
        agentId: item?.agentId ?? item?.id ?? item?.agent?.agentId ?? null,
        agentName: item?.agentName ?? item?.name ?? item?.agent?.agentName ?? '',
        mailId: item?.mailId ?? item?.email ?? item?.agent?.mailId ?? '',
        accessId: item?.accessId ?? item?.agent?.accessId ?? ''
      }))
      .filter((agent: AgentSuggestion) => agent.agentId != null && agent.agentName.trim().length > 0) as AgentSuggestion[];
  }

  get mappingRows(): FormArray {
    return this.mappingForm.get('rows') as FormArray;
  }

  private createMappingRow(): FormGroup {
    return this.fb.group({
      mappingId: [null],
      plantQuery: [''],
      plantId: [null],
      plantName: [''],
      agentQuery: [''],
      agentId: [null],
      agentName: [''],
      skills: [[]],
      isExisting: [false],
      active: [true]
    });
  }

  addMappingRow(): void {
    this.mappingRows.push(this.createMappingRow());
    const rowIndex = this.mappingRows.length - 1;
    // For newly added rows ignore the mappingFilter so users can pick any plant
    this.mappingPlantSuggestions[rowIndex] = this.activePlants || [];
    this.mappingAgentSuggestions[rowIndex] = this.filterMappingAgents(this.getAvailableAgentsForMappingRow(rowIndex));
    this.agentSkillsByRow[rowIndex] = [];
    this.mappingRowVisibility[rowIndex] = true;
  }

  removeMappingRow(index: number): void {
    this.mappingRows.removeAt(index);
    delete this.mappingPlantSuggestions[index];
    delete this.mappingAgentSuggestions[index];
    delete this.agentSkillsByRow[index];
    this.mappingRowVisibility.splice(index, 1);
  }

  loadPlantAgentMappings(): void {
    this.mappingRows.clear();
    this.plantService.getPlantAgentMappings(this.userOrgId).subscribe({
      next: (result) => {
        const mappings = (result as any)?.attributes || result || [];
        if (Array.isArray(mappings) && mappings.length > 0) {
          mappings.forEach((mapping: AgentPlantMappingVO) => {
            const row = this.createMappingRow();
              // derive skill names from agent.agentSkillsMappings if available
              const skillNames = Array.isArray(mapping.agent?.agentSkillsMappings)
                ? mapping.agent!.agentSkillsMappings
                    .map((asm: any) => asm?.skill?.skillName)
                    .filter(Boolean)
                : [];

              row.patchValue({
                mappingId: mapping.mappingId,
                plantQuery: mapping.plant?.plantName || '',
                plantId: mapping.plant?.plantId || null,
                plantName: mapping.plant?.plantName || '',
                agentQuery: mapping.agent?.agentName || '',
                agentId: mapping.agent?.agentId || null,
                agentName: mapping.agent?.agentName || '',
                skills: skillNames,
                isExisting: true,
                active: mapping.active ?? true
              }, { emitEvent: false });

              this.mappingRows.push(row);
              const pushedIndex = this.mappingRows.length - 1;
              this.agentSkillsByRow[pushedIndex] = skillNames;
          });
        }
        if (this.mappingRows.length === 0) {
          this.addMappingRow();
        }
        this.updateMappingRowVisibility();
      },
      error: (err) => {
        console.error('Failed to load plant-agent mappings:', err);
        this.mappingRows.clear();
        this.addMappingRow();
        this.updateMappingRowVisibility();
      }
    });
  }

  private getAvailableAgentsForMappingRow(rowIndex: number): AgentSuggestion[] {
    return this.activeAgents;
  }

  onMappingPlantSearch(index: number): void {
    const row = this.mappingRows.at(index);
    const searchTerm = (row.get('plantQuery')?.value || '').trim();
    const isExisting = !!row.get('isExisting')?.value;

    if (!searchTerm) {
      // show all active plants for new rows (ignore mapping filter), otherwise respect mappingFilter
      this.mappingPlantSuggestions[index] = isExisting ? this.filterMappingPlants(this.activePlants) : (this.activePlants || []);
      return;
    }

    const lowerTerm = searchTerm.toLowerCase();
    const matchingPlants = this.activePlants.filter(plant => {
      const plantName = plant.plantName?.toLowerCase() || '';
      const regionName = plant.region?.countryName?.toLowerCase() || '';
      return plantName.includes(lowerTerm) || regionName.includes(lowerTerm);
    });

    // for existing rows, also apply mappingFilter; for new rows, show direct matches
    this.mappingPlantSuggestions[index] = isExisting ? this.filterMappingPlants(matchingPlants) : matchingPlants;
  }

  selectMappingPlant(index: number, plant: PlantMaster): void {
    const row = this.mappingRows.at(index);
    row.patchValue({
      plantId: plant.plantId,
      plantName: plant.plantName,
      plantQuery: plant.plantName
    }, { emitEvent: false });
    this.mappingPlantSuggestions[index] = [];
  }

  onMappingAgentSearch(index: number): void {
    const row = this.mappingRows.at(index);
    const searchTerm = (row.get('agentQuery')?.value || '').trim();
    const available = this.getAvailableAgentsForMappingRow(index);

    if (!searchTerm) {
      this.mappingAgentSuggestions[index] = this.filterMappingAgents(available);
      return;
    }

    const lowerTerm = searchTerm.toLowerCase();
    const matchingAgents = available.filter(agent => {
      const haystack = `${agent.agentName} ${agent.mailId || ''} ${agent.accessId || ''}`.toLowerCase();
      return haystack.includes(lowerTerm);
    });

    this.mappingAgentSuggestions[index] = this.filterMappingAgents(matchingAgents);
  }

  selectMappingAgent(index: number, agent: AgentSuggestion): void {
    const row = this.mappingRows.at(index);
    row.patchValue({
      agentId: agent.agentId,
      agentName: agent.agentName,
      agentQuery: agent.agentName
    }, { emitEvent: false });
    this.mappingAgentSuggestions[index] = [];
    this.agentSkillsByRow[index] = [];
    this.agentService.getAgentSkills(agent.agentId).subscribe({
      next: (skills) => {
        skills = (skills as any)?.attributes || '';
        const skillNames = Array.isArray(skills)
          ? skills.map(s => s.skill?.skillName || '').filter(Boolean)
          : [];
        row.patchValue({ skills: skillNames }, { emitEvent: false });
        this.agentSkillsByRow[index] = skillNames;
      },
      error: (err) => {
        console.error('Failed to load agent skills:', err);
        row.patchValue({ skills: [] }, { emitEvent: false });
        this.agentSkillsByRow[index] = [];
      }
    });
  }

  onMappingAgentEnter(index: number, event: Event): void {
    event.preventDefault();
    const row = this.mappingRows.at(index);
    const agentId = row.get('agentId')?.value;
    const agentQuery = (row.get('agentQuery')?.value || '').trim();

    if (!agentId && agentQuery) {
      const exactAgent = this.mappingAgentSuggestions[index].find(agent => agent.agentName.toLowerCase() === agentQuery.toLowerCase());
      if (exactAgent) {
        this.selectMappingAgent(index, exactAgent);
      }
    }

    const selectedPlantId = row.get('plantId')?.value;
    const selectedAgentId = row.get('agentId')?.value;

    if (selectedPlantId && selectedAgentId) {
      this.submitMapping();
      return;
    }

    this.mappingError = 'Please select both plant and agent before saving.';
  }

  submitMapping(): void {
    this.mappingError = '';
    this.mappingSuccess = '';
    this.isMappingSubmitting = true;

    const rowValues = this.mappingRows.controls.map(row => ({
      plantId: row.get('plantId')?.value,
      agentId: row.get('agentId')?.value
    }));

    if (rowValues.length === 0) {
      this.mappingError = 'Add at least one plant-to-agent mapping.';
      this.isMappingSubmitting = false;
      return;
    }

    const invalidIndex = rowValues.findIndex(row => !row.plantId || !row.agentId);
    if (invalidIndex >= 0) {
      this.mappingError = `Row ${invalidIndex + 1} needs both plant and agent selected.`;
      this.isMappingSubmitting = false;
      return;
    }

    const payload = {
      mappings: rowValues.map(row => ({
        plantId: Number(row.plantId),
        agentId: Number(row.agentId),
        companyId: Number(this.userOrgId),
        createdBy: Number(localStorage.getItem('userId') || 0),
        updatedBy: Number(localStorage.getItem('userId') || 0)
      }))
    };

    this.plantService.createPlantAgentMapping(payload).subscribe({
      next: () => {
        this.isMappingSubmitting = false;
        this.mappingSuccess = 'Plant-agent mapping saved successfully.';
        this.mappingError = '';
        setTimeout(() => { this.mappingSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.isMappingSubmitting = false;
        this.mappingError = err.error?.message || 'Failed to save mappings.';
        console.error('Mapping save error', err);
      }
    });
  }

  saveMappingRow(index: number): void {
    const row = this.mappingRows.at(index);
    const plantId = row.get('plantId')?.value;
    const agentId = row.get('agentId')?.value;

    if (!plantId || !agentId) {
      this.mappingError = 'Select both plant and agent before saving.';
      return;
    }

    this.mappingError = '';
    this.mappingSuccess = '';
    this.isMappingSubmitting = true;

    const payload = {
      plantId: Number(plantId),
      agentId: Number(agentId),
      companyId: Number(this.userOrgId),
      createdBy: Number(localStorage.getItem('userId') || 0),
      updatedBy: Number(localStorage.getItem('userId') || 0),
      isCreatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase(),
      isUpdatedByAdmin: localStorage.getItem('userRole')?.toLowerCase() === USER_ROLES.ADMIN.toLowerCase()
    };

    this.plantService.createPlantAgentMapping(payload).subscribe({
      next: () => {
        this.isMappingSubmitting = false;
        this.mappingSuccess = 'Plant-agent mapping saved successfully.';
        this.loadPlantAgentMappings();
        setTimeout(() => { this.mappingSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.isMappingSubmitting = false;
        this.mappingError = err.error?.message || 'Failed to save mapping.';
        console.error('Mapping row save error', err);
      }
    });
  }

  deleteMappingRow(index: number): void {
    const row = this.mappingRows.at(index);
    if (!row.get('isExisting')?.value) {
      this.removeMappingRow(index);
      return;
    }

    const mappingId = row.get('mappingId')?.value;

    if (!mappingId) {
      this.mappingError = 'Unable to delete mapping: missing mapping identifier.';
      return;
    }

    this.mappingError = '';
    this.mappingSuccess = '';
    this.isMappingSubmitting = true;

    this.plantService.deletePlantAgentMapping(Number(mappingId)).subscribe({
      next: () => {
        this.isMappingSubmitting = false;
        this.mappingSuccess = 'Plant-agent mapping deleted successfully.';
        this.removeMappingRow(index);
        setTimeout(() => { this.mappingSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.isMappingSubmitting = false;
        this.mappingError = err.error?.message || 'Failed to delete mapping.';
        console.error('Mapping row delete error', err);
      }
    });
  }

  getMappingQueryValue(index: number, field: string): string {
    const control = this.mappingRows.at(index).get(field);
    return typeof control?.value === 'string' ? control.value : '';
  }

  hasRowSkills(index: number): boolean {
    return Array.isArray(this.agentSkillsByRow[index]) && this.agentSkillsByRow[index].length > 0;
  }

  onDeletePlant(plant: PlantMaster): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Plant',
      message: `Are you sure you want to delete plant "${plant.plantName}"?`,
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
      this.plantService.deletePlant(plant.plantId).subscribe({
        next: () => {
          this.loadPlantList();
          this.submitSuccess = 'Plant deleted successfully.';
          setTimeout(() => {
            this.submitSuccess = '';
          }, 1500);
        },
        error: (err) => {
          console.error('Delete plant error', err);
          this.submitError = err.error?.message || 'Failed to delete plant.';
        }
      });
    });
  }

  // WeekOff popover controls
  setHoveredWeekOff(plantId: number | null): void {
    this.hoveredWeekOffPlantId = plantId ?? null;
  }

  clearHoveredWeekOff(): void {
    this.hoveredWeekOffPlantId = null;
  }

  toggleWeekOffPopover(plantId: number | null): void {
    if (this.openWeekOffPlantId === plantId) {
      this.openWeekOffPlantId = null;
      return;
    }
    this.openWeekOffPlantId = plantId;
  }

  isWeekOffPopoverVisible(plantId: number | null): boolean {
    return this.openWeekOffPlantId === plantId || this.hoveredWeekOffPlantId === plantId;
  }

  applyMappingFilter(): void {
    this.updateMappingRowVisibility();
  }

  private updateMappingRowVisibility(): void {
    const filter = (this.mappingFilter || '').trim().toLowerCase();
    const selectedPlantId = this.selectedMappingPlantId != null ? Number(this.selectedMappingPlantId) : null;

    this.mappingRowVisibility = this.mappingRows.controls.map(row => {
      const plantId = row.get('plantId')?.value;
      const plantName = (row.get('plantName')?.value || '').toLowerCase();
      const agentName = (row.get('agentName')?.value || '').toLowerCase();
      const matchesPlant = selectedPlantId == null || plantId === selectedPlantId;
      const matchesText = !filter || plantName.includes(filter) || agentName.includes(filter);
      return matchesPlant && matchesText;
    });
  }

  private filterMappingPlants(plants: PlantMaster[]): PlantMaster[] {
    const filter = (this.mappingFilter || '').trim().toLowerCase();
    if (!filter) {
      return plants;
    }

    return plants.filter(plant => {
      const plantName = plant.plantName?.toLowerCase() || '';
      const regionName = plant.region?.countryName?.toLowerCase() || '';
      return plantName.includes(filter) || regionName.includes(filter);
    });
  }

  private filterMappingAgents(agents: AgentSuggestion[]): AgentSuggestion[] {
    const filter = (this.mappingFilter || '').trim().toLowerCase();
    if (!filter) {
      return agents;
    }

    return agents.filter(agent => {
      const name = agent.agentName?.toLowerCase() || '';
      const email = agent.mailId?.toLowerCase() || '';
      const accessId = agent.accessId?.toLowerCase() || '';
      return name.includes(filter) || email.includes(filter) || accessId.includes(filter);
    });
  }

  getPaginatedPlants(): PlantMaster[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredPlants.slice(startIndex, endIndex);
  }

  filterBySearch(): void {
    const term = (this.searchValue || '').trim().toLowerCase();
    const selectedPlantId = this.selectedPlantId != null ? Number(this.selectedPlantId) : null;

    this.filteredPlants = this.plants.filter(plant => {
      const matchesPlant = selectedPlantId == null || plant.plantId === selectedPlantId;
      const matchesText = !term ||
        plant.plantName?.toLowerCase().includes(term) ||
        plant.calendar?.calendarCode?.toLowerCase().includes(term) ||
        plant.region?.countryName?.toLowerCase().includes(term);
      return matchesPlant && matchesText;
    });

    this.totalRecords = this.filteredPlants.length;
    this.currentPage = 0;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
