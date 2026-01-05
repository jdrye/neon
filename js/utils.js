/**
 * Utility functions for the Neon project
 */

/**
 * Clamps a value between a minimum and maximum
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} a - The start value
 * @param {number} b - The end value
 * @param {number} t - The interpolation factor (0 to 1)
 * @returns {number} The interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} The escaped HTML text
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Formats time in milliseconds as a clock string (HH:MM:SS)
 * @param {number} milliseconds - The time in milliseconds
 * @returns {string} The formatted clock string
 */
export function formatClock(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats a time value with optional unit suffix
 * @param {number} time - The time value
 * @param {string} unit - The unit of time (e.g., 'ms', 's', 'min', 'h')
 * @returns {string} The formatted time string
 */
export function formatTime(time, unit = 'ms') {
  return `${time}${unit}`;
}

/**
 * Generates a random color in hexadecimal format
 * @returns {string} A random color in #RRGGBB format
 */
export function randomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Generates a random ID string
 * @param {number} length - The length of the ID (default: 8)
 * @returns {string} A random ID string
 */
export function randomId(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
