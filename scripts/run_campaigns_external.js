
/**
 * EXTERNAL AUTOMATION SCRIPT (SERVER-SIDE)
 * 
 * This script runs in GitHub Actions.
 */

import admin from 'firebase-admin';
import axios from 'axios';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

const APP_URL = process.env.APP_URL || 'https://b-ventures.github.io/bEmail/';
const unsubscribeToken = (audienceId, email) => createHash('sha256').update(`${audienceId}:${String(email).trim().toLowerCase()}`).digest('hex').slice(0, 16);
const unsubscribeUrl = (audienceId, sub) => `${APP_URL}?action=unsubscribe&listId=${encodeURIComponent(audienceId)}&sid=${encodeURIComponent(sub.id)}&t=${unsubscribeToken(audienceId, sub.email)}`;

// 1. INITIALIZE FIREBASE (Securely using Environment Variable)
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
    console.error("❌ CRITICAL ERROR: process.env.FIREBASE_SERVICE_ACCOUNT is missing.");
    console.error("-> Go to GitHub Repo Settings -> Secrets -> Actions and add 'FIREBASE_SERVICE_ACCOUNT'.");
    process.exit(1);
}

// Validate Secret Format
const trimmedSecret = serviceAccountRaw.trim();

if (!trimmedSecret.startsWith('{')) {
    console.error("❌ CRITICAL ERROR: The FIREBASE_SERVICE_ACCOUNT secret is invalid.");
    console.error(`-> It starts with the character: "${trimmedSecret.substring(0, 5)}..."`);
    console.error("-> It MUST start with a curly brace '{'.");
    
    if (/^\d/.test(trimmedSecret)) {
         console.error("⚠️  DIAGNOSIS: It looks like you pasted the FILENAME (e.g. '0123...json') instead of the FILE CONTENT.");
    }
    
    console.error("-> ACTION REQUIRED: Open the JSON file on your computer, copy ALL text inside, and update the GitHub Secret.");
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(trimmedSecret);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
    process.exit(1);
}

const db = getFirestore();

// 2. MAIN EXECUTION FUNCTION
async function run() {
    console.log(`[${new Date().toISOString()}] Starting campaign scheduler...`);
    const now = new Date();
    let emailsSent = 0;
    
    try {
        await syncPublicFormsAndMergeSubscriptions();
        await applyUnsubscribes();
    } catch (e) {
        console.error("[Warn] Subscription merge failed:", e.message);
    }

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


// 2b. PUBLIC FORMS + PENDING SIGN-UPS
// Mirrors each audience's name/description to `publicForms` (what the public subscribe page reads)
// and moves pending public sign-ups from `subscriptions` into their audience.
async function syncPublicFormsAndMergeSubscriptions() {
    const audSnap = await db.collection('audiences').get();
    const batch = db.batch();
    audSnap.forEach(d => {
        const a = d.data();
        batch.set(db.collection('publicForms').doc(d.id), {
            id: d.id, name: a.name || '', description: a.description || '', userId: a.userId || ''
        });
    });
    await batch.commit();

    const pendingSnap = await db.collection('subscriptions').get();
    if (pendingSnap.empty) return;

    const byAudience = {};
    pendingSnap.forEach(d => {
        const p = d.data();
        (byAudience[p.audienceId] = byAudience[p.audienceId] || []).push({ ...p, _ref: d.ref });
    });

    for (const [audienceId, items] of Object.entries(byAudience)) {
        const audRef = db.collection('audiences').doc(audienceId);
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(audRef);
            if (!snap.exists) { items.forEach(p => tx.delete(p._ref)); return; }
            const audience = snap.data();
            const subscribers = audience.subscribers || [];
            const existing = new Set(subscribers.map(s => (s.email || '').trim().toLowerCase()));
            let added = 0;
            for (const p of items) {
                if (!existing.has(p.email)) {
                    existing.add(p.email);
                    subscribers.push({ id: p.subscriberId, email: p.email, firstName: p.firstName || 'Friend', joinedAt: p.joinedAt, status: 'active' });
                    added++;
                }
                tx.delete(p._ref);
            }
            if (added > 0) tx.update(audRef, { subscribers });
            console.log(`Merged ${added} new subscriber(s) into audience ${audienceId}.`);
        });
    }
}

