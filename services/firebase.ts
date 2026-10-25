
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  getDoc,
  updateDoc,
  getDocs,
  runTransaction,
  increment,
  deleteField,
  FieldPath
} from 'firebase/firestore';
import type { Subscriber } from '../types';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD4izHfHB8bDGEcSMccFokbm-vVL9xPbsU",
  authDomain: "bemail-1.firebaseapp.com",
  projectId: "bemail-1",
  storageBucket: "bemail-1.firebasestorage.app",
  messagingSenderId: "614698849832",
  appId: "1:614698849832:web:0a352fe55ad0874671c71d",
};
// ------------------------------

// Initialize Firebase
const isConfigured = !!firebaseConfig.apiKey;

let app;
let db: any;
let auth: any;

if (isConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully for project:", firebaseConfig.projectId);
    } catch (e) {
        console.error("Firebase initialization error:", e);
    }
} else {
    console.warn("⚠️ Firebase is not configured.");
}

// Export status for UI checks
export const isFirebaseEnabled = isConfigured && !!db;
export { auth };

// --- AUTHENTICATION SERVICES ---

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
};

export const loginUser = async (email: string, pass: string) => {
    if (!auth) throw new Error("Auth not configured");
    return signInWithEmailAndPassword(auth, email, pass);
};

export const registerUser = async (email: string, pass: string) => {
    if (!auth) throw new Error("Auth not configured");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Automatically create the user document in Firestore 'users' collection
    if (db && userCredential.user) {
        const user = userCredential.user;
        try {
            await setDoc(doc(db, "users", user.uid), {
                userId: user.uid, // Critical for security rules
                email: user.email,
                createdAt: new Date().toISOString(),
                displayName: user.displayName || '',
                photoURL: user.photoURL || ''
            });
        } catch (e) {
            console.error("Error creating user profile doc:", e);
        }
    }
    
    return userCredential;
};

export const logoutUser = async () => {
    if (!auth) throw new Error("Auth not configured");
    return signOut(auth);
};

export const resetUserPassword = async (email: string) => {
    if (!auth) throw new Error("Auth not configured");
    return sendPasswordResetEmail(auth, email);
};

// --- USER PROFILE SERVICES ---

// Checks if a user document exists, creates it if missing (For existing users or after Google Auth)
export const ensureUserProfile = async (user: User) => {
    if (!db) return;
    const userRef = doc(db, "users", user.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                userId: user.uid,
                email: user.email,
                createdAt: new Date().toISOString(),
                displayName: user.displayName || '',
                photoURL: user.photoURL || ''
            });
            console.log("Created missing user profile document.");
        }
    } catch (e) {
        console.error("Error ensuring user profile:", e);
    }
};

export const updateUserProfile = async (uid: string, data: { displayName?: string, photoURL?: string }) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, data);
};

export const subscribeToUserProfile = (uid: string, callback: (data: any) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, "users", uid), (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};


// --- DATA SERVICES ---

// New validation function to check actual Write Permissions
export const validateConnection = async (): Promise<{ ok: boolean; code?: string }> => {
    if (!db) return { ok: false, code: 'not-configured' };
    try {
        return { ok: true }; 
    } catch (e: any) {
        return { ok: false, code: e.code || 'unknown' };
    }
};

// Helper to subscribe to a collection (Real-time updates)
// UPDATED: Now accepts userId to filter data
export const subscribeToCollection = (collectionName: string, userId: string, callback: (data: any[]) => void) => {
  if (!db) return () => {}; // No-op if not configured
  if (!userId) return () => {}; 

  // Create a query against the collection where userId matches the logged in user
  const q = query(collection(db, collectionName), where("userId", "==", userId));
  
  return onSnapshot(q, (querySnapshot) => {
    const data: any[] = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });
    callback(data);
  }, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
  });
};

// --- PUBLIC SUBSCRIPTION FORMS ---
// Public visitors can only read the minimal form info in `publicForms/{audienceId}`
// (name + description + owner id) and can only CREATE one record in `subscriptions`.
// They can never read audiences or other subscribers (see firestore.rules).

export interface PublicForm {
    id: string;
    name: string;
    description: string;
    userId: string;
}

export const getPublicAudience = async (audienceId: string): Promise<PublicForm | null> => {
    if (!db) throw new Error("DB not connected");
    try {
        const docSnap = await getDoc(doc(db, 'publicForms', audienceId));
        return docSnap.exists() ? (docSnap.data() as PublicForm) : null;
    } catch (e) {
        console.error("Error fetching public form:", e);
        throw e;
    }
};

