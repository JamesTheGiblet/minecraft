/**
 * @file This utility provides shared helper functions for object manipulation.
 */

/**
 * Safely navigates a dot-separated path in an object.
 * @param {object} obj - The object to navigate.
 * @param {string} path - A dot-separated path string (e.g., 'content.details.name').
 * @returns {*} The value at the path, or undefined if not found.
 */
const get = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

module.exports = { get };