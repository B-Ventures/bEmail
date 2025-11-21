
import React, { useEffect, useRef, useState } from 'react';
import { Campaign, Audience, Sequence, Asset, SmtpConfig } from '../types';
import { processCampaignSequence } from '../services/campaignProcessor';

interface CampaignSchedulerProps {
  campaigns: Campaign[];
  audiences: Audience[];
  sequences: Sequence[];
  assets: Asset[];
  smtpConfig: SmtpConfig;
  onUpdateCampaign: (campaign: Campaign) => void;
}

const CampaignScheduler: React.FC<CampaignSchedulerProps> = ({ 
    campaigns, 
    audiences, 
    sequences, 
    assets,
    smtpConfig, 
    onUpdateCampaign 
}) => {
  const [lastRun, setLastRun] = useState<Date>(new Date());
  const isProcessingRef = useRef(false);
  
  // Local cache to prevent sending duplicates in the same session
  // Key format: `campaignId-subscriberId-stepIndex`
  const recentSendsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkCampaigns = async () => {
      if (isProcessingRef.current) return;
      
      // 1. Verify Config
      if (!smtpConfig.isConfigured || !smtpConfig.webhookUrl) {
          return; // Can't send if not configured
      }

      isProcessingRef.current = true;
      // console.log("Running Scheduler Check...", new Date().toLocaleTimeString());

      try {
        const now = new Date();
        
        for (const campaign of campaigns) {
            
            // 2. Check if Campaign should run
            const isScheduledDue = campaign.status === 'scheduled' && campaign.scheduledFor && new Date(campaign.scheduledFor) <= now;
            const isActiveEvergreen = campaign.status === 'active' && campaign.runType === 'evergreen';
            const isActiveBroadcast = campaign.status === 'active' && campaign.runType === 'broadcast'; // Resume functionality

            if (isScheduledDue || isActiveEvergreen || isActiveBroadcast) {
                
                const audience = audiences.find(a => a.id === campaign.audienceId);
                const sequence = sequences.find(s => s.id === campaign.sequenceId);

                if (audience && sequence) {
                    // Update status to Active if it was scheduled
                    if (campaign.status === 'scheduled') {
                        const activeCampaign = { ...campaign, status: 'active' as const, scheduledFor: undefined };
                        onUpdateCampaign(activeCampaign);
                        // Continue processing with the active version in next tick or assume logic holds
                    }

                    await processCampaignSequence(
                        campaign,
                        audience,
                        sequence,
                        assets,
                        smtpConfig,
                        onUpdateCampaign,
                        recentSendsRef.current,
                        // No UI log callback for background worker
                    );
                }
            }
        }
      } catch (e) {
          console.error("Scheduler Error:", e);
      } finally {
        setLastRun(new Date());
        isProcessingRef.current = false;
      }
    };

    // Run immediately on mount, then every 60 seconds
    checkCampaigns();
    const intervalId = setInterval(checkCampaigns, 60000); 

    return () => clearInterval(intervalId);
  }, [campaigns, audiences, sequences, assets, smtpConfig, onUpdateCampaign]);

  // Render a hidden heartbeat indicator for the user
  return (
      <div className="fixed bottom-2 right-2 z-50 pointer-events-none opacity-50">
          <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white">
              <div className={`h-1.5 w-1.5 rounded-full ${isProcessingRef.current ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`}></div>
              <span>Scheduler Active</span>
          </div>
      </div>
  );
};

export default CampaignScheduler;
