
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
    orderBy
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
    async upsertMany(records: RNCRecord[]): Promise<void> {
        if (records.length === 0) return;

        try {
            const batchSize = 450; // Safe margin below 500
            const chunks = [];

            for (let i = 0; i < records.length; i += batchSize) {
                chunks.push(records.slice(i, i + batchSize));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(record => {
                    // Doc ID must be rnc.id
                    const docRef = doc(db, COLLECTION_NAME, record.id).withConverter(rncConverter);
                    batch.set(docRef, record, { merge: true });
                });
                await batch.commit();
            }
            console.log(`Synced ${records.length} records to Firestore.`);
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
