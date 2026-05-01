export interface RegisterLoginRequest {
  firstname?: string;
  lastname?: string;
  email?: string;
  registerId?: string;
  password?: string;
  role?: string;
  mfaEnabled?: boolean;
  createdBy?: string;
  oldPassword?: string;
  phone?: string;
  countryId?: number;
  cityId?: number;
  languageId?: number;
}
