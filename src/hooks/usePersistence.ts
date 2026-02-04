import { useState, useEffect, useCallback } from 'react';
import { RNCRecord } from '../types';
import { rncService } from '../services/rncService';

const STORAGE_KEY = 'savedRNCs';

export function usePersistence() {
    const [data, setData] = useState<RNCRecord[]>([]);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Initial Load & Sync
    useEffect(() => {
        const load = async () => {
            // 1. Load from LocalStorage (Cache) - Fast Paint
            const saved = localStorage.getItem(STORAGE_KEY);
            let localData: RNCRecord[] = [];

            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        localData = parsed.map((item: any) => ({
                            ...item,
                            openDate: item.openDate ? new Date(item.openDate) : null,
                            closeDate: item.closeDate ? new Date(item.closeDate) : null,
                            deadline: item.deadline ? new Date(item.deadline) : null
                        }));
                        setData(localData);
                    }
                } catch (error) {
                    console.error("Error loading savedRNCs", error);
                }
            }

            // 2. Load from Firestore (Source of Truth)
            try {
                setIsSyncing(true);
                const cloudData = await rncService.fetchAll();

                if (cloudData.length > 0) {
                    // Cloud overrides local as per requirements
                    setData(cloudData);
                    setLastSync(new Date());

                    // Update cache
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
                    console.log(`Hydrated ${cloudData.length} records from Firestore.`);
                }
            } catch (error) {
                console.error("Failed to sync with Firestore:", error);
                // Keep showing localData if cloud fails
            } finally {
                setIsSyncing(false);
            }
        };

        load();
    }, []);

    const saveData = useCallback((currentData: RNCRecord[]) => {
        if (currentData.length === 0) return;
        try {
            const serialized = JSON.stringify(currentData);
            localStorage.setItem(STORAGE_KEY, serialized);
            // We don't auto-save to cloud here to avoid excessive writes.
            // Cloud sync is triggered explicitly on import/update.
        } catch (err) {
            console.error('Error saving data:', err);
        }
    }, []);

    const saveAllData = useCallback(async () => {
        // Save to cache
        saveData(data);

        // Save to cloud
        try {
            setIsSyncing(true);
            await rncService.upsertMany(data);
            setLastSync(new Date());
            console.log("Manual cloud save completed.");
        } catch (err) {
            console.error("Manual cloud save failed:", err);
            // We don't throw, just log, so UI doesn't crash
        } finally {
            setIsSyncing(false);
        }
    }, [data, saveData]);

    const clearData = useCallback(async () => {
        // Clear local
        localStorage.removeItem(STORAGE_KEY);
        setData([]);

        // Clear cloud
        try {
            setIsSyncing(true);
            await rncService.deleteAll();
            console.log('Cloud data cleared.');
        } catch (err) {
            console.error('Error clearing cloud data:', err);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    // Explicit Cloud Sync
    const upsertToCloud = useCallback(async (records: RNCRecord[]) => {
        try {
            setIsSyncing(true);
            await rncService.upsertMany(records);
            setLastSync(new Date());
        } catch (error) {
            console.error("Cloud upsert failed:", error);
            throw error;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    return {
        data,
        setData,
        saveData,
        saveAllData,
        clearData,
        upsertToCloud,
        lastSync,
        isSyncing
    };
}
