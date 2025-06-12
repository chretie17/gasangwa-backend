// routes/resourceRoutes.js
const express = require('express');
const router = express.Router();
const treeSpecies = require('../controllers/treeSpeciesController');
const planting = require('../controllers/plantingRecordsController');
const communityContributionsController = require('../controllers/communityContributionsController');


// Tree Species Routes
router.post('/tree-species', treeSpecies.createTreeSpecies);
router.get('/tree-species', treeSpecies.getAllTreeSpecies);
router.put('/tree-species/:id', treeSpecies.updateTreeSpecies);
router.delete('/tree-species/:id', treeSpecies.deleteTreeSpecies);

// Planting Records Routes
router.post('/planting-records', planting.createPlantingRecord);
router.get('/planting-records/project/:project_id', planting.getPlantingRecordsByProject);
router.get('/planting-records/user/:user_id', planting.getPlantingRecordsByUser);
router.delete('/planting-records/:id', planting.deletePlantingRecord);


router.post('/contributions', communityContributionsController.addContribution);
router.get('/contributions/user/:userId', communityContributionsController.getUserContributions);
router.get('/contributions/planting/:date', communityContributionsController.getTreePlantingContributionsByDate);
router.get('/contributions/total-trees-planted/:userId', communityContributionsController.getTotalTreesPlanted);
router.put('/contributions/update-frequency', communityContributionsController.updateMaintenanceFrequency);
router.get('/contributions/all', communityContributionsController.getAllContributions);
router.put('/contributions/:id/status', communityContributionsController.updateStatus);


module.exports = router;
