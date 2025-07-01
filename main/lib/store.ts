import Store from 'electron-store';

interface StoreSchema {
  geminiApiKey?: string;
  monitorConfig?: {
    interval: number;
    enabled: boolean;
    changeThreshold: number;
  };
}

const store = new Store<StoreSchema>({
  // Define default values
  defaults: {
    geminiApiKey: '',
    monitorConfig: {
      interval: 5000,
      enabled: false,
      changeThreshold: 0.05,
    },
  },
});

export default store;