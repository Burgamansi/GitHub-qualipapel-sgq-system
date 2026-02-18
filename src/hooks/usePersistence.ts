import { useState, useEffect, useCallback, useRef } from 'react';
import { RNCRecord } from '../types';
import { rncService } from '../services/rncService';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'savedRNCs';

export function usePersistence() {
    // Initialize state from local storage to ensure immediate data availability
    const [data, setData] = useState<RNCRecord[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const hydrated = parsed.map((item: any) => ({
                    ...item,
                    openDate: item.openDate ? new Date(item.openDate) : null,
                    closeDate: item.closeDate ? new Date(item.closeDate) : null,
                    deadline: item.deadline ? new Date(item.deadline) : null,
                }));
                console.log(`[PERSISTENCE] Loaded ${hydrated.length} records from cache.`);
                return hydrated;
            } catch (e) {
                console.error("Failed to parse local cache", e);
                return [];
            }
        }
        return [];
    });

    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Ref to track current data length for comparison in callbacks
    const dataLengthRef = useRef(data.length);
    useEffect(() => { dataLengthRef.current = data.length; }, [data]);

    // Realtime Subscription
    useEffect(() => {
        console.log("[PERSISTENCE] Starting realtime subscription...");
        setIsSyncing(true);

        const unsubscribe = rncService.subscribeRncsRealtime((newData) => {
            console.log(`[FIRESTORE] Snapshot received. Size: ${newData.length}`);
            if (newData.length > 0) {
                console.log("[FIRESTORE] IDS Sample:", newData.slice(0, 5).map(d => d.id || d.number));
            }

            // SAFETY CHECK: Fallback if Firestore returns 0 but we have local data
            // This prevents "flashing" or wiping data due to temporary connection glitches/empty snapshots
            if (newData.length === 0 && dataLengthRef.current > 0) {
                console.warn("[PERSISTENCE] Firestore returned 0 records but local cache has data. Ignoring update to prevent data loss.");
                toast("Sem retorno do Firestore — exibindo cache (somente leitura)", {
                    icon: '⚠️',
                    duration: 5000
                });
                setIsSyncing(false);
                return;
            }

            // Hydrate Strings to Dates (Double check just in case, though service does it)
            const hydratedData = newData.map(item => ({
                ...item,
                openDate: item.openDate ? new Date(item.openDate) : null,
                closeDate: item.closeDate ? new Date(item.closeDate) : null,
                deadline: item.deadline ? new Date(item.deadline) : null,
            }));

            setData(hydratedData);
            setIsSyncing(false);
            setLastSync(new Date());

            // Update local storage cache
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(hydratedData));
            } catch (e) {
                console.error("Failed to update local cache", e);
            }
        });

        return () => {
            console.log("[PERSISTENCE] Unsubscribing realtime listener.");
            unsubscribe();
        };
    }, []); // Empty dependency array ensures this runs ONCE on mount

    const saveData = useCallback((currentData: RNCRecord[]) => {
        if (currentData.length === 0) return;
        try {
            const serialized = JSON.stringify(currentData);
            localStorage.setItem(STORAGE_KEY, serialized);
        } catch (err) {
            console.error('Error saving data:', err);
        }
    }, []);

    const saveAllData = useCallback(async () => {
        saveData(data);
        try {
            setIsSyncing(true);
            await rncService.upsertMany(data);
            setLastSync(new Date());
            console.log("Manual cloud save completed.");
        } catch (err) {
            console.error("Manual cloud save failed:", err);
            toast.error("Erro ao salvar na nuvem");
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

