// routes/resourceRoutes.js
const express = require('express');
const router = express.Router();
const treeSpecies = require('../controllers/treeSpeciesController');
const planting = require('../controllers/plantingRecordsController');
const contributions = require('../controllers/communityContributionsController');

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

// Community Contributions Routes
router.post('/contributions', contributions.createContribution);
router.get('/contributions/user/:user_id', contributions.getContributionsByUser);
router.get('/contributions/project/:project_id', contributions.getContributionsByProject);
router.delete('/contributions/:id', contributions.deleteContribution);

module.exports = router;
