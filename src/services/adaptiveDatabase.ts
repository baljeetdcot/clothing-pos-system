import { InventoryItem, Sale, SaleItem, User, Settings, CustomerOffer } from '../types';
import { databaseService } from './database';
import { networkDatabaseService } from './networkDatabase';

// Detect if we're running in Electron or web browser
const isElectron = () => {
  return !!(window as any).electronAPI;
};

// Use the appropriate database service based on environment
const getDatabaseService = () => {
  if (isElectron()) {
    console.log('Using Electron database service');
    return databaseService;
  } else {
    console.log('Using network database service');
    return networkDatabaseService;
  }
};

// Create a proxy that forwards all calls to the appropriate service
const adaptiveDatabaseService = new Proxy({} as any, {
  get(target, prop) {
    const service = getDatabaseService();
    const method = service[prop as keyof typeof service];
    
    if (typeof method === 'function') {
      return method.bind(service);
    }
    
    return method;
  }
});

export { adaptiveDatabaseService as databaseService };
