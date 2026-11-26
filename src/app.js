import {mountCampaign} from './strategy-app.js?v=8.0.0';

// The old #strategie bookmark and the root both open this same campaign.
mountCampaign(document.getElementById('rts-screen'),document.documentElement.dataset.saveKey || 'neon-colony-v2');
