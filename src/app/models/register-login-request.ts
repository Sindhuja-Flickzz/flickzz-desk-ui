export interface RegisterLoginRequest {
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  role?: string;
  mfaEnabled?: boolean;
}
