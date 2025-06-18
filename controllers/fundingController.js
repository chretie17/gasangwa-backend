const db = require('../db');

// Enhanced error handling and validation
const validateProjectExists = (projectId, callback) => {
  const query = 'SELECT id, project_name, status FROM projects WHERE id = ?';
  db.query(query, [projectId], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(new Error('Project not found'));
    callback(null, results[0]);
  });
};

// Calculate carbon credits based on project outcomes (trees planted, area covered, etc.)
const calculateCarbonCredits = (projectData) => {
  // Standard calculation: 1 tree ≈ 0.05 metric tons CO2 over 20 years
  // 1 metric ton CO2 = 1 carbon credit
  const treesPlanted = projectData.trees_planted || 0;
  const areaRestored = projectData.area_hectares || 0;
  
  // Different calculation methods
  const creditsFromTrees = treesPlanted * 0.05; // 0.05 credits per tree
  const creditsFromArea = areaRestored * 3.67; // ~3.67 credits per hectare (forest avg)
  
  return Math.max(creditsFromTrees, creditsFromArea);
};

// Issue carbon credits with automatic calculation and verification
exports.issueCredits = (req, res) => {
  const { project_id, quantity, note, auto_calculate, verification_status } = req.body;
  
  if (!project_id) {
    return res.status(400).json({ message: 'project_id is required' });
  }

  validateProjectExists(project_id, (err, project) => {
    if (err) return res.status(400).json({ message: err.message });

    let finalQuantity = quantity;

    // Auto-calculate credits based on project data if requested
    if (auto_calculate && !quantity) {
      const query = `
        SELECT 
          COUNT(*) as trees_planted,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
        FROM project_tasks 
        WHERE project_id = ?
      `;
      
      db.query(query, [project_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error calculating credits' });
        
        const projectData = { trees_planted: results[0]?.trees_planted || 0 };
        finalQuantity = Math.floor(calculateCarbonCredits(projectData));
        
        insertCreditRecord(project_id, finalQuantity, note, verification_status || 'pending', res);
      });
    } else if (!quantity) {
      return res.status(400).json({ message: 'quantity is required when auto_calculate is false' });
    } else {
      insertCreditRecord(project_id, finalQuantity, note, verification_status || 'pending', res);
    }
  });
};

const insertCreditRecord = (project_id, quantity, note, verification_status, res) => {
  const query = `
    INSERT INTO project_funding 
      (project_id, type, quantity, amount, note, verification_status, credit_standard, vintage_year)
    VALUES (?, 'carbon_issue', ?, 0, ?, ?, 'VCS', YEAR(CURDATE()))
  `;
  
  db.query(query, [project_id, quantity, note || null, verification_status], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error issuing credits' });
    
    // Update project carbon credit balance
    updateCreditBalance(project_id, quantity, 'add');
    
    res.status(201).json({ 
      message: 'Credits issued successfully',
      credit_id: result.insertId,
      quantity: quantity,
      verification_status: verification_status
    });
  });
};

