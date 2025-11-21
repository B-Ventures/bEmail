/**
 * FIREBASE CLOUD FUNCTIONS IMPLEMENTATION
 * 
 * Instructions:
 * 1. Run `firebase init functions` in your project root.
 * 2. Copy this entire file content into `functions/index.js`.
 * 3. Run `npm install firebase-admin axios` inside the `functions` folder.
 * 4. Deploy with `firebase deploy --only functions`.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURATION ---
// Run every 15 minutes. You can change this cron syntax.
// Common values: 'every 15 minutes', 'every 1 hours', '0 9 * * 1' (Every Monday at 9am)
const RUN_SCHEDULE = 'every 15 minutes';

exports.processEmailCampaigns = functions.pubsub.schedule(RUN_SCHEDULE).onRun(async (context) => {
    console.log("[CronJob] Starting campaign check...");
    const now = new Date();
    let processedCount = 0;
    let sentCount = 0;

    try {
        // 1. GET ACTIVE CAMPAIGNS
        // We look for 'active' campaigns (Evergreen/Broadcast) OR 'scheduled' campaigns that are due.
        const campaignsRef = db.collection('campaigns');
        const campaignsSnapshot = await campaignsRef.get();

        const campaignsToProcess = [];

        campaignsSnapshot.forEach(doc => {
            const c = doc.data();
            
            const isScheduledDue = c.status === 'scheduled' && c.scheduledFor && new Date(c.scheduledFor) <= now;
            const isEvergreenActive = c.status === 'active' && c.runType === 'evergreen';
            const isBroadcastActive = c.status === 'active' && c.runType === 'broadcast'; // Resuming/Continuing a broadcast

            if (isScheduledDue || isEvergreenActive || isBroadcastActive) {
                campaignsToProcess.push({ ...c, id: doc.id });
            }
        });

        console.log(`[CronJob] Found ${campaignsToProcess.length} campaigns to process.`);

        // 2. PROCESS EACH CAMPAIGN
        for (const campaign of campaignsToProcess) {
            const result = await processSingleCampaign(campaign);
            if (result.sent > 0) sentCount += result.sent;
            processedCount++;
        }

        console.log(`[CronJob] Finished. Processed ${processedCount} campaigns. Sent ${sentCount} emails.`);
        return null;

    } catch (error) {
        console.error("[CronJob] Critical Error:", error);
        return null;
    }
});

/**
 * Logic to process a single campaign, check delays, and send emails.
 */
