import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL
});

/**
 * Upload document with real-time upload progress tracking
 * 
 * @param {File} file - PDF or Excel file object
 * @param {Function} onUploadProgress - Callback for upload percentage (0 - 100)
 * @returns {Promise<object>} - Response data
 */
export const uploadDocument = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onUploadProgress) {
          onUploadProgress(percentCompleted);
        }
      }
    }
  });

  return response.data;
};

/**
 * Get all tracked documents
 */
export const getDocuments = async () => {
  const response = await api.get('/api/documents');
  return response.data;
};

/**
 * Delete a document by ID
 */
export const deleteDocument = async (id) => {
  const response = await api.delete(`/api/documents/${id}`);
  return response.data;
};

/**
 * Send chat query (RAG + Groq Fallback)
 */
export const sendChatMessage = async ({ query, documentId, history }) => {
  const response = await api.post('/api/chat/message', {
    query,
    documentId,
    history
  });
  return response.data;
};

export default api;
