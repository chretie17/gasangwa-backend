// controllers/treeSpeciesController.js
const db = require('../db');

exports.createTreeSpecies = (req, res) => {
  const { name, native, carbon_rate, soil_type, notes } = req.body;

  const query = `INSERT INTO tree_species (name, native, carbon_rate, soil_type, notes) VALUES (?, ?, ?, ?, ?)`;
  db.query(query, [name, native, carbon_rate, soil_type, notes], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error adding tree species' });
    res.status(201).json({ message: 'Tree species added successfully', id: result.insertId });
  });
};

exports.getAllTreeSpecies = (req, res) => {
  db.query('SELECT * FROM tree_species', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching tree species' });
    res.status(200).json(results);
  });
};

exports.updateTreeSpecies = (req, res) => {
  const { id } = req.params;
  const { name, native, carbon_rate, soil_type, notes } = req.body;

  const query = `UPDATE tree_species SET name = ?, native = ?, carbon_rate = ?, soil_type = ?, notes = ? WHERE id = ?`;
  db.query(query, [name, native, carbon_rate, soil_type, notes, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error updating tree species' });
    res.status(200).json({ message: 'Tree species updated successfully' });
  });
};

exports.deleteTreeSpecies = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM tree_species WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Error deleting tree species' });
    res.status(200).json({ message: 'Tree species deleted successfully' });
  });
};