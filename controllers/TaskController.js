const db = require('../db');  // Assuming you've set up MySQL connection
const { validationResult } = require('express-validator');
const { utcToZonedTime } = require('date-fns-tz');
const { format } = require('date-fns');


// Add these to your task controller file

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/tasks';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: taskId_timestamp_originalname
    const taskId = req.body.taskId || req.params.taskId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `task_${taskId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});
exports.getTaskDetails = (req, res) => {
  const { taskId } = req.params;
  const query = `
    SELECT t.*, 
      u1.username AS created_by_username,
      u2.username AS assigned_user_username,
      p.project_name,
      DATE_FORMAT(t.start_date, '%Y-%m-%dT%H:%i') as formatted_start_date,
      DATE_FORMAT(t.end_date, '%Y-%m-%dT%H:%i') as formatted_end_date,
      DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') as created_at_formatted,
      DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at_formatted
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `;

  db.query(query, [taskId], (err, result) => {
    if (err) {
      console.error('Error fetching task details:', err);
      return res.status(500).json({ message: 'Error fetching task details' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const task = result[0];
    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Format the response with all details
    const taskDetails = {
      ...task,
      progress_image: task.progress_image 
        ? `${baseUrl}/${task.progress_image.replace(/\\/g, '/')}` 
        : null,
      location: task.location || '',
      user_location: task.user_location || '',
      latitude: task.latitude || null,
      longitude: task.longitude || null,
    };
    
    res.status(200).json(taskDetails);
  });
};

// Updated updateTaskStatus function
exports.updateTaskStatus = [
  upload.single('taskImage'), // Add multer middleware
  (req, res) => {
    const { taskId } = req.params;
const { status, userLocation, latitude, longitude } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    if (!userLocation || userLocation.trim() === '') {
      return res.status(400).json({ message: 'User location is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Progress image is required.' });
    }

    const imagePath = req.file.path;

    // Update task with status, image path, and user location
   const query = `
  UPDATE tasks
  SET status = ?, progress_image = ?, user_location = ?, latitude = ?, longitude = ?, updated_at = NOW()
  WHERE id = ?
`;
const values = [status, imagePath, userLocation.trim(), latitude || null, longitude || null, taskId];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating task status:', err);
        // Delete uploaded file if database update fails
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        return res.status(500).json({ message: 'Error updating task status' });
      }
      if (result.affectedRows === 0) {
        // Delete uploaded file if task not found
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        return res.status(404).json({ message: 'Task not found' });
      }
      res.status(200).json({ 
        message: 'Task status updated successfully',
        imagePath: imagePath,
        userLocation: userLocation.trim()
      });
    });
  }
];
// Optional: Add endpoint to serve uploaded images
exports.getTaskImage = (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, '../uploads/tasks', filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: 'Image not found' });
  }
};

// Optional: Get all task images for a specific task
exports.getTaskImages = (req, res) => {
  const { taskId } = req.params;
  const query = `
    SELECT progress_image, updated_at 
    FROM tasks 
    WHERE id = ? AND progress_image IS NOT NULL
  `;
  
  db.query(query, [taskId], (err, results) => {
    if (err) {
      console.error('Error fetching task images:', err);
      return res.status(500).json({ message: 'Error fetching task images' });
    }
    res.json(results);
  });
};// Create a new task
exports.createTask = (req, res) => {
  const {
    title, description, assigned_user,
    start_date, end_date, status,
    priority, project_id, created_by,
    location   // ← destructure location
  } = req.body;

  // ... validation omitted for brevity

  const query = `
    INSERT INTO tasks 
      (title, description, assigned_user, location, start_date, end_date, status, priority, project_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    title, description, assigned_user, location,
    start_date, end_date, status, priority,
    project_id, created_by
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error creating task:', err);
      return res.status(500).json({ message: 'Error creating task' });
    }
    res.status(201).json({
      message: 'Task created successfully',
      taskId: result.insertId,
      data: { id: result.insertId, ...req.body }
    });
  });
};

// Update a task by ID
exports.updateTask = (req, res) => {
  const { taskId } = req.params;
  const {
    title, description, assigned_user,
    location,   // ← destructure location
    start_date, end_date, status, priority, project_id
  } = req.body;

  const query = `
    UPDATE tasks
    SET title = ?, description = ?, assigned_user = ?, location = ?, 
        start_date = ?, end_date = ?, status = ?, priority = ?, project_id = ?
    WHERE id = ?
  `;
  const values = [
    title, description, assigned_user, location,
    start_date, end_date, status, priority,
    project_id, taskId
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ message: 'Error updating task' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json({ message: 'Task updated successfully' });
  });
};


  
exports.getTaskById = (req, res) => {
  const { taskId } = req.params;
  const query = `
    SELECT t.*, 
      u1.username AS created_by_username,
      u2.username AS assigned_user_username
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
    WHERE t.id = ?
  `;

  db.query(query, [taskId], (err, result) => {
    if (err) {
      console.error('Error fetching task:', err);
      return res.status(500).json({ message: 'Error fetching task' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(result[0]);
  });
};


// Delete a task by ID
exports.deleteTask = (req, res) => {
  const { taskId } = req.params;
  const query = 'DELETE FROM tasks WHERE id = ?';

  db.query(query, [taskId], (err, result) => {
    if (err) {
      console.error('Error deleting task:', err);
      return res.status(500).json({ message: 'Error deleting task' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  });
};

 exports.getTasks = (req, res) => {
  const query = `
    SELECT t.*,
      u1.username AS created_by_username,
      u2.username AS assigned_user_username
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching tasks' });

    const baseUrl = req.protocol + '://' + req.get('host'); // e.g. http://localhost:3000

    const formatted = results.map(task => ({
      ...task,
      location: task.location || '',
      user_location: task.user_location || '',
      latitude: task.latitude || null,
      longitude: task.longitude || null,
      progress_image: task.progress_image 
        ? `${baseUrl}/${task.progress_image.replace(/\\/g, '/')}` // Converts backslashes to slashes for Windows paths
        : null,
    }));

    res.json(formatted);
  });
};

exports.getAssignedTasks = (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT t.*,
      u1.username AS created_by_username,
      u2.username AS assigned_user_username
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
    WHERE t.assigned_user = ?
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching tasks' });
    if (results.length === 0) {
      return res.status(404).json({ message: 'No tasks found for this user' });
    }
    const formatted = results.map(task => ({
      ...task,
      location: task.location
    }));
    res.json(formatted);
  });
};

  // Update task status by assigned user
