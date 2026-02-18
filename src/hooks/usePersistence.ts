import { useState, useEffect, useCallback } from 'react';
import { RNCRecord } from '../types';
import { rncService } from '../services/rncService';

const STORAGE_KEY = 'savedRNCs';

export function usePersistence() {
    const [data, setData] = useState<RNCRecord[]>(() => {
        // Hydrate from local storage on mount
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.map((item: any) => ({
                    ...item,
                    openDate: item.openDate ? new Date(item.openDate) : null,
                    closeDate: item.closeDate ? new Date(item.closeDate) : null,
                    deadline: item.deadline ? new Date(item.deadline) : null,
                }));
            } catch (e) {
                console.error("Failed to parse local cache", e);
                return [];
            }
        }
        return [];
    });
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Realtime Subscription
    useEffect(() => {
        setIsSyncing(true);

        const unsubscribe = rncService.subscribeRncsRealtime((newData) => {
            // Hydrate Strings to Dates
            const hydratedData = newData.map(item => ({
                ...item,
                openDate: item.openDate ? new Date(item.openDate) : null,
                closeDate: item.closeDate ? new Date(item.closeDate) : null,
                deadline: item.deadline ? new Date(item.deadline) : null,
            }));

            setData(hydratedData);
            setIsSyncing(false);
            setLastSync(new Date());

            // Optional: Update cache for offline viewing if needed, but not as primary source
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(hydratedData));
            } catch (e) {
                console.error("Failed to update local cache", e);
            }
        });

        return () => {
            unsubscribe();
        };
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
