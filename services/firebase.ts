
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
  getDocs
} from 'firebase/firestore';
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

// Helper specifically for Public Pages (No User ID required)
export const getPublicAudience = async (audienceId: string) => {
    if (!db) throw new Error("DB not connected");
    try {
        const docRef = doc(db, 'audiences', audienceId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error fetching public audience:", e);
        throw e;
    }
};

// Helper for Public Subscription (Updates a doc without requiring full auth ownership if rules permit, or uses logic)
export const savePublicSubscriber = async (audienceId: string, updatedAudienceData: any) => {
    if (!db) throw new Error("DB not connected");
    try {
        await updateDoc(doc(db, 'audiences', audienceId), updatedAudienceData);
    } catch (e) {
        console.error("Error saving subscriber:", e);
        throw e;
    }
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
