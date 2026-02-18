import React, { createContext, useContext, ReactNode } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { RNCRecord } from '../types';

interface RncContextType {
    data: RNCRecord[];
    setData: React.Dispatch<React.SetStateAction<RNCRecord[]>>;
    saveData: (data: RNCRecord[]) => void;
    saveAllData: () => Promise<void>;
    clearData: () => Promise<void>;
    upsertToCloud: (records: RNCRecord[]) => Promise<void>;
    lastSync: Date | null;
    isSyncing: boolean;
}

const RncContext = createContext<RncContextType | undefined>(undefined);

export const RncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // We log here to audit Provider lifecycle
    React.useEffect(() => {
        console.log("[RNC_PROVIDER] mount");
        return () => console.log("[RNC_PROVIDER] unmount");
    }, []);

    const persistence = usePersistence();

    return (
        <RncContext.Provider value={persistence}>
            {children}
        </RncContext.Provider>
    );
};

export const useRnc = () => {
    const context = useContext(RncContext);
    if (context === undefined) {
        throw new Error('useRnc must be used within a RncProvider');
    }
    return context;
};
