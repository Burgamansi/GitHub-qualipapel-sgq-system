
import {
    collection,
    getDocs,
    doc,
    writeBatch,
    Timestamp,
    setDoc,
    deleteDoc,
    query,
    limit,
    onSnapshot,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { RNCRecord } from '../types';

const COLLECTION_NAME = 'qpl_rncs';

// Converter to handle Date <-> Timestamp
const rncConverter = {
    toFirestore: (rnc: RNCRecord) => {
        return {
            ...rnc,
            openDate: rnc.openDate ? Timestamp.fromDate(rnc.openDate) : null,
            closeDate: rnc.closeDate ? Timestamp.fromDate(rnc.closeDate) : null,
            deadline: rnc.deadline ? Timestamp.fromDate(rnc.deadline) : null,
        };
    },
    fromFirestore: (snapshot: any, options: any) => {
        const data = snapshot.data(options);
        return {
            ...data,
            openDate: data.openDate?.toDate() || null,
            closeDate: data.closeDate?.toDate() || null,
            deadline: data.deadline?.toDate() || null,
            // Ensure days is number or null
            days: typeof data.days === 'number' ? data.days : null
        } as RNCRecord;
    }
};

export const rncService = {
    /**
     * Fetch all RNC records from Firestore
     */
    /**
     * Subscribe to RNC updates in realtime
     */
    subscribeRncsRealtime(onData: (data: RNCRecord[]) => void): () => void {
        const colRef = collection(db, COLLECTION_NAME).withConverter(rncConverter);
        // Ordering by updatedAt desc to show newest first
        const q = query(colRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            onData(data);
        }, (error) => {
            console.error("Error receiving realtime RNC updates:", error);
        });

        return unsubscribe;
    },

    /**
     * Upsert multiple RNC records (Batch write)
     * Firestore batches are limited to 500 ops. We handle splitting here.
     */
    /**
     * Upsert a single RNC record
     * Document ID is STRICTLY the RNC Number
     */
    async upsertRnc(rnc: RNCRecord): Promise<void> {
        const numero = String(rnc.number).trim();
        if (!numero || numero === "S/N") throw new Error("RNC sem número");

        const docRef = doc(db, COLLECTION_NAME, numero).withConverter(rncConverter);

        await setDoc(docRef, {
            ...rnc,
            number: numero, // Ensure consistency
            updatedAt: serverTimestamp(),
            // Preserve createdAt if exists in the record (from excel if applicable?), else ServerTimestamp
            // Note: rncConverter handles the Date objects, but serverTimestamp is a FieldValue.
            // If we are passing RNCRecord, it has Dates.
            // We'll let the converter handle Date fields, but for metadata:
            createdAt: rnc.openDate ? Timestamp.fromDate(rnc.openDate) : serverTimestamp()
        }, { merge: true });
    },

    /**
     * Upsert multiple RNC records (Batch write)
     * Limit 500 writes per batch.
     */
    async upsertMany(records: RNCRecord[]): Promise<void> {
        if (records.length === 0) return;

        // 1. Log Numbers (Mandatory)
        const validRecords = records.filter(r => r.number && String(r.number).trim() !== "" && String(r.number).trim() !== "S/N");
        console.log("NUMEROS EXTRAIDOS:", validRecords.map(r => String(r.number).trim()));

        if (validRecords.length === 0) return;

        try {
            const batchSize = 450;
            const chunks = [];

            for (let i = 0; i < validRecords.length; i += batchSize) {
                chunks.push(validRecords.slice(i, i + batchSize));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(record => {
                    const numero = String(record.number).trim();
                    const docRef = doc(db, COLLECTION_NAME, numero).withConverter(rncConverter);

                    // We constructed the record object. 
                    // To support serverTimestamp for createdAt/updatedAt properly with the converter:
                    // The converter expects RNCRecord. 
                    // We can just pass the record, but we want to force ID usage.
                    // And we want to ensure timestamps.

                    // Since we are using withConverter, 'record' must match RNCRecord structure or close to it.
                    // The converter toFirestore handles openDate/closeDate/deadline.
                    // But we want to inject 'createdAt' metadata if possible, but RNCRecord type doesn't have it?
                    // Checking type... RNCRecord in types.ts doesn't have createdAt/updatedAt.
                    // We should just save the record data. 
                    // Firestore will merge. 

                    batch.set(docRef, {
                        ...record,
                        number: numero,
                        updatedAt: serverTimestamp(),
                        createdAt: record.openDate ? Timestamp.fromDate(record.openDate) : serverTimestamp()
                    }, { merge: true });
                });
                await batch.commit();
            }
            console.log(`Synced ${validRecords.length} records to Firestore.`);
        } catch (error) {
            console.error('Error upserting RNCs to Firestore:', error);
            throw error;
        }
    },

    /**
     * Delete All RNCs (Batch delete)
     * CAUTION: Destructive operation
     */
    async deleteAll(): Promise<void> {
        try {
            const batchSize = 450;
            const colRef = collection(db, COLLECTION_NAME);

            // Loop until no documents left
            while (true) {
                const q = query(colRef, limit(batchSize));
                const snapshot = await getDocs(q);

                if (snapshot.size === 0) break;

                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                console.log(`Deleted batch of ${snapshot.size} records.`);
            }
            console.log('All RNCs deleted from Firestore.');
        } catch (error) {
            console.error('Error deleting all RNCs:', error);
            throw error;
        }
    }
};