async function processSingleCampaign(campaign) {
    let campaignSentCount = 0;
    let newCompletedSubscribers = 0;
    
    try {
        // Validate Dependencies
        if (!campaign.userId) return { sent: 0 };

        const [audienceDoc, sequenceDoc, settingsDoc] = await Promise.all([
            db.collection('audiences').doc(campaign.audienceId).get(),
            db.collection('sequences').doc(campaign.sequenceId).get(),
            db.collection('settings').doc(campaign.userId).get()
        ]);

        if (!audienceDoc.exists || !sequenceDoc.exists || !settingsDoc.exists) {
            console.log(`[Skip] Campaign ${campaign.name}: Missing dependencies.`);
            return { sent: 0 };
        }

        const audience = audienceDoc.data();
        const sequence = sequenceDoc.data();
        const smtpConfig = settingsDoc.data();

        if (!smtpConfig.isConfigured || !smtpConfig.webhookUrl) {
            console.log(`[Skip] Campaign ${campaign.name}: Webhook not configured.`);
            return { sent: 0 };
        }

        // Fetch Assets (if needed for content resolution)
        const assetsSnapshot = await db.collection('assets').where('userId', '==', campaign.userId).get();
        const assets = assetsSnapshot.docs.map(d => d.data());

        // Prepare Progress State
        const updatedStepIndex = { ...(campaign.progress?.currentStepIndex || {}) };
        const updatedLastActionAt = { ...(campaign.progress?.lastActionAt || {}) };
        const now = new Date();

        // Iterate Subscribers
        for (const sub of audience.subscribers || []) {
            if (sub.status === 'unsubscribed') continue;

            const subCurrentStep = updatedStepIndex[sub.id] || 0;
            
            // Completed?
            if (subCurrentStep >= sequence.steps.length) continue;

            // Check Steps
            for (let i = subCurrentStep; i < sequence.steps.length; i++) {
                const step = sequence.steps[i];

                // --- TIME DELAY CHECK ---
                const delayHours = step.delayHours || 0;
                // If Step 0, compare with JoinedAt. Else compare with LastActionAt.
                const lastReferenceTimeStr = i === 0 ? sub.joinedAt : updatedLastActionAt[sub.id];
                const lastReferenceTime = new Date(lastReferenceTimeStr || sub.joinedAt);
                
                const diffHours = (now.getTime() - lastReferenceTime.getTime()) / (1000 * 60 * 60);

                if (diffHours < delayHours) {
                    // Not due yet. Stop processing this subscriber.
                    break; 
                }

                // --- PREPARE SEND ---
                const content = resolveContent(step, assets);
                const personalizedContent = personalize(content, sub);

                try {
                    // --- SEND VIA WEBHOOK ---
                    await axios.post(smtpConfig.webhookUrl, {
                        to: sub.email,
                        firstName: sub.firstName,
                        subject: step.subject,
                        html: personalizedContent,
                        campaign: campaign.name,
                        sequence: sequence.name
                    }, {
                        headers: smtpConfig.authHeader ? { 'Authorization': smtpConfig.authHeader } : {}
                    });

                    // --- UPDATE STATE ---
                    campaignSentCount++;
                    updatedStepIndex[sub.id] = i + 1;
                    updatedLastActionAt[sub.id] = now.toISOString();

                    // Check if next step is immediate (0 delay), if so, we might continue loop?
                    // For safety in cron jobs, usually better to send 1 email per cycle per user to avoid timeouts.
                    // We break here to ensure we only send 1 email per user per 15 mins.
                    break; 

                } catch (err) {
                    console.error(`[Error] Sending to ${sub.email}: ${err.message}`);
                    break; // Stop processing this user on error
                }
            }

            if (updatedStepIndex[sub.id] >= sequence.steps.length) {
                newCompletedSubscribers++;
            }
        }

        // 3. UPDATE DATABASE
        if (campaignSentCount > 0 || campaign.status === 'scheduled') {
            const updatePayload = {
                'stats.sent': admin.firestore.FieldValue.increment(campaignSentCount),
                'progress.completedSubscribers': admin.firestore.FieldValue.increment(newCompletedSubscribers),
                'progress.currentStepIndex': updatedStepIndex,
                'progress.lastActionAt': updatedLastActionAt
            };

            if (campaign.status === 'scheduled') {
                updatePayload.status = 'active';
                updatePayload.scheduledFor = admin.firestore.FieldValue.delete();
            }

            if (campaign.runType === 'broadcast') {
                const allFinished = audience.subscribers.every(s => 
                    s.status === 'unsubscribed' || (updatedStepIndex[s.id] || 0) >= sequence.steps.length
                );
                if (allFinished) updatePayload.status = 'completed';
            }

            await db.collection('campaigns').doc(campaign.id).update(updatePayload);
        }

        return { sent: campaignSentCount };

    } catch (e) {
        console.error(`[Error] Campaign ${campaign.id}:`, e);
        return { sent: 0 };
    }
}

// --- HELPERS ---

function resolveContent(step, assets) {
    if (step.contentType === 'text' || step.contentType === 'html') {
        return step.content || '';
    }
    if (step.contentType === 'asset_ref' && step.assetRef) {
        const asset = assets.find(a => a.id === step.assetRef.assetId);
        const email = asset?.emails.find(e => e.day === step.assetRef.dayIndex);
        return email ? email.htmlBody : '';
    }
    return '';
}

function personalize(content, sub) {
    if (!content) return '';
    return content
        .replace(/{{firstName}}/gi, sub.firstName || 'Friend')
        .replace(/{{firstname}}/gi, sub.firstName || 'Friend')
        .replace(/{{contact\.FIRSTNAME}}/gi, sub.firstName || 'Friend')
        .replace(/{{name}}/gi, sub.firstName || 'Friend')
        .replace(/{{email}}/gi, sub.email);
}
