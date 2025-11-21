
/**
 * EXTERNAL AUTOMATION SCRIPT (SERVER-SIDE)
 * 
 * This script runs in GitHub Actions.
 */

import admin from 'firebase-admin';
import axios from 'axios';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. INITIALIZE FIREBASE (Securely using Environment Variable)
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
    console.error("CRITICAL ERROR: process.env.FIREBASE_SERVICE_ACCOUNT is missing.");
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(serviceAccountRaw);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
    process.exit(1);
}

const db = getFirestore();

// 2. MAIN EXECUTION FUNCTION
async function run() {
    console.log(`[${new Date().toISOString()}] Starting campaign scheduler...`);
    const now = new Date();
    let emailsSent = 0;
    
    try {
        const campaignsRef = db.collection('campaigns');
        const campaignsSnapshot = await campaignsRef.get();

        const campaignsToProcess = [];

        campaignsSnapshot.forEach(doc => {
            const c = doc.data();
            const isScheduledDue = c.status === 'scheduled' && c.scheduledFor && new Date(c.scheduledFor) <= now;
            const isActiveEvergreen = c.status === 'active' && c.runType === 'evergreen';
            const isActiveBroadcast = c.status === 'active' && c.runType === 'broadcast';

            if (isScheduledDue || isActiveEvergreen || isActiveBroadcast) {
                campaignsToProcess.push({ ...c, id: doc.id });
            }
        });

        console.log(`Found ${campaignsToProcess.length} potential campaigns.`);

        for (const campaign of campaignsToProcess) {
            const sent = await processSingleCampaign(campaign);
            emailsSent += sent;
        }

        console.log(`[Success] Scheduler run complete. Total emails sent: ${emailsSent}`);

    } catch (error) {
        console.error("[Fatal Error]", error);
        process.exit(1);
    }
}

// 3. CAMPAIGN PROCESSING LOGIC
async function processSingleCampaign(campaign) {
    let sentCount = 0;
    let newCompleted = 0;
    const now = new Date();

    console.log(`Processing Campaign: "${campaign.name}" (${campaign.id})`);

    try {
        const [audSnap, seqSnap, setSnap] = await Promise.all([
            db.collection('audiences').doc(campaign.audienceId).get(),
            db.collection('sequences').doc(campaign.sequenceId).get(),
            db.collection('settings').doc(campaign.userId).get()
        ]);

        if (!audSnap.exists || !seqSnap.exists || !setSnap.exists) return 0;

        const audience = audSnap.data();
        const sequence = seqSnap.data();
        const smtpConfig = setSnap.data();

        if (!smtpConfig.isConfigured || !smtpConfig.webhookUrl || smtpConfig.method !== 'webhook') return 0;

        const assetsSnap = await db.collection('assets').where('userId', '==', campaign.userId).get();
        const assets = assetsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

        const stepIndexMap = { ...(campaign.progress.currentStepIndex || {}) };
        const lastActionMap = { ...(campaign.progress.lastActionAt || {}) };

        for (const sub of audience.subscribers) {
            if (sub.status === 'unsubscribed') continue;

            const subId = sub.id;
            const currentStepIdx = stepIndexMap[subId] || 0;

            if (currentStepIdx >= sequence.steps.length) continue;

            const step = sequence.steps[currentStepIdx];
            const delayHours = step.delayHours || 0;
            const refDateStr = currentStepIdx === 0 ? sub.joinedAt : lastActionMap[subId];
            
            if (!refDateStr) continue;

            const refDate = new Date(refDateStr);
            const diffMs = now.getTime() - refDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours >= delayHours) {
                const rawContent = resolveContent(step, assets);
                const personalizedHtml = personalize(rawContent, sub);

                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (smtpConfig.authHeader) headers['Authorization'] = smtpConfig.authHeader;

                    await axios.post(smtpConfig.webhookUrl, {
                        to: sub.email,
                        firstName: sub.firstName,
                        subject: step.subject,
                        html: personalizedHtml,
                        campaign: campaign.name,
                        sequence: sequence.name,
                        stepIndex: currentStepIdx + 1
                    }, { headers });

                    sentCount++;
                    stepIndexMap[subId] = currentStepIdx + 1;
                    lastActionMap[subId] = now.toISOString();

                    if (stepIndexMap[subId] >= sequence.steps.length) {
                        newCompleted++;
                    }
                } catch (err) {
                    console.error(`  -> Error sending to ${sub.email}: ${err.message}`);
                }
            }
        }

        if (sentCount > 0 || campaign.status === 'scheduled') {
            const updatePayload = {
                'stats.sent': FieldValue.increment(sentCount),
                'progress.completedSubscribers': FieldValue.increment(newCompleted),
                'progress.currentStepIndex': stepIndexMap,
                'progress.lastActionAt': lastActionMap
            };

            if (campaign.status === 'scheduled') {
                updatePayload.status = 'active';
                updatePayload.scheduledFor = FieldValue.delete();
            }

            if (campaign.runType === 'broadcast') {
                const allDone = audience.subscribers.every(s => 
                    s.status === 'unsubscribed' || (stepIndexMap[s.id] || 0) >= sequence.steps.length
                );
                if (allDone) updatePayload.status = 'completed';
            }

            await db.collection('campaigns').doc(campaign.id).update(updatePayload);
        }

        return sentCount;

    } catch (err) {
        console.error(`Error processing campaign ${campaign.id}:`, err);
        return 0;
    }
}

function resolveContent(step, assets) {
    if (step.contentType === 'text' || step.contentType === 'html') return step.content || '';
    if (step.contentType === 'asset_ref' && step.assetRef) {
        const asset = assets.find(a => a.id === step.assetRef.assetId);
        if (!asset) return '';
        const email = asset.emails.find(e => e.day === step.assetRef.dayIndex);
        return email ? email.htmlBody : '';
    }
    return '';
}

function personalize(content, sub) {
    if (!content) return '';
    return content
        .replace(/{{firstName}}/gi, sub.firstName || 'Friend')
        .replace(/{{firstname}}/gi, sub.firstName || 'Friend')
        .replace(/{{name}}/gi, sub.firstName || 'Friend')
        .replace(/{{email}}/gi, sub.email);
}

run();
