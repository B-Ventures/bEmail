
import React, { useState, useCallback, useEffect } from 'react';
import { User } from 'firebase/auth';
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import WelcomeScreen from './components/WelcomeScreen';
import FileUploadScreen from './components/FileUploadScreen';
import Loader from './components/Loader';
import ProgressTracker from './components/ProgressTracker';
import EmailCarousel from './components/EmailCarousel';
import Dashboard from './components/Dashboard';
import SequenceBuilder from './components/SequenceBuilder';
import CampaignManager from './components/CampaignManager';
import AudienceManager from './components/AudienceManager';
import SettingsScreen from './components/SettingsScreen';
import AssetLibrary from './components/AssetLibrary';
import PublicSubscriptionPage from './components/PublicSubscriptionPage';
import CampaignScheduler from './components/CampaignScheduler'; // Restored
import { Email, EmailTask, Campaign, Audience, SmtpConfig, Sequence, Asset, Subscriber } from './types';
import { generateStyledEmail, processDocument } from './services/geminiService';
import { 
    subscribeToCollection, 
    saveDocument, 
    deleteDocument, 
    saveSettings, 
    subscribeToSettings,
    isFirebaseEnabled,
    validateConnection,
    subscribeToAuthChanges,
    logoutUser,
    ensureUserProfile
} from './services/firebase';

type AppState = 'welcome' | 'upload' | 'processing' | 'results' | 'error';
type View = 'dashboard' | 'generator' | 'assets' | 'sequences' | 'campaigns' | 'audiences' | 'settings' | 'public_subscribe';
type DbStatus = 'loading' | 'ok' | 'permission-denied' | 'error' | 'disconnected';

