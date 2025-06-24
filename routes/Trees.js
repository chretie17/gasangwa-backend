// Add these routes to your routes file (e.g., routes/trees.js or routes/tasks.js)

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/TreesController'); // Adjust path as needed

// Tree mapping routes
router.get('/planted-trees', taskController.getPlantedTrees);
router.get('/trees/project/:projectId', taskController.getTreesByProject);
router.get('/tree-statistics', taskController.getTreeStatistics);
router.get('/trees/nearby', taskController.getTreesInRadius);

module.exports = router;

// If adding to existing routes file, just add these lines:
// app.get('/api/planted-trees', taskController.getPlantedTrees);
// app.get('/api/trees/project/:projectId', taskController.getTreesByProject);
// app.get('/api/tree-statistics', taskController.getTreeStatistics);
// app.get('/api/trees/nearby', taskController.getTreesInRadius);