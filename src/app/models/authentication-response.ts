export interface FlickzzDeskSuccessResponse {
  code: string;
  title: string;
  description: string;
}

export interface CommonObject {
  accessToken: string;
  mfaEnabled: boolean;
  refreshToken: string;
  secretImageUri: string;
}

export interface CommonResponse {
  successCode: string;
  response: FlickzzDeskSuccessResponse;
  object: CommonObject;
}
