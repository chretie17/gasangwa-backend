const db = require('../db');

exports.createContribution = (req, res) => {
  const { user_id, project_id, activity_type, quantity, date } = req.body;

  const query = `INSERT INTO community_contributions (user_id, project_id, activity_type, quantity, date) VALUES (?, ?, ?, ?, ?)`;
  db.query(query, [user_id, project_id, activity_type, quantity, date], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error adding contribution' });
    res.status(201).json({ message: 'Contribution added successfully', id: result.insertId });
  });
};

exports.getContributionsByUser = (req, res) => {
  const { user_id } = req.params;
  db.query('SELECT * FROM community_contributions WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching contributions' });
    res.status(200).json(results);
  });
};

exports.getContributionsByProject = (req, res) => {
  const { project_id } = req.params;
  db.query('SELECT * FROM community_contributions WHERE project_id = ?', [project_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching contributions' });
    res.status(200).json(results);
  });
};

exports.deleteContribution = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM community_contributions WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Error deleting contribution' });
    res.status(200).json({ message: 'Contribution deleted successfully' });
  });
};
