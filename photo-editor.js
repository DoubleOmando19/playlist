/**
 * Photo Editor Module
 * ====================
 * Handles photo editing functionality:
 * - Drag and drop file upload
 * - Photo preview
 * - Effect controls (filters and enhancers)
 * - API integration for photo processing
 * - Download processed photos
 */

// ============================================================================
// State Management
// ============================================================================

const photoState = {
    uploadId: null,
    jobId: null,
    originalFile: null,
    currentEffects: {
        filter: '',
        brightness: 1.0,
        contrast: 1.0,
        color: 1.0,
        sharpness: 1.0
    }
};

// ============================================================================
// DOM Elements
// ============================================================================

let photoElements = {};

/**
 * Initialize DOM element references
 */
function initPhotoElements() {
    photoElements = {
        // Upload elements
        dropzone: document.getElementById('photo-dropzone'),
        fileInput: document.getElementById('photo-file-input'),
        
        // Preview elements
        previewContainer: document.getElementById('photo-preview-container'),
        preview: document.getElementById('photo-preview'),
        info: document.getElementById('photo-info'),
        removeBtn: document.getElementById('photo-remove'),
        
        // Control elements
        filterSelect: document.getElementById('photo-filter'),
        brightnessSlider: document.getElementById('photo-brightness'),
        brightnessValue: document.getElementById('brightness-value'),
        contrastSlider: document.getElementById('photo-contrast'),
        contrastValue: document.getElementById('contrast-value'),
        colorSlider: document.getElementById('photo-color'),
        colorValue: document.getElementById('color-value'),
        sharpnessSlider: document.getElementById('photo-sharpness'),
        sharpnessValue: document.getElementById('sharpness-value'),
        
        // Action buttons
        processBtn: document.getElementById('photo-process-btn'),
        resetBtn: document.getElementById('photo-reset-btn'),
        
        // Status elements
        processingSection: document.getElementById('photo-processing'),
        downloadSection: document.getElementById('photo-download'),
        downloadBtn: document.getElementById('photo-download-btn')
    };
}

// ============================================================================
// File Upload Handling
// ============================================================================

/**
 * Handle file selection
 * @param {File} file - Selected file
 */
async function handlePhotoFile(file) {
    // Validate file
    const validation = window.UIHandler.validateImageFile(file);
    if (!validation.valid) {
        window.UIHandler.showToast(validation.error, 'error');
        return;
    }
    
    // Store file
    photoState.originalFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        photoElements.preview.src = e.target.result;
        photoElements.previewContainer.classList.remove('hidden');
        photoElements.dropzone.style.display = 'none';
    };
    reader.readAsDataURL(file);
    
    // Display file info
    photoElements.info.innerHTML = `
        <strong>${file.name}</strong><br>
        Size: ${window.UIHandler.formatFileSize(file.size)}
    `;
    
    // Upload to server
    try {
        window.UIHandler.showToast('Uploading photo...', 'info', 3000);
        
        const response = await window.UIHandler.uploadFile('/api/photo/upload', file);
        
        photoState.uploadId = response.upload_id;
        
        // Update info with dimensions
        photoElements.info.innerHTML = `
            <strong>${file.name}</strong><br>
            Size: ${window.UIHandler.formatFileSize(file.size)}<br>
            Dimensions: ${response.dimensions.width} × ${response.dimensions.height}
        `;
        
        // Enable process button
        photoElements.processBtn.disabled = false;
        
        window.UIHandler.showToast('Photo uploaded successfully!', 'success');
        
    } catch (error) {
        window.UIHandler.handleError(error, 'upload photo');
        resetPhotoEditor();
    }
}

/**
 * Reset photo editor to initial state
 */
function resetPhotoEditor() {
    // Clear state
    photoState.uploadId = null;
    photoState.jobId = null;
    photoState.originalFile = null;
    
    // Reset UI
    photoElements.preview.src = '';
    photoElements.previewContainer.classList.add('hidden');
    photoElements.dropzone.style.display = 'block';
    photoElements.info.innerHTML = '';
    
    // Reset controls
    resetEffects();
    
    // Disable buttons
    photoElements.processBtn.disabled = true;
    
    // Hide status sections
    photoElements.processingSection.classList.add('hidden');
    photoElements.downloadSection.classList.add('hidden');
}

// ============================================================================
// Effect Controls
// ============================================================================

/**
 * Initialize effect control listeners
 */
