const db = require('./database');

/**
 * Location Service
 * Handles GPS tracking, route calculation, geofencing, and distance calculation
 */

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
};

/**
 * Log location point
 */
const trackLocation = (req, res) => {
  const { sales_rep_id, check_in_id, latitude, longitude, address, accuracy } = req.body;

  const query = `
    INSERT INTO location_tracking (
      sales_rep_id, check_in_id, latitude, longitude, address, accuracy
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [sales_rep_id, check_in_id, latitude, longitude, address, accuracy], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Location tracked successfully',
      location_id: this.lastID,
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Get today's route
 */
const getTodayRoute = (req, res) => {
  const { sales_rep_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT lt.*
    FROM location_tracking lt
    LEFT JOIN daily_check_ins dci ON lt.check_in_id = dci.id
    WHERE lt.sales_rep_id = ? 
    AND (dci.check_in_date = ? OR DATE(lt.timestamp) = ?)
    ORDER BY lt.timestamp ASC
  `;

  db.all(query, [sales_rep_id, today, today], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < rows.length; i++) {
      const distance = calculateDistance(
        rows[i-1].latitude, rows[i-1].longitude,
        rows[i].latitude, rows[i].longitude
      );
      totalDistance += distance;
    }

    res.json({ 
      locations: rows,
      total_distance_miles: parseFloat(totalDistance.toFixed(2)),
      point_count: rows.length
    });
  });
};

/**
 * Get location history
 */
