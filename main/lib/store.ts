import Store from 'electron-store';

interface StoreSchema {
  geminiApiKey?: string;
  monitorConfig?: {
    interval: number;
    enabled: boolean;
    changeThreshold: number;
  };
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  userSettings?: {
    language: string;
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    autoStart: boolean;
  };
  aiSettings?: {
    model: string;
    temperature: number;
    maxTokens: number;
    enableMemory: boolean;
    enableLearning: boolean;
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
    userSettings: {
      language: 'ja',
      theme: 'system',
      notifications: true,
      autoStart: false,
    },
    aiSettings: {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 1000,
      enableMemory: true,
      enableLearning: true,
    },
  },
});

export default store;