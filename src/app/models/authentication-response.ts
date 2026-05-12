export interface FlickzzDeskResponse {
  code: string;
  title: string;
  description: string;
  attributes: CommonObject;
}

export interface CommonObject {
  accessToken: string;
  mfaEnabled: boolean;
  userOrgId: Number;
  userOrgName: string;
  refreshToken: string;
  secretImageUri: string;
  userRole: string;
  enquiryUser?: boolean;
}