function initEffectControls() {
    // Filter selection
    photoElements.filterSelect.addEventListener('change', (e) => {
        photoState.currentEffects.filter = e.target.value;
    });
    
    // Brightness slider
    photoElements.brightnessSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.brightness = value;
        photoElements.brightnessValue.textContent = value.toFixed(1);
    });
    
    // Contrast slider
    photoElements.contrastSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.contrast = value;
        photoElements.contrastValue.textContent = value.toFixed(1);
    });
    
    // Color slider
    photoElements.colorSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.color = value;
        photoElements.colorValue.textContent = value.toFixed(1);
    });
    
    // Sharpness slider
    photoElements.sharpnessSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.sharpness = value;
        photoElements.sharpnessValue.textContent = value.toFixed(1);
    });
    
    // Reset button
    photoElements.resetBtn.addEventListener('click', resetEffects);
}

/**
 * Reset all effects to default values
 */
function resetEffects() {
    // Reset state
    photoState.currentEffects = {
        filter: '',
        brightness: 1.0,
        contrast: 1.0,
        color: 1.0,
        sharpness: 1.0
    };
    
    // Reset UI controls
    photoElements.filterSelect.value = '';
    
    photoElements.brightnessSlider.value = 1.0;
    photoElements.brightnessValue.textContent = '1.0';
    
    photoElements.contrastSlider.value = 1.0;
    photoElements.contrastValue.textContent = '1.0';
    
    photoElements.colorSlider.value = 1.0;
    photoElements.colorValue.textContent = '1.0';
    
    photoElements.sharpnessSlider.value = 1.0;
    photoElements.sharpnessValue.textContent = '1.0';
    
    window.UIHandler.showToast('Effects reset to default', 'info', 2000);
}

// ============================================================================
// Photo Processing
// ============================================================================

/**
 * Process photo with selected effects
 */
async function processPhoto() {
    if (!photoState.uploadId) {
        window.UIHandler.showToast('Please upload a photo first', 'error');
        return;
    }
    
    try {
        // Show processing status
        photoElements.processingSection.classList.remove('hidden');
        photoElements.downloadSection.classList.add('hidden');
        photoElements.processBtn.disabled = true;
        
        // Prepare effects payload
        const effects = {
            filter: photoState.currentEffects.filter || null,
            brightness: photoState.currentEffects.brightness,
            contrast: photoState.currentEffects.contrast,
            color: photoState.currentEffects.color,
            sharpness: photoState.currentEffects.sharpness
        };
        
        // Send processing request
        const response = await window.UIHandler.apiRequest('/api/photo/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                upload_id: photoState.uploadId,
                effects: effects
            })
        });
        
        photoState.jobId = response.job_id;
        
        // Hide processing, show download
        photoElements.processingSection.classList.add('hidden');
        photoElements.downloadSection.classList.remove('hidden');
        photoElements.processBtn.disabled = false;
        
        window.UIHandler.showToast('Photo processed successfully!', 'success');
        
    } catch (error) {
        photoElements.processingSection.classList.add('hidden');
        photoElements.processBtn.disabled = false;
        window.UIHandler.handleError(error, 'process photo');
    }
}

// ============================================================================
// Download Processed Photo
// ============================================================================

/**
 * Download processed photo
 */
async function downloadPhoto() {
    if (!photoState.jobId) {
        window.UIHandler.showToast('No processed photo available', 'error');
        return;
    }
    
    try {
        // Create download link
        const downloadUrl = `${window.UIHandler.API_BASE_URL}/api/photo/download/${photoState.jobId}`;
        
        // Trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `edited_photo_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.UIHandler.showToast('Download started!', 'success');
        
    } catch (error) {
        window.UIHandler.handleError(error, 'download photo');
    }
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

/**
 * Setup all event listeners for photo editor
 */
function setupPhotoEventListeners() {
    // File input click
    photoElements.dropzone.addEventListener('click', () => {
        photoElements.fileInput.click();
    });
    
    // File input change
    photoElements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePhotoFile(e.target.files[0]);
        }
    });
    
    // Drag and drop
    window.UIHandler.setupDragAndDrop(photoElements.dropzone, handlePhotoFile);
    
    // Remove photo button
    photoElements.removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetPhotoEditor();
    });
    
    // Process button
    photoElements.processBtn.addEventListener('click', processPhoto);
    
    // Download button
    photoElements.downloadBtn.addEventListener('click', downloadPhoto);
    
    // Effect controls
    initEffectControls();
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize photo editor when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initPhotoElements();
    setupPhotoEventListeners();
    console.log('Photo Editor initialized');
});
