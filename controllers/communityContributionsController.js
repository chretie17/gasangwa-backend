const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// Create multer upload middleware
const upload = multer({ storage: storage }).single('picture');

// Add new community contribution
exports.addContribution = (req, res) => {
  // Use upload as middleware first
  upload(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(500).json({ message: 'Error uploading image', error: err.message });
    }

    // Extract data from req.body
    const userId = req.body.user_id;
    const { 
      contribution_type, 
      action, 
      tree_species_id, 
      quantity, 
      location, 
      date, 
      survival_rate, 
      frequency, 
      notes ,
      status
    } = req.body;

    // Validate required fields
    if (!userId || !contribution_type || !action || !tree_species_id || !quantity || !location || !date || !status) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        received: req.body
      });
    }

    // Handle image URL
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Insert the contribution data into the database
    const query = `
      INSERT INTO community_contributions 
      (user_id, contribution_type, action, tree_species_id, quantity, location, date, survival_rate, frequency, notes, picture, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      userId, 
      contribution_type, 
      action, 
      tree_species_id, 
      quantity, 
      location, 
      date, 
      survival_rate || null, 
      frequency || null, 
      notes || null, 
      imageUrl
      , status || 'Pending' // Default status if not provided
    ];

    console.log('Inserting values:', values); // Debug log

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          message: 'Error adding contribution',
          error: err.message 
        });
      }
      
      // Return the created contribution with its ID
      res.status(201).json({ 
        message: 'Contribution added successfully', 
        contributionId: result.insertId,
        data: {
          id: result.insertId,
          user_id: userId,
          contribution_type,
          action,
          tree_species_id,
          quantity,
          location,
          date,
          survival_rate,
          frequency,
          notes,
          picture: imageUrl
          , status
        }
      });
    });
  });
};

// Get all contributions of a specific user
exports.getUserContributions = (req, res) => {
  const userId = req.params.userId;

  const query = `SELECT * FROM community_contributions WHERE user_id = ? ORDER BY date DESC`;
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching contributions:', err);
      return res.status(500).json({ message: 'Error fetching contributions' });
    }
    res.status(200).json(results);
  });
};

// Get all tree planting contributions by date
exports.getTreePlantingContributionsByDate = (req, res) => {
  const date = req.params.date;

  const query = `SELECT * FROM community_contributions WHERE contribution_type = 'Planting' AND date = ?`;
  db.query(query, [date], (err, results) => {
    if (err) {
      console.error('Error fetching tree planting contributions:', err);
      return res.status(500).json({ message: 'Error fetching tree planting contributions' });
    }
    res.status(200).json(results);
  });
};

// Get total number of trees planted by a specific user
exports.getTotalTreesPlanted = (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT SUM(quantity) AS total_trees_planted 
    FROM community_contributions 
    WHERE user_id = ? AND contribution_type = 'Planting'
  `;
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching total trees planted:', err);
      return res.status(500).json({ message: 'Error fetching total trees planted' });
    }
    res.status(200).json(result[0]);
  });
};

// Update maintenance frequency for a specific contribution
exports.updateMaintenanceFrequency = (req, res) => {
  const { contributionId, frequency } = req.body;

  const query = `UPDATE community_contributions SET frequency = ? WHERE id = ?`;
  db.query(query, [frequency, contributionId], (err, result) => {
    if (err) {
      console.error('Error updating maintenance frequency:', err);
      return res.status(500).json({ message: 'Error updating maintenance frequency' });
    }
    res.status(200).json({ message: 'Maintenance frequency updated successfully' });
  });
};
// Controller: contributionsController.js
exports.getAllContributions = (req, res) => {
  const query = 'SELECT * FROM community_contributions'; // Example query

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching contributions:', err);
      return res.status(500).json({ message: 'Error fetching contributions' });
    }
    res.status(200).json(results);
  });
};
exports.updateStatus = (req, res) => {
  const { id } = req.params; // Get the contribution ID from the URL
  const { status } = req.body; // Get the status from the request body

  // Validate status (e.g., 'pending', 'verified', 'rejected')
  if (!['pending', 'verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // SQL query to update the status of the contribution
  const query = `UPDATE community_contributions SET status = ? WHERE id = ?`;

  db.query(query, [status, id], (err, result) => {
    if (err) {
      console.error('Error updating status:', err);
      return res.status(500).json({ message: 'Error updating status' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    res.status(200).json({ message: 'Status updated successfully' });
  });
};
