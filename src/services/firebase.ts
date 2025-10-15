// Firebase integration service for cloud sync
// This is an optional feature that can be enabled later

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { InventoryItem, Sale, Settings } from '../types';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

class FirebaseService {
  private app: any;
  private db: any;
  private isInitialized = false;

  constructor() {
    // Only initialize if Firebase config is provided
    if (firebaseConfig.apiKey !== "your-api-key") {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
    }
  }

  async syncInventoryToCloud(inventoryItems: InventoryItem[]): Promise<void> {
    if (!this.isInitialized) {
      console.log('Firebase not configured, skipping cloud sync');
      return;
    }

    try {
      const batch = [];
      for (const item of inventoryItems) {
        const docRef = doc(this.db, 'inventory', item.id.toString());
        batch.push(setDoc(docRef, {
          ...item,
          lastSynced: new Date().toISOString()
        }));
      }
      await Promise.all(batch);
      console.log('Inventory synced to cloud');
    } catch (error) {
      console.error('Error syncing inventory to cloud:', error);
    }
  }

  async syncSalesToCloud(sales: Sale[]): Promise<void> {
    if (!this.isInitialized) {
      console.log('Firebase not configured, skipping cloud sync');
      return;
    }

    try {
      const batch = [];
      for (const sale of sales) {
        const docRef = doc(this.db, 'sales', sale.sale_id);
        batch.push(setDoc(docRef, {
          ...sale,
          lastSynced: new Date().toISOString()
        }));
      }
      await Promise.all(batch);
      console.log('Sales synced to cloud');
    } catch (error) {
      console.error('Error syncing sales to cloud:', error);
    }
  }

  async syncSettingsToCloud(settings: Settings): Promise<void> {
    if (!this.isInitialized) {
      console.log('Firebase not configured, skipping cloud sync');
      return;
    }

    try {
      const docRef = doc(this.db, 'settings', 'store');
      await setDoc(docRef, {
        ...settings,
        lastSynced: new Date().toISOString()
      });
      console.log('Settings synced to cloud');
    } catch (error) {
      console.error('Error syncing settings to cloud:', error);
    }
  }

  async getCloudInventory(): Promise<InventoryItem[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const querySnapshot = await getDocs(collection(this.db, 'inventory'));
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: parseInt(doc.id)
      })) as InventoryItem[];
    } catch (error) {
      console.error('Error fetching cloud inventory:', error);
      return [];
    }
  }

  async getCloudSales(startDate: string, endDate: string): Promise<Sale[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const q = query(
        collection(this.db, 'sales'),
        where('created_at', '>=', startDate),
        where('created_at', '<=', endDate),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: parseInt(doc.id)
      })) as Sale[];
    } catch (error) {
      console.error('Error fetching cloud sales:', error);
      return [];
    }
  }

  async getCloudSettings(): Promise<Settings | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const docRef = doc(this.db, 'settings', 'store');
      const docSnap = await getDocs(collection(this.db, 'settings'));
      if (docSnap.docs.length > 0) {
        return docSnap.docs[0].data() as Settings;
      }
      return null;
    } catch (error) {
      console.error('Error fetching cloud settings:', error);
      return null;
    }
  }

  isCloudSyncEnabled(): boolean {
    return this.isInitialized;
  }
}

export const firebaseService = new FirebaseService();
