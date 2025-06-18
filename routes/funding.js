// routes/funding.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/fundingController');

// list all active campaigns (or filter by ?projectId=)
router.get('/campaigns', ctrl.listCampaigns);

// create & get single campaign
router.post('/campaigns',           ctrl.createCampaign);
router.get('/campaigns/:campaignId',ctrl.getCampaign);

// …the rest of your funding routes…
router.post('/issue',       ctrl.issueCredits);
router.post('/sell',        ctrl.sellCredits);
router.post('/donate',      ctrl.donate);
router.post('/verify',      ctrl.verifyCredits);
router.get('/market-pricing', ctrl.getMarketPricing);

// finally fetch project funding summary/history
router.get('/:projectId',   ctrl.getProjectFunding);

module.exports = router;