const getLocationHistory = (req, res) => {
  const { sales_rep_id } = req.params;
  const { start_date, end_date, limit = 1000, offset = 0 } = req.query;

  let query = `
    SELECT * FROM location_tracking 
    WHERE sales_rep_id = ?
  `;
  const params = [sales_rep_id];

  if (start_date) {
    query += ` AND timestamp >= ?`;
    params.push(start_date);
  }
  if (end_date) {
    query += ` AND timestamp <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get full route with map data
 */
const getRoute = (req, res) => {
  const { sales_rep_id } = req.params;
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const query = `
    SELECT lt.*, dci.check_in_date, dci.check_in_time, dci.check_out_time
    FROM location_tracking lt
    LEFT JOIN daily_check_ins dci ON lt.check_in_id = dci.id
    WHERE lt.sales_rep_id = ? 
    AND (dci.check_in_date = ? OR DATE(lt.timestamp) = ?)
    ORDER BY lt.timestamp ASC
  `;

  db.all(query, [sales_rep_id, targetDate, targetDate], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate route statistics
    let totalDistance = 0;
    const segments = [];
    
    for (let i = 1; i < rows.length; i++) {
      const distance = calculateDistance(
        rows[i-1].latitude, rows[i-1].longitude,
        rows[i].latitude, rows[i].longitude
      );
      totalDistance += distance;
      
      segments.push({
        from: { lat: rows[i-1].latitude, lng: rows[i-1].longitude },
        to: { lat: rows[i].latitude, lng: rows[i].longitude },
        distance_miles: parseFloat(distance.toFixed(2)),
        timestamp: rows[i].timestamp
      });
    }

    res.json({ 
      date: targetDate,
      locations: rows,
      segments,
      total_distance_miles: parseFloat(totalDistance.toFixed(2)),
      point_count: rows.length,
      start_time: rows[0]?.timestamp,
      end_time: rows[rows.length - 1]?.timestamp
    });
  });
};

/**
 * Start trip
 */
const startTrip = (req, res) => {
  const { sales_rep_id, check_in_id, latitude, longitude, address } = req.body;

  const query = `
    INSERT INTO location_tracking (
      sales_rep_id, check_in_id, latitude, longitude, address, 
      trip_start, miles_traveled
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
  `;

  db.run(query, [sales_rep_id, check_in_id, latitude, longitude, address], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Trip started',
      trip_id: this.lastID,
      start_time: new Date().toISOString()
    });
  });
};

/**
 * End trip
 */
const endTrip = (req, res) => {
  const { trip_id, latitude, longitude } = req.body;

  // Get the starting location
  db.get('SELECT * FROM location_tracking WHERE id = ?', [trip_id], (err, startLocation) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!startLocation) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Calculate distance
    const distance = calculateDistance(
      startLocation.latitude, startLocation.longitude,
      latitude, longitude
    );

    const query = `
      UPDATE location_tracking 
      SET trip_end = CURRENT_TIMESTAMP,
          miles_traveled = ?
      WHERE id = ?
    `;

    db.run(query, [distance, trip_id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        message: 'Trip ended',
        end_time: new Date().toISOString(),
        miles_traveled: parseFloat(distance.toFixed(2))
      });
    });
  });
};

/**
 * Check if location is within geofence of an account
 */
const checkGeofence = (req, res) => {
  const { latitude, longitude, account_id, radius = 100 } = req.query; // radius in meters (default 100m)

  // First, get the account's location from recent visits
  const query = `
    SELECT location_latitude, location_longitude 
    FROM account_visits 
    WHERE account_id = ? 
    AND location_latitude IS NOT NULL 
    AND location_longitude IS NOT NULL
    ORDER BY visit_date DESC 
    LIMIT 1
  `;

  db.get(query, [account_id], (err, accountLocation) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!accountLocation) {
      return res.json({ 
        within_geofence: false, 
        message: 'No location data for this account' 
      });
    }

    // Calculate distance in meters (convert from miles)
    const distanceMiles = calculateDistance(
      parseFloat(latitude), parseFloat(longitude),
      accountLocation.location_latitude, accountLocation.location_longitude
    );
    const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

    res.json({
      within_geofence: distanceMeters <= radius,
      distance_meters: parseFloat(distanceMeters.toFixed(2)),
      distance_miles: parseFloat(distanceMiles.toFixed(4)),
      account_location: {
        latitude: accountLocation.location_latitude,
        longitude: accountLocation.location_longitude
      }
    });
  });
};

/**
 * Get distance between two points
 */
const getDistance = (req, res) => {
  const { lat1, lon1, lat2, lon2 } = req.query;

  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const distance = calculateDistance(
    parseFloat(lat1), parseFloat(lon1),
    parseFloat(lat2), parseFloat(lon2)
  );

  res.json({
    distance_miles: parseFloat(distance.toFixed(2)),
    distance_kilometers: parseFloat((distance * 1.60934).toFixed(2)),
    distance_meters: parseFloat((distance * 1609.34).toFixed(2))
  });
};

/**
 * Get nearby accounts based on current location
 */
const getNearbyAccounts = (req, res) => {
  const { sales_rep_id, latitude, longitude, radius_miles = 10 } = req.query;

  // Get all authorized accounts with their last known locations
  const query = `
    SELECT DISTINCT
      raa.account_id,
      u.name,
      u.email,
      av.location_latitude,
      av.location_longitude,
      MAX(av.visit_date) as last_visit_date
    FROM rep_authorized_accounts raa
    JOIN users u ON raa.account_id = u.id
    LEFT JOIN account_visits av ON raa.account_id = av.account_id
    WHERE raa.sales_rep_id = ? 
    AND raa.is_active = 1
    AND av.location_latitude IS NOT NULL
    GROUP BY raa.account_id
  `;

  db.all(query, [sales_rep_id], (err, accounts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate distances and filter by radius
    const nearbyAccounts = accounts
      .map(account => {
        if (!account.location_latitude || !account.location_longitude) {
          return null;
        }
        
        const distance = calculateDistance(
          parseFloat(latitude), parseFloat(longitude),
          account.location_latitude, account.location_longitude
        );

        return {
          ...account,
          distance_miles: parseFloat(distance.toFixed(2))
        };
      })
      .filter(account => account && account.distance_miles <= parseFloat(radius_miles))
      .sort((a, b) => a.distance_miles - b.distance_miles);

    res.json({
      current_location: { latitude, longitude },
      radius_miles: parseFloat(radius_miles),
      nearby_accounts: nearbyAccounts,
      count: nearbyAccounts.length
    });
  });
};

module.exports = {
  trackLocation,
  getTodayRoute,
  getLocationHistory,
  getRoute,
  startTrip,
  endTrip,
  checkGeofence,
  getDistance,
  getNearbyAccounts,
  calculateDistance // Export for use in other services
};
