/**
 * utils/ApiResponse.js — Standardised API success response wrapper.
 * RULES: All controllers must use this to send responses.
 */

class ApiResponse {
    /**
     * @param {number} statusCode - HTTP status code
     * @param {*} data - Response payload
     * @param {string} [message='Success'] - Human-readable message
     */
    constructor(statusCode, data, message = 'Success') {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}

export default ApiResponse;
