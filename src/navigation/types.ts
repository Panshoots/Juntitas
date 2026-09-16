import { Dog } from '../models/Dog';

export type RootStackParamList = {
  HomeTabs: undefined;
  DogPassport: { dog?: Dog };
  CreateCommunity: undefined;
  CreateEvent: undefined;
  SuperAdminPanel: undefined;
  BusinessPortal: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Communities: undefined;
  Events: undefined;
  Rewards: undefined;
  AdminOrStore: undefined;
  Profile: undefined;
};