// Apply public unsubscribe requests (token must match the subscriber's email).
async function applyUnsubscribes() {
    const snap = await db.collection('unsubscribes').get();
    if (snap.empty) return;
    const byAudience = {};
    snap.forEach(d => { const r = d.data(); (byAudience[r.audienceId] = byAudience[r.audienceId] || []).push({ ...r, _ref: d.ref }); });
    for (const [audienceId, items] of Object.entries(byAudience)) {
        const audRef = db.collection('audiences').doc(audienceId);
        await db.runTransaction(async (tx) => {
            const a = await tx.get(audRef);
            if (!a.exists) { items.forEach(r => tx.delete(r._ref)); return; }
            const subscribers = a.data().subscribers || [];
            let changed = 0;
            for (const r of items) {
                const sub = subscribers.find(s => s.id === r.subscriberId);
                if (sub && sub.status !== 'unsubscribed' && unsubscribeToken(audienceId, sub.email) === r.token) {
                    sub.status = 'unsubscribed';
                    changed++;
                }
                tx.delete(r._ref);
            }
            if (changed > 0) tx.update(audRef, { subscribers });
            console.log(`Applied ${changed} unsubscribe(s) on audience ${audienceId}.`);
        });
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
                // Claim this exact step first (transaction on the live campaign doc). If another sender
                // (the browser app or an overlapping run) already moved this subscriber past it, skip.
                const claimed = await claimStep(campaign.id, subId, currentStepIdx, now.toISOString(), sequence.steps.length);
                if (!claimed) {
                    console.log(`  -> Skip ${sub.email} step ${currentStepIdx + 1}: already claimed by another sender.`);
                    continue;
                }

                const rawContent = resolveContent(step, assets);
                const unsubUrl = unsubscribeUrl(audience.id || campaign.audienceId, sub);
                const personalizedHtml = personalize(rawContent, sub).replace(/{{unsubscribeUrl}}/gi, unsubUrl);

                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (smtpConfig.authHeader) headers['Authorization'] = smtpConfig.authHeader;

                    await axios.post(smtpConfig.webhookUrl, {
                        to: sub.email,
                        firstName: sub.firstName,
                        subject: step.subject,
                        html: personalizedHtml,
                        unsubscribeUrl: unsubUrl,
                        campaign: campaign.name,
                        sequence: sequence.name,
                        stepIndex: currentStepIdx + 1
                    }, { headers });

                    sentCount++;
                } catch (err) {
                    console.error(`  -> Error sending to ${sub.email}: ${err.message}`);
                    // Release the claim so the next run retries this step.
                    await releaseStep(campaign.id, subId, currentStepIdx, lastActionMap[subId] || null, sequence.steps.length);
                }
            }
        }

        // Progress/stats are written per send inside claimStep(); here only status changes remain.
        if (campaign.status === 'scheduled' || campaign.runType === 'broadcast') {
            const updatePayload = {};
            if (campaign.status === 'scheduled') {
                updatePayload.status = 'active';
                updatePayload.scheduledFor = FieldValue.delete();
            }
            if (campaign.runType === 'broadcast') {
                const fresh = (await db.collection('campaigns').doc(campaign.id).get()).data() || {};
                const idx = (fresh.progress && fresh.progress.currentStepIndex) || {};
                const allDone = audience.subscribers.every(s =>
                    s.status === 'unsubscribed' || (idx[s.id] || 0) >= sequence.steps.length
                );
                if (allDone) updatePayload.status = 'completed';
            }
            if (Object.keys(updatePayload).length) await db.collection('campaigns').doc(campaign.id).update(updatePayload);
        }

        return sentCount;

    } catch (err) {
        console.error(`Error processing campaign ${campaign.id}:`, err);
        return 0;
    }
}

// Atomically move one subscriber from step `idx` to `idx + 1`. Returns false if the live
// document no longer has them at `idx` (someone else already sent it).
async function claimStep(campaignId, subId, idx, nowIso, totalSteps) {
    const ref = db.collection('campaigns').doc(campaignId);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        const c = snap.data();
        if (c.status === 'paused') return false;
        const live = (c.progress && c.progress.currentStepIndex && c.progress.currentStepIndex[subId]) || 0;
        if (live !== idx) return false;
        const args = [
            new FieldPath('progress', 'currentStepIndex', subId), idx + 1,
            new FieldPath('progress', 'lastActionAt', subId), nowIso,
            new FieldPath('stats', 'sent'), FieldValue.increment(1)
        ];
        if (idx + 1 >= totalSteps) args.push(new FieldPath('progress', 'completedSubscribers'), FieldValue.increment(1));
        tx.update(ref, ...args);
        return true;
    });
}

// Undo a claim after a failed webhook call (only if nobody moved the subscriber since).
async function releaseStep(campaignId, subId, idx, prevLastAction, totalSteps) {
    const ref = db.collection('campaigns').doc(campaignId);
    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return;
            const c = snap.data();
            const live = (c.progress && c.progress.currentStepIndex && c.progress.currentStepIndex[subId]) || 0;
            if (live !== idx + 1) return;
            const args = [
                new FieldPath('progress', 'currentStepIndex', subId), idx,
                new FieldPath('progress', 'lastActionAt', subId), prevLastAction === null ? FieldValue.delete() : prevLastAction,
                new FieldPath('stats', 'sent'), FieldValue.increment(-1)
            ];
            if (idx + 1 >= totalSteps) args.push(new FieldPath('progress', 'completedSubscribers'), FieldValue.increment(-1));
            tx.update(ref, ...args);
        });
    } catch (e) {
        console.error(`  -> Could not release claim for ${subId}: ${e.message}`);
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