const App: React.FC = () => {
    // --- Auth State ---
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // --- Navigation State ---
    const [currentView, setCurrentView] = useState<View>('dashboard');

    // --- Generator State ---
    const [appState, setAppState] = useState<AppState>('welcome');
    const [emails, setEmails] = useState<Email[]>([]);
    const [tasks, setTasks] = useState<EmailTask[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [courseTitle, setCourseTitle] = useState<string>('');

    // --- Persistence State (Firebase) ---
    const [assets, setAssets] = useState<Asset[]>([]);
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
        method: 'simulation',
        webhookUrl: '',
        host: '', port: '', username: '', password: '', fromName: '', fromEmail: '', isConfigured: false
    });
    
    // Database Connection Status
    const [dbStatus, setDbStatus] = useState<DbStatus>('loading');

    // --- Initialization & Routing ---

    useEffect(() => {
        // 1. Public Route Check
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'subscribe' && params.get('listId')) {
            setCurrentView('public_subscribe');
            setAuthLoading(false); // Skip auth loading for public page
            return;
        }

        // 2. Auth Listener
        const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
            if (currentUser) {
                // Ensure the user has a profile document in the database
                await ensureUserProfile(currentUser);
            }
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Firebase Subscriptions (User Scoped) ---
    useEffect(() => {
        // Only subscribe if we have a logged-in user and NOT in public mode
        if (!user || currentView === 'public_subscribe') {
            setDbStatus('disconnected');
            return; 
        }

        // 1. Check Connection
        if (isFirebaseEnabled) {
            validateConnection().then(result => {
                if (result.ok) {
                    setDbStatus('ok');
                } else if (result.code === 'permission-denied') {
                    setDbStatus('permission-denied');
                } else {
                    setDbStatus('error');
                }
            });
        }

        // 2. Subscribe to User Data
        const unsubAssets = subscribeToCollection('assets', user.uid, (data) => setAssets(data as Asset[]));
        const unsubSequences = subscribeToCollection('sequences', user.uid, (data) => setSequences(data as Sequence[]));
        const unsubCampaigns = subscribeToCollection('campaigns', user.uid, (data) => setCampaigns(data as Campaign[]));
        const unsubAudiences = subscribeToCollection('audiences', user.uid, (data) => setAudiences(data as Audience[]));
        
        const unsubSettings = subscribeToSettings((data) => {
            if (data) setSmtpConfig(data as SmtpConfig);
        });

        return () => {
            unsubAssets();
            unsubSequences();
            unsubCampaigns();
            unsubAudiences();
            unsubSettings();
        };
    }, [user, currentView]);


    // --- Generator Handlers ---
    const handleStartGeneration = () => {
        setAppState('upload');
    };

    const handleFileSubmit = useCallback(async (file: File, artworkUrl: string) => {
        setAppState('processing');
        setError(null);
        try {
            // 1. Analyze structure (PDF/DOCX/TXT -> JSON)
            const { title, contentChunks } = await processDocument(file);
            
            setCourseTitle(title || "My Email Course");
            if (!contentChunks || contentChunks.length === 0) throw new Error("Could not find any content sections in the document.");

            // 2. Setup Tasks
            const initialTasks: EmailTask[] = contentChunks.map((_, index) => ({
                id: index, day: index + 1, title: `Generating Email ${index + 1} of ${contentChunks.length}`, status: 'pending',
            }));
            setTasks(initialTasks);
            
            // 3. Generate Emails
            const generatedEmails: Email[] = [];
            for (let i = 0; i < contentChunks.length; i++) {
                setTasks(prevTasks => prevTasks.map(task => task.id === i ? { ...task, status: 'processing' } : task));
                try {
                    const emailData = await generateStyledEmail(contentChunks[i], i + 1, title, artworkUrl);
                    generatedEmails.push({ day: i + 1, subject: emailData.subject, htmlBody: emailData.htmlBody, parsedData: emailData.parsedData });
                    setTasks(prevTasks => prevTasks.map(task => task.id === i ? { ...task, status: 'done' } : task));
                } catch (e: any) {
                    setTasks(prevTasks => prevTasks.map(task => task.id === i ? { ...task, status: 'error' } : task));
                    throw e;
                }
            }
            setEmails(generatedEmails);
            setAppState('results');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An unknown error occurred during generation.');
            setAppState('error');
        }
    }, []);

    const handleReset = () => {
        setAppState('welcome');
        setEmails([]);
        setTasks([]);
        setError(null);
        setCourseTitle('');
    };

    // --- Feature Handlers (Using Firebase) ---

    const saveAsset = (title: string) => {
        const newAsset: Asset = {
            id: Date.now().toString(),
            title: title || courseTitle,
            createdAt: new Date().toISOString(),
            emails: emails
        };
        saveDocument('assets', newAsset);
        alert('Content saved to Assets Library! You can now use it in the Sequences tab.');
    };

    const updateAsset = (asset: Asset) => {
        saveDocument('assets', asset);
    };

    const deleteAsset = (id: string) => {
        deleteDocument('assets', id);
    };

    const saveSequence = (seq: Sequence) => {
        saveDocument('sequences', seq);
    };

    const deleteSequence = (id: string) => {
        if(confirm('Delete this sequence?')) deleteDocument('sequences', id);
    };

    const saveCampaign = useCallback((cmp: Campaign) => {
        saveDocument('campaigns', cmp);
    }, []);

    const deleteCampaign = (id: string) => {
        if(confirm('Delete this campaign?')) deleteDocument('campaigns', id);
    };

    const addAudience = (name: string, description: string) => {
        const newAudience: Audience = { id: Date.now().toString(), name, description, subscribers: [] };
        saveDocument('audiences', newAudience);
    };

    const updateAudience = (updated: Audience) => {
        saveDocument('audiences', updated);
    };

    const deleteAudience = (id: string) => {
        if(confirm('Delete this audience?')) deleteDocument('audiences', id);
    };

    const handleSaveSettings = (config: SmtpConfig) => {
        saveSettings(config);
        setSmtpConfig(config);
    };
    
    const handleSignOut = async () => {
        await logoutUser();
        setUser(null);
    }

    // --- Render Logic ---

    if (authLoading) {
        return <div className="h-screen w-full bg-brand-dark flex items-center justify-center text-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;
    }

    // 1. Public View (No Auth Required)
    if (currentView === 'public_subscribe') {
        return <PublicSubscriptionPage />;
    }

    // 2. Auth View (If not logged in)
    if (!user) {
        return <AuthScreen />;
    }

    // 3. Main Application Content
    const renderGeneratorContent = () => {
        switch (appState) {
            case 'welcome': return <WelcomeScreen onGenerate={handleStartGeneration} onViewLibrary={() => setCurrentView('assets')} />;
            case 'upload': return <FileUploadScreen onSubmit={handleFileSubmit} onBack={handleReset} />;
            case 'processing': return <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 mt-12"><Loader /><ProgressTracker tasks={tasks} /></div>;
            case 'results': return <EmailCarousel emails={emails} courseTitle={courseTitle} onReset={handleReset} onSaveAsset={saveAsset} />;
            case 'error': return <div className="text-center p-8 bg-brand-medium rounded-xl border border-red-500/50 max-w-2xl mx-auto mt-12"><h2 className="text-3xl text-white">Generation Failed</h2><p className="text-white mb-4">{error}</p><button onClick={handleReset} className="px-8 py-3 bg-brand-red text-white rounded-lg">Try Again</button></div>;
            default: return null;
        }
    };
    
    return (
        <div className="flex h-screen overflow-hidden bg-brand-dark text-brand-text">
            
            {/* Background Worker */}
            <CampaignScheduler 
                campaigns={campaigns}
                audiences={audiences}
                sequences={sequences}
                assets={assets}
                smtpConfig={smtpConfig}
                onUpdateCampaign={saveCampaign}
            />

            {/* Navigation (Sidebar) */}
            <Header 
                currentView={currentView} 
                onNavigate={setCurrentView} 
                userEmail={user.email || 'User'} 
                onSignOut={handleSignOut}
            />

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-y-auto h-full p-4 md:p-8 lg:p-10">
                <div className="w-full mx-auto max-w-7xl animate-fade-in">
                    {currentView === 'dashboard' && (
                        <Dashboard 
                            audiences={audiences} 
                            campaigns={campaigns} 
                            sequences={sequences}
                            onNavigate={setCurrentView} 
                            dbStatus={dbStatus}
                        />
                    )}

                    {currentView === 'generator' && (
                        <div className="w-full min-h-[80vh] flex flex-col justify-center">
                            {renderGeneratorContent()}
                        </div>
                    )}

                    {currentView === 'assets' && (
                        <AssetLibrary 
                            assets={assets}
                            onUpdate={updateAsset}
                            onDelete={deleteAsset}
                        />
                    )}

                    {currentView === 'sequences' && (
                        <SequenceBuilder 
                            sequences={sequences} 
                            assets={assets} 
                            onSave={saveSequence} 
                            onDelete={deleteSequence} 
                        />
                    )}

                    {currentView === 'campaigns' && (
                        <CampaignManager 
                            campaigns={campaigns} 
                            audiences={audiences} 
                            sequences={sequences} 
                            assets={assets} 
                            smtpConfig={smtpConfig} 
                            onSave={saveCampaign} 
                            onDelete={deleteCampaign} 
                        />
                    )}

                    {currentView === 'audiences' && (
                        <AudienceManager 
                            audiences={audiences} 
                            onAdd={addAudience} 
                            onUpdate={updateAudience} 
                            onDelete={deleteAudience} 
                        />
                    )}

                    {currentView === 'settings' && (
                        <div className="max-w-4xl mx-auto mt-8">
                            <SettingsScreen 
                                config={smtpConfig} 
                                onSave={handleSaveSettings} 
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
