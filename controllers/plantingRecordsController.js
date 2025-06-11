
const db = require('../db');

exports.createPlantingRecord = (req, res) => {
  const { project_id, species_id, user_id, quantity, location_details, date_planted, survival_rate } = req.body;

  const query = `INSERT INTO planting_records (project_id, species_id, user_id, quantity, location_details, date_planted, survival_rate) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(query, [project_id, species_id, user_id, quantity, location_details, date_planted, survival_rate], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error adding planting record' });
    res.status(201).json({ message: 'Planting record added successfully', id: result.insertId });
  });
};

exports.getPlantingRecordsByProject = (req, res) => {
  const { project_id } = req.params;
  db.query('SELECT * FROM planting_records WHERE project_id = ?', [project_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching records' });
    res.status(200).json(results);
  });
};

exports.getPlantingRecordsByUser = (req, res) => {
  const { user_id } = req.params;
  db.query('SELECT * FROM planting_records WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching records' });
    res.status(200).json(results);
  });
};

exports.deletePlantingRecord = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM planting_records WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Error deleting record' });
    res.status(200).json({ message: 'Record deleted successfully' });
  });
};