// Enhanced credit selling with marketplace integration
exports.sellCredits = (req, res) => {
  const { project_id, quantity, amount, note, buyer_info, platform, price_per_credit } = req.body;
  
  if (!project_id || !quantity || !amount) {
    return res.status(400).json({ message: 'project_id, quantity and amount are required' });
  }

  // Check available credit balance
  const balanceQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'carbon_issue' THEN quantity ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'carbon_sale' THEN quantity ELSE 0 END), 0) as available_credits
    FROM project_funding 
    WHERE project_id = ?
  `;

  db.query(balanceQuery, [project_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error checking credit balance' });
    
    const availableCredits = results[0]?.available_credits || 0;
    if (availableCredits < quantity) {
      return res.status(400).json({ 
        message: `Insufficient credits. Available: ${availableCredits}, Requested: ${quantity}` 
      });
    }

    const query = `
      INSERT INTO project_funding 
        (project_id, type, quantity, amount, note, buyer_info, platform, price_per_credit, transaction_status)
      VALUES (?, 'carbon_sale', ?, ?, ?, ?, ?, ?, 'completed')
    `;
    
    db.query(query, [
      project_id, 
      quantity, 
      amount, 
      note || null, 
      JSON.stringify(buyer_info) || null,
      platform || 'direct',
      price_per_credit || (amount / quantity)
    ], (err, result) => {
      if (err) return res.status(500).json({ message: 'Error recording sale' });
      
      updateCreditBalance(project_id, quantity, 'subtract');
      
      res.status(201).json({ 
        message: 'Sale recorded successfully',
        transaction_id: result.insertId,
        remaining_credits: availableCredits - quantity
      });
    });
  });
};

// Enhanced donation system with campaign support
exports.donate = (req, res) => {
  const { project_id, amount, donor_name, donor_email, note, campaign_id, is_recurring, donor_type } = req.body;
  
  if (!project_id || !amount) {
    return res.status(400).json({ message: 'project_id and amount are required' });
  }

  const query = `
    INSERT INTO project_funding 
      (project_id, type, quantity, amount, donor_name, donor_email, note, campaign_id, is_recurring, donor_type, donation_status)
    VALUES (?, 'donation', NULL, ?, ?, ?, ?, ?, ?, ?, 'received')
  `;
  
  db.query(query, [
    project_id, 
    amount, 
    donor_name || 'Anonymous', 
    donor_email || null,
    note || null,
    campaign_id || null,
    is_recurring || false,
    donor_type || 'individual'
  ], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error recording donation' });
    
    // Send thank you email if email provided
    if (donor_email) {
      sendThankYouEmail(donor_email, donor_name, amount, project_id);
    }
    
    res.status(201).json({ 
      message: 'Donation recorded successfully',
      donation_id: result.insertId,
      receipt_number: `DON-${result.insertId}-${Date.now()}`
    });
  });
};

// Create crowdfunding campaigns
exports.createCampaign = (req, res) => {
  const { 
    project_id, 
    campaign_name, 
    target_amount, 
    description, 
    end_date, 
    reward_tiers 
  } = req.body;

  if (!project_id || !campaign_name || !target_amount) {
    return res.status(400).json({ message: 'project_id, campaign_name, and target_amount are required' });
  }

  const query = `
    INSERT INTO funding_campaigns 
      (project_id, campaign_name, target_amount, current_amount, description, end_date, reward_tiers, status)
    VALUES (?, ?, ?, 0, ?, ?, ?, 'active')
  `;

  db.query(query, [
    project_id,
    campaign_name,
    target_amount,
    description || null,
    end_date || null,
    JSON.stringify(reward_tiers) || null
  ], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error creating campaign' });
    
    res.status(201).json({
      message: 'Campaign created successfully',
      campaign_id: result.insertId
    });
  });
};

// Get campaign details with progress
exports.getCampaign = (req, res) => {
  const { campaignId } = req.params;
  
  const query = `
    SELECT 
      c.*,
      p.project_name,
      COALESCE(SUM(pf.amount), 0) as current_amount,
      COUNT(pf.id) as donor_count,
      ((COALESCE(SUM(pf.amount), 0) / c.target_amount) * 100) as progress_percentage
    FROM funding_campaigns c
    LEFT JOIN projects p ON c.project_id = p.id
    LEFT JOIN project_funding pf ON c.project_id = pf.project_id 
      AND pf.type = 'donation' 
      AND pf.campaign_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `;

  db.query(query, [campaignId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching campaign' });
    if (results.length === 0) return res.status(404).json({ message: 'Campaign not found' });
    
    res.json(results[0]);
  });
};

// Get comprehensive project funding summary
exports.getProjectFunding = (req, res) => {
  const { projectId } = req.params;
  
  const query = `
    SELECT 
      pf.*,
      p.project_name,
      CASE 
        WHEN pf.type = 'carbon_issue' THEN 'Credits Issued'
        WHEN pf.type = 'carbon_sale' THEN 'Credits Sold'
        WHEN pf.type = 'donation' THEN 'Donation Received'
        ELSE pf.type
      END as type_display
    FROM project_funding pf
    LEFT JOIN projects p ON pf.project_id = p.id
    WHERE pf.project_id = ?
    ORDER BY pf.created_at DESC
  `;

  db.query(query, [projectId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching funding data' });
    
    // Calculate summary statistics
    const summary = {
      total_credits_issued: 0,
      total_credits_sold: 0,
      available_credits: 0,
      total_revenue: 0,
      total_donations: 0,
      donor_count: 0
    };

    results.forEach(row => {
      if (row.type === 'carbon_issue') {
        summary.total_credits_issued += row.quantity || 0;
      } else if (row.type === 'carbon_sale') {
        summary.total_credits_sold += row.quantity || 0;
        summary.total_revenue += row.amount || 0;
      } else if (row.type === 'donation') {
        summary.total_donations += row.amount || 0;
        summary.donor_count += 1;
      }
    });

    summary.available_credits = summary.total_credits_issued - summary.total_credits_sold;

    res.json({
      transactions: results,
      summary: summary
    });
  });
};

// Get marketplace pricing data
exports.getMarketPricing = (req, res) => {
  const query = `
    SELECT 
      AVG(price_per_credit) as avg_price,
      MIN(price_per_credit) as min_price,
      MAX(price_per_credit) as max_price,
      COUNT(*) as transaction_count,
      DATE(created_at) as date
    FROM project_funding 
    WHERE type = 'carbon_sale' 
      AND price_per_credit > 0 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching market data' });
    res.json(results);
  });
};

// Utility functions
const updateCreditBalance = (projectId, quantity, operation) => {
  // This would update a project_balances table or cache
  console.log(`${operation} ${quantity} credits for project ${projectId}`);
};

const sendThankYouEmail = (email, name, amount, projectId) => {
  // Integration with email service (SendGrid, AWS SES, etc.)
  console.log(`Sending thank you email to ${email} for $${amount} donation to project ${projectId}`);
};

// Verification and compliance
exports.verifyCredits = (req, res) => {
  const { credit_id, verification_body, verification_document } = req.body;
  
  const query = `
    UPDATE project_funding 
    SET verification_status = 'verified',
        verification_body = ?,
        verification_document = ?,
        verified_at = NOW()
    WHERE id = ? AND type = 'carbon_issue'
  `;

  db.query(query, [verification_body, verification_document, credit_id], (err) => {
    if (err) return res.status(500).json({ message: 'Error updating verification status' });
    res.json({ message: 'Credits verified successfully' });
  });
};
exports.listCampaigns = (req, res) => {
  // optional projectId filtering, but defaults to all
  const projectId = req.query.projectId;
  let sql = `
    SELECT 
      id,
      project_id,
      campaign_name,
      target_amount,
      current_amount,
      end_date,
      status
    FROM funding_campaigns
    WHERE status = 'active'
  `;
  const params = [];

  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching campaigns' });
    res.json(results);
  });
};