import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONSTANTS } from '../data/app_constants';
import { CountryMasterVO, PlantMaster, PlantMasterRequest } from '../models/plant-master';
import { CalendarMasterVO } from '../models/calendar-master';
import { FlickzzDeskResponse } from '../models/authentication-response';

@Injectable({
  providedIn: 'root'
})
export class PlantService {
  private baseUrl = APP_CONSTANTS.API_BASE_URL;

  constructor(private http: HttpClient) { }

  getAllCountries(): Observable<CountryMasterVO[]> {
    return this.http.get<CountryMasterVO[]>(`${this.baseUrl}/country/list`);
  }

  getAllCalendars(userOrgId: string): Observable<CalendarMasterVO[]> {
    return this.http.get<CalendarMasterVO[]>(`${this.baseUrl}/calendar/list/${userOrgId}`);
  }

  getAllPlants(userOrgId: string): Observable<PlantMaster[]> {
    return this.http.get<PlantMaster[]>(`${this.baseUrl}/plant/list/${userOrgId}`);
  }

  createPlant(request: PlantMasterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/plant/create`, request);
  }

  updatePlant(request: PlantMasterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/plant/update`, request);
  }

  deletePlant(plantId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/plant/delete/${plantId}`);
  }
}
