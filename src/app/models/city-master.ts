export interface CityMaster {
  cityId: number;
  cityName: string;
  cityCode: string;
  state: any; // StateMasterVO - can be defined if needed
  country: any; // CountryMasterVO - can be defined if needed
  timezone: string;
}

export interface LanguageMaster {
  languageId: number;
  languageName: string;
  languageCode: string;
}