
import { Campaign, Audience, Sequence, Asset, SmtpConfig } from '../types';
import { buildUnsubscribeUrl } from './unsubscribe';
import { claimCampaignStep } from './firebase';

// Helper to resolve content from a sequence step
export const resolveStepContent = (step: any, assets: Asset[]): string => {
    if (step.contentType === 'text' || step.contentType === 'html') {
        return step.content || '';
    }
    if (step.contentType === 'asset_ref' && step.assetRef) {
        const asset = assets.find(a => a.id === step.assetRef?.assetId);
        const email = asset?.emails.find(e => e.day === step.assetRef?.dayIndex);
        return email ? email.htmlBody : '<p>Error: Linked Asset not found</p>';
    }
    return '';
};

export const processCampaignSequence = async (
    campaign: Campaign,
    audience: Audience,
    sequence: Sequence,
    assets: Asset[],
    smtpConfig: SmtpConfig,
    onUpdate: (c: Campaign) => void,
    recentSendsCache: Set<string>,
    onLog?: (msg: string) => void
) => {
    // Don't process if paused
    if ((campaign.status as string) === 'paused') return;

    const logs = (msg: string) => {
        if (onLog) onLog(msg);
    };

    // Check if Sequence Exists
    if (!sequence) {
        logs(`[Error] Linked sequence not found for campaign: ${campaign.name}`);
        return;
    }
    
    if (!audience || audience.subscribers.length === 0) {
        logs(`[Skip] No audience or subscribers for campaign: ${campaign.name}`);
        return;
    }

    // logs(`[System] Processing campaign: ${campaign.name}`);

    let sentCount = 0;
    let newCompletedSubscribers = 0;
    const updatedStepIndex = { ...campaign.progress.currentStepIndex };
    const updatedLastActionAt = { ...(campaign.progress.lastActionAt || {}) };
    
    const now = new Date();

    // Loop through subscribers
    for (const sub of audience.subscribers) {
        if (sub.status === 'unsubscribed') continue;

        // CHECK: Has this subscriber already completed this sequence?
        const subCurrentStep = updatedStepIndex[sub.id] || 0;
        if (subCurrentStep >= sequence.steps.length) {
            continue;
        }

        // Loop through steps in the sequence STARTING from their last position
        for (let i = subCurrentStep; i < sequence.steps.length; i++) {
            const step = sequence.steps[i];
            
            // --- SAFETY LOCK CHECK ---
            const uniqueActionKey = `${campaign.id}-${sub.id}-step-${i}`;
            if (recentSendsCache.has(uniqueActionKey)) {
                // logs(`   -> [Lock] Skipping ${sub.email} step ${i} (Recently processed)`);
                break;
            }
            // -------------------------
            
            // --- TIME DELAY CHECK ---
            const delayHours = step.delayHours || 0;
            // If this is Step 0, we compare against joinedAt. 
            // If this is Step > 0, we compare against the LAST email sent time.
            const lastReferenceTimeStr = i === 0 ? sub.joinedAt : updatedLastActionAt[sub.id];
            
            // Fallback to joinedAt if reference is missing
            const lastReferenceTime = new Date(lastReferenceTimeStr || sub.joinedAt);
            
            const diffInMilliseconds = now.getTime() - lastReferenceTime.getTime();
            const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

            if (diffInHours < delayHours) {
                 // Not due yet
                 break; 
            }
            // ------------------------

            // CLAIM FIRST on the live Firestore document. The in-memory `campaign` can be stale
            // (e.g. this tab was asleep while the GitHub scheduler already sent this step).
            const claimIso = new Date().toISOString();
            const claimed = await claimCampaignStep(campaign.id, sub.id, i, claimIso, sequence.steps.length);
            recentSendsCache.add(uniqueActionKey);
            if (!claimed) {
                logs(`   -> [Skip] ${sub.email} step ${i + 1} already handled by another sender`);
                break;
            }

            // WE ARE GOING TO SEND
            logs(`[Queue] Sending to ${sub.email}: "${step.subject}"`);

            const content = resolveStepContent(step, assets);
            
            // Personalized Content Replacement
            const unsubscribeUrl = await buildUnsubscribeUrl(audience.id, sub.id, sub.email, `${window.location.origin}${window.location.pathname}`);
            const personalizedContent = content
                .replace(/{{unsubscribeUrl}}/gi, unsubscribeUrl)
                .replace(/{{firstName}}/gi, sub.firstName || 'Friend')
                .replace(/{{firstname}}/gi, sub.firstName || 'Friend')
                .replace(/{{contact\.FIRSTNAME}}/gi, sub.firstName || 'Friend')
                .replace(/{{name}}/gi, sub.firstName || 'Friend')
                .replace(/{{email}}/gi, sub.email);

            if (smtpConfig.method === 'webhook') {
                try {
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (smtpConfig.authHeader) {
                        headers['Authorization'] = smtpConfig.authHeader;
                    }

                    // ACTUAL SENDING LOGIC VIA WEBHOOK
                    await fetch(smtpConfig.webhookUrl, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            to: sub.email,
                            firstName: sub.firstName,
                            subject: step.subject,
                            html: personalizedContent,
                            unsubscribeUrl,
                            campaign: campaign.name,
                            sequence: sequence.name
                        })
                    });
                    logs(`   -> Webhook sent successfully`);
                    
                } catch (err: any) {
                    console.error(err);
                    logs(`   -> Webhook Failed: ${err.message}`);
                    // Keep the claim: a browser fetch can fail (e.g. CORS) even when the webhook DID send,
                    // so we never retry from here. At most one copy per step.
                }
            } else {
                // Simulation Mode
                await new Promise(r => setTimeout(r, 100)); 
                logs(`   -> [Simulated] Email Sent`);
            }
            
            // Update Counters & Timestamps
            sentCount++;
            updatedStepIndex[sub.id] = i + 1; // Move to next step
            updatedLastActionAt[sub.id] = claimIso; // Record the claim time as the last action

            // If we just sent an email, we typically wait for the NEXT delay before sending the next one.
            break; 
        }

        // Check if completed
        if (updatedStepIndex[sub.id] >= sequence.steps.length) {
            newCompletedSubscribers++;
        }
    }
    
    // Determine final status
    let finalStatus = campaign.status;
    
    if (campaign.runType === 'broadcast') {
        const allDone = audience.subscribers.every(s => 
            (updatedStepIndex[s.id] || 0) >= sequence.steps.length || s.status === 'unsubscribed'
        );
        if (allDone) finalStatus = 'completed';
        else finalStatus = 'active';
    } else {
        finalStatus = 'active';
    }

    if ((campaign.status as string) === 'paused') finalStatus = 'paused';

    // Progress and stats were already written atomically by claimCampaignStep().
    // Only push status changes here, and never write the (possibly stale) progress maps back.
    if (campaign.status !== finalStatus || campaign.scheduledFor) {
        onUpdate({
            ...campaign,
            status: finalStatus,
            scheduledFor: undefined, // Clear schedule as it has run
        });
    }
};
