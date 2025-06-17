const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const tascontroller = require('../controllers/tascontroller');

// Create a new task
router.post('/', taskController.createTask);

// Get all tasks
router.get('/', taskController.getTasks);

// Get a specific task by ID
router.get('/:taskId', taskController.getTaskById);

// Update a task by ID
router.put('/:taskId', taskController.updateTask);

// Delete a task by ID
router.delete('/:taskId', taskController.deleteTask);


router.get('/assigned/:userId', taskController.getAssignedTasks);

router.put('/:taskId/status', taskController.updateTaskStatus);
// Updated route for status update with image upload
router.put('/tasks/:taskId/status', taskController.updateTaskStatus);

// Optional: Route to serve task images
router.get('/tasks/images/:filename', taskController.getTaskImage);

// Optional: Route to get all images for a specific task
router.get('/tasks/:taskId/images', taskController.getTaskImages);



module.exports = router;
