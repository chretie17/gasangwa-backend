// controllers/treeSpeciesController.js
const db = require('../db');

// Helpers to coerce incoming values
const toBool = v => (v === true || v === 'true' || v === 1 || v === '1') ? 1 : 0;
const toFloat = v => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : null;
const toNullish = v => (v === undefined || v === null || v === '') ? null : v;

// CREATE
exports.createTreeSpecies = (req, res) => {
  let {
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
    rwandan_name
  } = req.body;

  const query = `
    INSERT INTO tree_species
      (name, native, carbon_rate, soil_type, notes, image_path,
       growth_conditions, common_uses, planting_season,
       soil_improvement, environmental_impact, rwandan_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    name,
    toBool(native),
    toFloat(carbon_rate),
    toNullish(soil_type),
    toNullish(notes),
    toNullish(image_url),           // optional image URL
    toNullish(growth_conditions),
    toNullish(common_uses),
    toNullish(planting_season),
    toNullish(soil_improvement),
    toNullish(environmental_impact),
    toNullish(rwandan_name)         // optional local name
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting tree species:', err);
      return res.status(500).json({ message: 'Error adding tree species' });
    }
    res.status(201).json({ message: 'Tree species added', id: result.insertId });
  });
};

// READ ALL
exports.getAllTreeSpecies = (req, res) => {
  db.query('SELECT * FROM tree_species', (err, rows) => {
    if (err) {
      console.error('Error fetching species:', err);
      return res.status(500).json({ message: 'Error fetching tree species' });
    }
    res.json(rows);
  });
};

// UPDATE
exports.updateTreeSpecies = (req, res) => {
  const { id } = req.params;
  let {
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
    rwandan_name
  } = req.body;

  const query = `
    UPDATE tree_species
    SET name            = ?,
        native          = ?,
        carbon_rate     = ?,
        soil_type       = ?,
        notes           = ?,
        image_path      = ?,
        growth_conditions     = ?,
        common_uses     = ?,
        planting_season = ?,
        soil_improvement= ?,
        environmental_impact  = ?,
        rwandan_name    = ?
    WHERE id = ?
  `;

  const values = [
    name,
    toBool(native),
    toFloat(carbon_rate),
    toNullish(soil_type),
    toNullish(notes),
    toNullish(image_url),
    toNullish(growth_conditions),
    toNullish(common_uses),
    toNullish(planting_season),
    toNullish(soil_improvement),
    toNullish(environmental_impact),
    toNullish(rwandan_name),
    id
  ];

  db.query(query, values, (err) => {
    if (err) {
      console.error('Error updating species:', err);
      return res.status(500).json({ message: 'Error updating tree species' });
    }
    res.json({ message: 'Tree species updated' });
  });
};

// DELETE
exports.deleteTreeSpecies = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM tree_species WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting species:', err);
      return res.status(500).json({ message: 'Error deleting tree species' });
    }
    res.json({ message: 'Tree species deleted' });
  });
};
