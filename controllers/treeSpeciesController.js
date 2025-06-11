const db = require('../db');

// Create a new tree species with image URL and other additional info
exports.createTreeSpecies = (req, res) => {
  const { name, native, carbon_rate, soil_type, notes, image_url, growth_conditions, common_uses, planting_season, soil_improvement, environmental_impact } = req.body;

  const query = `
    INSERT INTO tree_species 
    (name, native, carbon_rate, soil_type, notes, image_path, growth_conditions, common_uses, planting_season, soil_improvement, environmental_impact,rwandan_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    name,
    native,
    carbon_rate,
    soil_type,
    notes,
    image_url,  // This will store the image URL
    growth_conditions,
    common_uses,
    planting_season,
    soil_improvement,
    environmental_impact,
   rwandan_name,
  ];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error adding tree species' });
    res.status(201).json({ message: 'Tree species added successfully', id: result.insertId });
  });
};

// Get all tree species
exports.getAllTreeSpecies = (req, res) => {
  db.query('SELECT * FROM tree_species', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching tree species' });
    res.status(200).json(results);
  });
};

// Update tree species details
exports.updateTreeSpecies = (req, res) => {
  const { id } = req.params;
  const { name, native, carbon_rate, soil_type, notes, image_url, growth_conditions, common_uses, planting_season, soil_improvement, environmental_impact,rwandan_name } = req.body;

  const query = `
    UPDATE tree_species 
    SET name = ?, native = ?, carbon_rate = ?, soil_type = ?, notes = ?, image_path = ?, growth_conditions = ?, common_uses = ?, planting_season = ?, soil_improvement = ?, environmental_impact = ?, rwandan_name = ?
    WHERE id = ?
  `;
  const values = [
    name,
    native,
    carbon_rate,
    soil_type,
    notes,
    image_url,
    growth_conditions,
    common_uses,
    planting_season,
    soil_improvement,
    environmental_impact,
    rwandan_name,
    id
  ];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error updating tree species' });
    res.status(200).json({ message: 'Tree species updated successfully' });
  });
};

// Delete a tree species
exports.deleteTreeSpecies = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM tree_species WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Error deleting tree species' });
    res.status(200).json({ message: 'Tree species deleted successfully' });
  });
};