// Creates a pending subscription. The owner's app (or the server scheduler) merges it into the audience.
export const savePublicSubscriber = async (form: PublicForm, subscriber: Subscriber) => {
    if (!db) throw new Error("DB not connected");
    const subId = `${form.id}_${subscriber.id}`;
    try {
        await setDoc(doc(db, 'subscriptions', subId), {
            id: subId,
            audienceId: form.id,
            ownerId: form.userId,
            subscriberId: subscriber.id,
            email: subscriber.email.trim().toLowerCase(),
            firstName: subscriber.firstName.slice(0, 80),
            joinedAt: subscriber.joinedAt,
        });
    } catch (e) {
        console.error("Error saving subscriber:", e);
        throw e;
    }
};

// Public unsubscribe request (create-only). Applied by the owner app / scheduler after token check.
export const saveUnsubscribeRequest = async (form: PublicForm, subscriberId: string, token: string) => {
    if (!db) throw new Error("DB not connected");
    const id = `${form.id}_${subscriberId}`;
    await setDoc(doc(db, 'unsubscribes', id), {
        id,
        audienceId: form.id,
        ownerId: form.userId,
        subscriberId,
        token,
        createdAt: new Date().toISOString(),
    });
};

export interface UnsubscribeRequest {
    id: string;
    audienceId: string;
    ownerId: string;
    subscriberId: string;
    token: string;
    createdAt: string;
}

export const subscribeToUnsubscribeRequests = (userId: string, callback: (data: UnsubscribeRequest[]) => void) => {
    if (!db || !userId) return () => {};
    const q = query(collection(db, 'unsubscribes'), where('ownerId', '==', userId));
    return onSnapshot(q, (snap) => {
        const data: UnsubscribeRequest[] = [];
        snap.forEach((d) => data.push(d.data() as UnsubscribeRequest));
        callback(data);
    }, (error) => console.error("Error subscribing to unsubscribe requests:", error));
};

export const deleteUnsubscribeRequest = async (id: string) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'unsubscribes', id)); } catch (e) { console.error("Error deleting unsubscribe request:", e); }
};

// Keeps the public form doc in sync with an audience (owner only).
const syncPublicForm = async (audience: any, uid: string) => {
    if (!db || !audience?.id) return;
    await setDoc(doc(db, 'publicForms', audience.id), {
        id: audience.id,
        name: audience.name || '',
        description: audience.description || '',
        userId: uid,
    });
};

export const syncAllPublicForms = async (audiences: any[]) => {
    const user = auth?.currentUser;
    if (!db || !user) return;
    for (const a of audiences) {
        try { await syncPublicForm(a, user.uid); } catch (e) { console.error("Error syncing public form:", e); }
    }
};

export interface PendingSubscription {
    id: string;
    audienceId: string;
    ownerId: string;
    subscriberId: string;
    email: string;
    firstName: string;
    joinedAt: string;
}

export const subscribeToPendingSubscriptions = (userId: string, callback: (data: PendingSubscription[]) => void) => {
    if (!db || !userId) return () => {};
    const q = query(collection(db, 'subscriptions'), where('ownerId', '==', userId));
    return onSnapshot(q, (snap) => {
        const data: PendingSubscription[] = [];
        snap.forEach((d) => data.push(d.data() as PendingSubscription));
        callback(data);
    }, (error) => console.error("Error subscribing to pending subscriptions:", error));
};

export const deletePendingSubscription = async (id: string) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'subscriptions', id)); } catch (e) { console.error("Error deleting pending subscription:", e); }
};

// Helper to clean undefined values which Firebase rejects
const sanitizeData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

// Helper to save a document
// UPDATED: Ensures userId is attached
export const saveDocument = async (collectionName: string, data: any) => {
    if (!db) {
        alert("Firebase config missing! Check console.");
        return;
    }
    
    // Get current user to enforce ownership
    const user = auth?.currentUser;
    if (!user) {
        console.error("Cannot save: No user logged in");
        return;
    }

    try {
        const safeData = sanitizeData(data);
        
        // Force attach userId to every document for security filtering
        safeData.userId = user.uid;

        await setDoc(doc(db, collectionName, data.id), safeData);

        // Audiences have a public, minimal mirror used by the subscribe form.
        if (collectionName === 'audiences') {
            await syncPublicForm(safeData, user.uid);
        }
    } catch (e: any) {
        console.error(`Error saving to ${collectionName}:`, e);
        
        let msg = "Failed to save data to cloud.";
        if (e.code === 'permission-denied') {
            msg += "\n\n⛔ ERROR: Permission Denied.\nYou do not have access to modify this data.";
        } else {
             msg += `\n\nError Code: ${e.code || e.message}`;
        }
        
        alert(msg);
    }
};

