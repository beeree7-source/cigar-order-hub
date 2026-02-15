/**
 * Distance Calculation Utilities
 * Common utilities for calculating distances using the Haversine formula
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
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
 * Convert miles to kilometers
 * @param {number} miles - Distance in miles
 * @returns {number} Distance in kilometers
 */
const milesToKilometers = (miles) => {
  return miles * 1.60934;
};

/**
 * Convert miles to meters
 * @param {number} miles - Distance in miles
 * @returns {number} Distance in meters
 */
const milesToMeters = (miles) => {
  return miles * 1609.34;
};

/**
 * Convert meters to miles
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in miles
 */
const metersToMiles = (meters) => {
  return meters / 1609.34;
};

module.exports = {
  calculateDistance,
  milesToKilometers,
  milesToMeters,
  metersToMiles
};
