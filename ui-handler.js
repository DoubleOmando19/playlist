/**
 * UI Handler - Shared Utilities and UI Management
 * ================================================
 * Provides common functionality for the photo and video editor:
 * - Navigation between sections
 * - Toast notifications
 * - File size formatting
 * - Error handling
 * - Loading states
 */

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'https://localhost:5000';

// ============================================================================
// Navigation Management
// ============================================================================

/**
 * Initialize navigation between photo and video sections
 */
function initNavigation() {
    const photoBtn = document.getElementById('nav-photo');
    const videoBtn = document.getElementById('nav-video');
    const photoSection = document.getElementById('photo-section');
    const videoSection = document.getElementById('video-section');

    photoBtn.addEventListener('click', () => {
        // Update button states
        photoBtn.classList.add('active');
        videoBtn.classList.remove('active');

        // Update section visibility
        photoSection.classList.add('active');
        photoSection.classList.remove('hidden');
        videoSection.classList.remove('active');
        videoSection.classList.add('hidden');

        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    videoBtn.addEventListener('click', () => {
        // Update button states
        videoBtn.classList.add('active');
        photoBtn.classList.remove('active');

        // Update section visibility
        videoSection.classList.add('active');
        videoSection.classList.remove('hidden');
        photoSection.classList.remove('active');
        photoSection.classList.add('hidden');

        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================================================
// Toast Notifications
// ============================================================================

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info'
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = '';
    if (type === 'success') {
        icon = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>`;
    } else if (type === 'error') {
        icon = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>`;
    } else {
        icon = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`;
    }

    toast.innerHTML = `
        ${icon}
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
    `;

    // Add to container
    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, duration);
}

// ============================================================================
// File Size Formatting
// ============================================================================

/**
 * Format file size in bytes to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// ============================================================================
// Loading State Management
// ============================================================================

/**
 * Show loading state for an element
 * @param {HTMLElement} element - Element to show loading state
 */
function showLoading(element) {
    element.classList.remove('hidden');
}

/**
 * Hide loading state for an element
 * @param {HTMLElement} element - Element to hide loading state
 */
function hideLoading(element) {
    element.classList.add('hidden');
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle API errors and display user-friendly messages
 * @param {Error|Object} error - Error object or response
 * @param {string} context - Context of the error (e.g., 'photo upload')
 */
function handleError(error, context = 'operation') {
    console.error(`Error during ${context}:`, error);

    let message = `Failed to ${context}. Please try again.`;

    // Extract error message from different error formats
    if (error.message) {
        message = error.message;
    } else if (error.error) {
        message = error.error;
    } else if (typeof error === 'string') {
        message = error;
    }

    showToast(message, 'error');
}

// ============================================================================
// API Request Helper
// ============================================================================

/**
 * Make an API request with error handling
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, options);

        // Check if response is ok
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // Return response for non-JSON (e.g., file downloads)
        return response;

    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Upload file to API
 * @param {string} endpoint - Upload endpoint
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Upload response
 */
async function uploadFile(endpoint, file, onProgress = null) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        // Progress tracking
        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });
        }

        // Load handler
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        });

        // Error handler
        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        // Abort handler
        xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
        });

        // Send request
        xhr.open('POST', `${API_BASE_URL}${endpoint}`);
        xhr.send(formData);
    });
}

// ============================================================================
// Drag and Drop Helper
// ============================================================================

/**
 * Setup drag and drop for a dropzone element
 * @param {HTMLElement} dropzone - Dropzone element
 * @param {Function} onFileDrop - Callback when file is dropped
 */
function setupDragAndDrop(dropzone, onFileDrop) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            onFileDrop(files[0]);
        }
    }, false);
}

/**
 * Prevent default drag behaviors
 * @param {Event} e - Event object
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/tiff', 'image/webp'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload a JPG, PNG, BMP, GIF, TIFF, or WebP image.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds 50MB limit. Your file is ${formatFileSize(file.size)}.`
        };
    }

    return { valid: true };
}

/**
 * Validate video file
 * @param {File} file - File to validate
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
function validateVideoFile(file) {
    const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-flv', 'video/x-ms-wmv'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload an MP4, AVI, MOV, MKV, WebM, FLV, or WMV video.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds 500MB limit. Your file is ${formatFileSize(file.size)}.`
        };
    }

    return { valid: true };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize UI handler when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    console.log('UI Handler initialized');
});

// ============================================================================
// Export functions for use in other modules
// ============================================================================

// Make functions available globally
window.UIHandler = {
    showToast,
    formatFileSize,
    formatDuration,
    showLoading,
    hideLoading,
    handleError,
    apiRequest,
    uploadFile,
    setupDragAndDrop,
    validateImageFile,
    validateVideoFile,
    API_BASE_URL
};