// Helper to delete a document
export const deleteDocument = async (collectionName: string, id: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, collectionName, id));
        if (collectionName === 'audiences') {
            await deleteDoc(doc(db, 'publicForms', id));
        }
    } catch (e) {
        console.error(`Error deleting from ${collectionName}:`, e);
    }
};

// Helper specifically for Settings (Single Document)
// UPDATED: Stores settings per user ID
export const saveSettings = async (data: any) => {
    if (!db) return;
    const user = auth?.currentUser;
    if (!user) return;

    try {
        const safeData = sanitizeData(data);
        safeData.userId = user.uid;
        // Use the User ID as the document ID for settings so each user has one unique config
        await setDoc(doc(db, 'settings', user.uid), safeData);
    } catch (e) {
        console.error("Error saving settings:", e);
    }
};

export const subscribeToSettings = (callback: (data: any) => void) => {
    if (!db) return () => {};
    const user = auth?.currentUser;
    if (!user) return () => {};
    
    return onSnapshot(doc(db, 'settings', user.uid), (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};

// Populate database with sample data to initialize collections
export const seedDatabase = async () => {
    if (!db) throw new Error("Database not connected");
    const user = auth?.currentUser;
    if (!user) throw new Error("Must be logged in to seed data");

    try {
        console.log("Seeding database...");
        
        const sampleAudience = {
            id: `demo-aud-${Date.now()}`,
            name: 'Demo Audience List',
            description: 'A sample list to verify database connection',
            userId: user.uid,
            subscribers: [
                { id: 'demo-1', email: 'test@example.com', firstName: 'Test User', joinedAt: new Date().toISOString(), status: 'active' }
            ]
        };

        const sampleSequence = {
            id: `demo-seq-${Date.now()}`,
            name: 'Demo Sequence',
            createdAt: new Date().toISOString(),
            userId: user.uid,
            steps: [
                { id: 'step-1', orderIndex: 0, delayHours: 0, subject: 'Welcome to Email.AI!', contentType: 'text', content: 'Hello {{firstName}}, this is a test email to verify your database.' }
            ]
        };

        await setDoc(doc(db, 'audiences', sampleAudience.id), sampleAudience);
        await setDoc(doc(db, 'sequences', sampleSequence.id), sampleSequence);
        
        return true;
    } catch (e) {
        console.error("Error seeding database:", e);
        throw e;
    }
};


// --- SEND CLAIM (prevents duplicate emails between the browser app and the GitHub scheduler) ---
// Atomically moves one subscriber of a campaign from step `idx` to `idx + 1` on the LIVE document.
// Returns false when the live document no longer has them at `idx` (another sender already did it).
export const claimCampaignStep = async (campaignId: string, subId: string, idx: number, nowIso: string, totalSteps: number): Promise<boolean> => {
    if (!db) return false;
    const ref = doc(db, 'campaigns', campaignId);
    try {
        return await runTransaction(db, async (tx: any) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) return false;
            const c: any = snap.data();
            if (c.status === 'paused') return false;
            const live = (c.progress && c.progress.currentStepIndex && c.progress.currentStepIndex[subId]) || 0;
            if (live !== idx) return false;
            const args: any[] = [
                new FieldPath('progress', 'currentStepIndex', subId), idx + 1,
                new FieldPath('progress', 'lastActionAt', subId), nowIso,
                new FieldPath('stats', 'sent'), increment(1)
            ];
            if (idx + 1 >= totalSteps) args.push(new FieldPath('progress', 'completedSubscribers'), increment(1));
            tx.update(ref, ...(args as [any, any, ...any[]]));
            return true;
        });
    } catch (e) {
        console.error('claimCampaignStep failed', e);
        return false;
    }
};

// Undo a claim after a failed send (only if nobody moved the subscriber since).
export const releaseCampaignStep = async (campaignId: string, subId: string, idx: number, prevLastAction: string | null, totalSteps: number) => {
    if (!db) return;
    const ref = doc(db, 'campaigns', campaignId);
    try {
        await runTransaction(db, async (tx: any) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) return;
            const c: any = snap.data();
            const live = (c.progress && c.progress.currentStepIndex && c.progress.currentStepIndex[subId]) || 0;
            if (live !== idx + 1) return;
            const args: any[] = [
                new FieldPath('progress', 'currentStepIndex', subId), idx,
                new FieldPath('progress', 'lastActionAt', subId), prevLastAction === null ? deleteField() : prevLastAction,
                new FieldPath('stats', 'sent'), increment(-1)
            ];
            if (idx + 1 >= totalSteps) args.push(new FieldPath('progress', 'completedSubscribers'), increment(-1));
            tx.update(ref, ...(args as [any, any, ...any[]]));
        });
    } catch (e) {
        console.error('releaseCampaignStep failed', e);
    }
};
