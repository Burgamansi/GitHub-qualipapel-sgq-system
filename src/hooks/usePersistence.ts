import { useState, useEffect, useCallback } from 'react';
import { RNCRecord } from '../types';

const STORAGE_KEY = 'savedRNCs';

export function usePersistence() {
    const [data, setData] = useState<RNCRecord[]>([]);

    // Load data on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Fix dates
                    const fixed = parsed.map((item: any) => ({
                        ...item,
                        openDate: item.openDate ? new Date(item.openDate) : null,
                        closeDate: item.closeDate ? new Date(item.closeDate) : null,
                        deadline: item.deadline ? new Date(item.deadline) : null
                    }));
                    setData(fixed);
                }
            } catch (error) {
                console.error("Error loading savedRNCs", error);
            }
        }
    }, []);

    const saveData = useCallback((currentData: RNCRecord[]) => {
        if (currentData.length === 0) return;
        try {
            const serialized = JSON.stringify(currentData);
            localStorage.setItem(STORAGE_KEY, serialized);
            console.log('Data saved to localStorage');
        } catch (err) {
            console.error('Error saving data:', err);
        }
    }, []);

    const clearData = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setData([]);
        console.log('Data cleared from localStorage');
    }, []);

    return {
        data,
        setData,
        saveData,
        clearData
    };
}
