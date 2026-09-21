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
    processedDataUrl: null,
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

    // Enable processing locally (no server needed)
    photoState.uploadId = 'local-' + Date.now();
    const tempImg = new Image();
    tempImg.onload = function() {
        photoElements.info.innerHTML =
            '<strong>' + file.name + '</strong><br>' +
            'Size: ' + (file.size / 1024).toFixed(1) + ' KB<br>' +
            'Dimensions: ' + tempImg.naturalWidth + ' x ' + tempImg.naturalHeight;
    };
    tempImg.src = photoElements.preview.src;
    photoElements.processBtn.disabled = false;
    window.UIHandler.showToast('Photo loaded successfully!', 'success');
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
 * Apply current effects to the preview image in real-time
 */
function applyEffectsToPreview() {
    const effects = photoState.currentEffects;
    let filterStr = '';
    filterStr += 'brightness(' + effects.brightness + ') ';
    filterStr += 'contrast(' + effects.contrast + ') ';
    filterStr += 'saturate(' + effects.color + ') ';
    // Apply CSS filter approximations for selected filter preset
    if (effects.filter === 'CONTOUR') filterStr += 'contrast(1.5) brightness(0.9) ';
    else if (effects.filter === 'DETAIL') filterStr += 'contrast(1.3) ';
    else if (effects.filter === 'EDGE_ENHANCE') filterStr += 'contrast(1.8) brightness(0.8) ';
    else if (effects.filter === 'EDGE_ENHANCE_MORE') filterStr += 'contrast(2.0) brightness(0.7) ';
    else if (effects.filter === 'FIND_EDGES') filterStr += 'invert(1) contrast(2.0) ';
    else if (effects.filter === 'EMBOSS') filterStr += 'contrast(1.4) brightness(1.1) ';
    else if (effects.filter === 'SHARPEN') filterStr += 'contrast(1.5) ';
    else if (effects.filter === 'SMOOTH') filterStr += 'blur(1px) ';
    else if (effects.filter === 'SMOOTH_MORE') filterStr += 'blur(2px) ';
    photoElements.preview.style.filter = filterStr.trim();
    console.log('[PhotoEditor] Effects applied:', filterStr.trim());
}

/**
 * Initialize effect control listeners
 */
function initEffectControls() {
    // Filter selection
    photoElements.filterSelect.addEventListener('change', (e) => {
        photoState.currentEffects.filter = e.target.value;
        applyEffectsToPreview();
    });

    // Brightness slider
    photoElements.brightnessSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.brightness = value;
        photoElements.brightnessValue.textContent = value.toFixed(1);
        applyEffectsToPreview();
    });

    // Contrast slider
    photoElements.contrastSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.contrast = value;
        photoElements.contrastValue.textContent = value.toFixed(1);
        applyEffectsToPreview();
    });

    // Color slider
    photoElements.colorSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.color = value;
        photoElements.colorValue.textContent = value.toFixed(1);
        applyEffectsToPreview();
    });

    // Sharpness slider
    photoElements.sharpnessSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        photoState.currentEffects.sharpness = value;
        photoElements.sharpnessValue.textContent = value.toFixed(1);
        applyEffectsToPreview();
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

    if (photoElements.preview) {
        photoElements.preview.style.filter = '';
    }
    photoState.processedDataUrl = null;
    window.UIHandler.showToast('Effects reset to default', 'info', 2000);
}

// ============================================================================
// Photo Processing
// ============================================================================

/**
 * Process photo with selected effects
 */
async function processPhoto() {
    if (!photoState.originalFile) {
        window.UIHandler.showToast('Please upload a photo first', 'error');
        return;
    }
    try {
        photoElements.processingSection.classList.remove('hidden');
        photoElements.downloadSection.classList.add('hidden');
        photoElements.processBtn.disabled = true;
        const effects = photoState.currentEffects;
        let filterStr = '';
        filterStr += 'brightness(' + effects.brightness + ') ';
        filterStr += 'contrast(' + effects.contrast + ') ';
        filterStr += 'saturate(' + effects.color + ') ';
        // Apply CSS filter approximations for selected filter preset
    if (effects.filter === 'CONTOUR') filterStr += 'contrast(1.5) brightness(0.9) ';
    else if (effects.filter === 'DETAIL') filterStr += 'contrast(1.3) ';
    else if (effects.filter === 'EDGE_ENHANCE') filterStr += 'contrast(1.8) brightness(0.8) ';
    else if (effects.filter === 'EDGE_ENHANCE_MORE') filterStr += 'contrast(2.0) brightness(0.7) ';
    else if (effects.filter === 'FIND_EDGES') filterStr += 'invert(1) contrast(2.0) ';
    else if (effects.filter === 'EMBOSS') filterStr += 'contrast(1.4) brightness(1.1) ';
    else if (effects.filter === 'SHARPEN') filterStr += 'contrast(1.5) ';
    else if (effects.filter === 'SMOOTH') filterStr += 'blur(1px) ';
    else if (effects.filter === 'SMOOTH_MORE') filterStr += 'blur(2px) ';
        photoElements.preview.style.filter = filterStr.trim();
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.filter = filterStr.trim();
            ctx.drawImage(img, 0, 0);
            if (effects.sharpness > 1.0) {
                const sharpAmount = (effects.sharpness - 1.0) * 0.5;
                ctx.globalAlpha = sharpAmount;
                ctx.filter = 'contrast(1.5) brightness(1.05)';
                ctx.drawImage(canvas, 0, 0);
                ctx.globalAlpha = 1.0;
                ctx.filter = 'none';
            }
            photoState.processedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            photoState.jobId = 'local-' + Date.now();
            photoElements.processingSection.classList.add('hidden');
            photoElements.downloadSection.classList.remove('hidden');
            photoElements.processBtn.disabled = false;
            window.UIHandler.showToast('Photo processed successfully!', 'success');
        };
        img.onerror = function() {
            photoElements.processingSection.classList.add('hidden');
            photoElements.processBtn.disabled = false;
            window.UIHandler.showToast('Error processing photo', 'error');
        };
        img.src = photoElements.preview.src;
    } catch (error) {
        photoElements.processingSection.classList.add('hidden');
        photoElements.processBtn.disabled = false;
        window.UIHandler.showToast('Error: ' + error.message, 'error');
    }
}

// ============================================================================
// Download Processed Photo
// ============================================================================

/**
 * Download processed photo
 */
async function downloadPhoto() {
    if (!photoState.processedDataUrl) {
        window.UIHandler.showToast('No processed photo available', 'error');
        return;
    }
    try {
        const link = document.createElement('a');
        link.href = photoState.processedDataUrl;
        link.download = 'edited_photo_' + Date.now() + '.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.UIHandler.showToast('Download started!', 'success');
    } catch (error) {
        window.UIHandler.showToast('Error downloading: ' + error.message, 'error');
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
