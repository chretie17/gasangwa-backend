// Add these functions to your task controller or create a new trees controller
const db = require('../db');  // Assuming you've set up MySQL connection

// Get all completed tree planting tasks with location data
exports.getPlantedTrees = (req, res) => {
  const query = `
    SELECT t.id, t.title, t.description, t.location, t.user_location,
           t.latitude, t.longitude, t.progress_image, t.updated_at,
           u1.username AS created_by_username,
           u2.username AS assigned_user_username,
           p.project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.status = 'Completed' 
      AND t.latitude IS NOT NULL 
      AND t.longitude IS NOT NULL
      AND (t.title LIKE '%tree%' OR t.title LIKE '%plant%' OR t.description LIKE '%tree%' OR t.description LIKE '%plant%')
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching planted trees:', err);
      return res.status(500).json({ message: 'Error fetching planted trees' });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    
    const formattedTrees = results.map(tree => ({
      ...tree,
      progress_image: tree.progress_image 
        ? `${baseUrl}/${tree.progress_image.replace(/\\/g, '/')}` 
        : null,
      planted_date: tree.updated_at ? new Date(tree.updated_at).toLocaleDateString() : null,
    }));

    res.status(200).json({
      success: true,
      count: formattedTrees.length,
      trees: formattedTrees
    });
  });
};

// Get trees by project
exports.getTreesByProject = (req, res) => {
  const { projectId } = req.params;
  
  const query = `
    SELECT t.id, t.title, t.description, t.location, t.user_location,
           t.latitude, t.longitude, t.progress_image, t.updated_at,
           u1.username AS created_by_username,
           u2.username AS assigned_user_username,
           p.project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.project_id = ? 
      AND t.status = 'Completed' 
      AND t.latitude IS NOT NULL 
      AND t.longitude IS NOT NULL
      AND (t.title LIKE '%tree%' OR t.title LIKE '%plant%' OR t.description LIKE '%tree%' OR t.description LIKE '%plant%')
  `;

  db.query(query, [projectId], (err, results) => {
    if (err) {
      console.error('Error fetching trees by project:', err);
      return res.status(500).json({ message: 'Error fetching trees by project' });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    
    const formattedTrees = results.map(tree => ({
      ...tree,
      progress_image: tree.progress_image 
        ? `${baseUrl}/${tree.progress_image.replace(/\\/g, '/')}` 
        : null,
      planted_date: tree.updated_at ? new Date(tree.updated_at).toLocaleDateString() : null,
    }));

    res.status(200).json({
      success: true,
      count: formattedTrees.length,
      project_name: results.length > 0 ? results[0].project_name : null,
      trees: formattedTrees
    });
  });
};

// Get tree statistics
exports.getTreeStatistics = (req, res) => {
  const queries = {
    totalTrees: `
      SELECT COUNT(*) as total
      FROM tasks 
      WHERE status = 'Completed' 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (title LIKE '%tree%' OR title LIKE '%plant%' OR description LIKE '%tree%' OR description LIKE '%plant%')
    `,
    treesByProject: `
      SELECT p.project_name, COUNT(t.id) as tree_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status = 'Completed' 
        AND t.latitude IS NOT NULL 
        AND t.longitude IS NOT NULL
        AND (t.title LIKE '%tree%' OR t.title LIKE '%plant%' OR t.description LIKE '%tree%' OR t.description LIKE '%plant%')
      GROUP BY p.id, p.project_name
      ORDER BY tree_count DESC
    `,
    recentTrees: `
      SELECT COUNT(*) as recent_count
      FROM tasks 
      WHERE status = 'Completed' 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (title LIKE '%tree%' OR title LIKE '%plant%' OR description LIKE '%tree%' OR description LIKE '%plant%')
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `
  };

  // Execute all queries
  const executeQuery = (query) => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  Promise.all([
    executeQuery(queries.totalTrees),
    executeQuery(queries.treesByProject),
    executeQuery(queries.recentTrees)
  ])
  .then(([totalResult, projectResult, recentResult]) => {
    res.status(200).json({
      success: true,
      statistics: {
        total_trees: totalResult[0].total,
        recent_trees: recentResult[0].recent_count,
        trees_by_project: projectResult
      }
    });
  })
  .catch(err => {
    console.error('Error fetching tree statistics:', err);
    res.status(500).json({ message: 'Error fetching tree statistics' });
  });
};

// Get trees within a radius (for location-based filtering)
exports.getTreesInRadius = (req, res) => {
  const { latitude, longitude, radius = 10 } = req.query; // radius in kilometers

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  const query = `
    SELECT t.id, t.title, t.description, t.location, t.user_location,
           t.latitude, t.longitude, t.progress_image, t.updated_at,
           u1.username AS created_by_username,
           u2.username AS assigned_user_username,
           p.project_name,
           (6371 * acos(
             cos(radians(?)) * cos(radians(t.latitude)) * 
             cos(radians(t.longitude) - radians(?)) + 
             sin(radians(?)) * sin(radians(t.latitude))
           )) AS distance_km
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_user = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.status = 'Completed' 
      AND t.latitude IS NOT NULL 
      AND t.longitude IS NOT NULL
      AND (t.title LIKE '%tree%' OR t.title LIKE '%plant%' OR t.description LIKE '%tree%' OR t.description LIKE '%plant%')
    HAVING distance_km <= ?
    ORDER BY distance_km
  `;

  db.query(query, [latitude, longitude, latitude, radius], (err, results) => {
    if (err) {
      console.error('Error fetching trees in radius:', err);
      return res.status(500).json({ message: 'Error fetching trees in radius' });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    
    const formattedTrees = results.map(tree => ({
      ...tree,
      progress_image: tree.progress_image 
        ? `${baseUrl}/${tree.progress_image.replace(/\\/g, '/')}` 
        : null,
      planted_date: tree.updated_at ? new Date(tree.updated_at).toLocaleDateString() : null,
      distance_km: parseFloat(tree.distance_km).toFixed(2)
    }));

    res.status(200).json({
      success: true,
      count: formattedTrees.length,
      center: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      radius: parseFloat(radius),
      trees: formattedTrees
    });
  });
};