// frontend/src/services/eventService.js
import api from './api';

/**
 * Service for handling event-related API requests
 */
export const eventService = {
  /**
   * Get all events
   * @returns {Promise<Array>} Array of events
   */
  getEvents: async () => {
    try {
      const response = await api.get('/events');
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  /**
   * Get events recommended for the current user
   * @returns {Promise<Array>} Array of recommended events
   */
  getRecommendedEvents: async () => {
    try {
      const response = await api.get('/events/recommended');
      return response.data;
    } catch (error) {
      console.error('Error fetching recommended events:', error);
      throw error;
    }
  },

  /**
   * Get details of a specific event
   * @param {string} id - Event ID
   * @returns {Promise<Object>} Event details
   */
  getEventDetails: async (id) => {
    try {
      const response = await api.get(`/events/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  createEvent: async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  /**
   * Update an existing event
   * @param {string} id - Event ID
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Updated event
   */
  updateEvent: async (id, eventData) => {
    try {
      const response = await api.put(`/events/${id}`, eventData);
      return response.data;
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete an event
   * @param {string} id - Event ID
   * @returns {Promise<Object>} Response data
   */
  deleteEvent: async (id) => {
    try {
      const response = await api.delete(`/events/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Register current user for an event
   * @param {string} id - Event ID
   * @returns {Promise<Object>} Response data
   */
  registerForEvent: async (id) => {
    try {
      const response = await api.post(`/events/${id}/register`);
      return response.data;
    } catch (error) {
      console.error(`Error registering for event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cancel registration for an event
   * @param {string} id - Event ID
   * @returns {Promise<Object>} Response data
   */
  cancelRegistration: async (id) => {
    try {
      const response = await api.delete(`/events/${id}/register`);
      return response.data;
    } catch (error) {
      console.error(`Error canceling registration for event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Share an event with specified groups
   * @param {string} id - Event ID
   * @param {Array<string>} groupIds - Array of group IDs to share with
   * @returns {Promise<Object>} Response data
   */
  shareEvent: async (id, groupIds) => {
    try {
      const response = await api.post(`/events/${id}/share`, { groupIds });
      return response.data;
    } catch (error) {
      console.error(`Error sharing event ${id}:`, error);
      throw error;
    }
  }
};

export default eventService;
