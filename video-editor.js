/**
 * Video Editor Module
 * ====================
 * Handles video editing functionality:
 * - Drag and drop file upload
 * - Video preview
 * - Upscaling (1080p, 4K, 8K)
 * - Resizing (by file size or dimensions)
 * - Status polling for long-running operations
 * - Download processed videos
 */

// ============================================================================
// State Management
// ============================================================================

const videoState = {
    uploadId: null,
    jobId: null,
    originalFile: null,
    metadata: null,
    currentOperation: 'upscale', // 'upscale' or 'resize'
    selectedResolution: '1080p',
    quality: 'high',
    resizeMethod: 'filesize',
    statusPollInterval: null,
    processedDataUrl: null
};

// ============================================================================
// DOM Elements
// ============================================================================

let videoElements = {};

/**
 * Initialize DOM element references
 */
function initVideoElements() {
    videoElements = {
        // Upload elements
        dropzone: document.getElementById('video-dropzone'),
        fileInput: document.getElementById('video-file-input'),
        
        // Preview elements
        previewContainer: document.getElementById('video-preview-container'),
        preview: document.getElementById('video-preview'),
        info: document.getElementById('video-info'),
        removeBtn: document.getElementById('video-remove'),
        
        // Tab elements
        tabUpscale: document.getElementById('tab-upscale'),
        tabResize: document.getElementById('tab-resize'),
        
        // Upscale options
        upscaleOptions: document.getElementById('upscale-options'),
        resolutionBtns: document.querySelectorAll('.resolution-btn'),
        qualitySelect: document.getElementById('video-quality'),
        upscaleBtn: document.getElementById('video-upscale-btn'),
        
        // Resize options
        resizeOptions: document.getElementById('resize-options'),
        resizeMethodSelect: document.getElementById('resize-method'),
        filesizeOption: document.getElementById('filesize-option'),
        dimensionsOption: document.getElementById('dimensions-option'),
        targetFilesizeSlider: document.getElementById('target-filesize'),
        filesizeValue: document.getElementById('filesize-value'),
        resizeWidthInput: document.getElementById('resize-width'),
        resizeHeightInput: document.getElementById('resize-height'),
        maintainAspectCheckbox: document.getElementById('maintain-aspect'),
        resizeBtn: document.getElementById('video-resize-btn'),
        
        // Status elements
        processingSection: document.getElementById('video-processing'),
        statusText: document.getElementById('video-status-text'),
        statusDetail: document.getElementById('video-status-detail'),
        progressPercent: document.getElementById('video-progress-percent'),
        progressFill: document.getElementById('video-progress-fill'),
        
        // Download elements
        downloadSection: document.getElementById('video-download'),
        downloadBtn: document.getElementById('video-download-btn')
    };
}

// ============================================================================
// File Upload Handling
// ============================================================================

/**
 * Handle file selection
 * @param {File} file - Selected file
 */
async function handleVideoFile(file) {
    // Validate file
    const validation = window.UIHandler.validateVideoFile(file);
    if (!validation.valid) {
        window.UIHandler.showToast(validation.error, 'error');
        return;
    }
    
    // Store file
    videoState.originalFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        videoElements.preview.src = e.target.result;
        videoElements.previewContainer.classList.remove('hidden');
        videoElements.dropzone.style.display = 'none';
    };
    reader.readAsDataURL(file);
    
    // Display file info
    videoElements.info.innerHTML = `
        <strong>${file.name}</strong><br>
        Size: ${window.UIHandler.formatFileSize(file.size)}<br>
        <span class="text-gray-500">Uploading...</span>
    `;
    
    // Work locally without server
    videoState.uploadId = 'local-' + Date.now();
    videoElements.info.innerHTML =
        '<strong>' + file.name + '</strong><br>' +
        'Size: ' + (file.size / (1024*1024)).toFixed(1) + ' MB';
    videoElements.upscaleBtn.disabled = false;
            videoElements.downloadSection.classList.remove('hidden');
    videoElements.resizeBtn.disabled = false;
    window.UIHandler.showToast('Video loaded successfully!', 'success');
}

/**
 * Reset video editor to initial state
 */
function resetVideoEditor() {
    // Clear state
    videoState.uploadId = null;
    videoState.jobId = null;
    videoState.originalFile = null;
    videoState.metadata = null;
    
    // Stop status polling if active
    if (videoState.statusPollInterval) {
        clearInterval(videoState.statusPollInterval);
        videoState.statusPollInterval = null;
    }
    
    // Reset UI
    videoElements.preview.src = '';
    videoElements.previewContainer.classList.add('hidden');
    videoElements.dropzone.style.display = 'block';
    videoElements.info.innerHTML = '';
    
    // Disable buttons
    videoElements.upscaleBtn.disabled = true;
    videoElements.resizeBtn.disabled = true;
    
    // Hide status sections
    videoElements.processingSection.classList.add('hidden');
    videoElements.downloadSection.classList.add('hidden');
}

// ============================================================================
// Tab Management
// ============================================================================

/**
 * Initialize tab switching
 */
function initTabs() {
    videoElements.tabUpscale.addEventListener('click', () => {
        videoState.currentOperation = 'upscale';
        
        // Update tab states
        videoElements.tabUpscale.classList.add('active');
        videoElements.tabResize.classList.remove('active');
        
        // Update option visibility
        videoElements.upscaleOptions.classList.remove('hidden');
        videoElements.resizeOptions.classList.add('hidden');
    });
    
    videoElements.tabResize.addEventListener('click', () => {
        videoState.currentOperation = 'resize';
        
        // Update tab states
        videoElements.tabResize.classList.add('active');
        videoElements.tabUpscale.classList.remove('active');
        
        // Update option visibility
        videoElements.resizeOptions.classList.remove('hidden');
        videoElements.upscaleOptions.classList.add('hidden');
    });
}

// ============================================================================
// Upscale Controls
// ============================================================================

/**
 * Initialize upscale controls
 */
function initUpscaleControls() {
    // Resolution buttons
    videoElements.resolutionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            videoElements.resolutionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Store selected resolution
            videoState.selectedResolution = btn.dataset.resolution;
        });
    });
    
    // Quality select
    videoElements.qualitySelect.addEventListener('change', (e) => {
        videoState.quality = e.target.value;
    });
    
    // Upscale button
    videoElements.upscaleBtn.addEventListener('click', upscaleVideo);
}

/**
 * Upscale video to selected resolution
 */
async function upscaleVideo() {
    if (!videoState.originalFile) {
        window.UIHandler.showToast('Please upload a video first', 'error');
        return;
    }
    try {
        videoElements.processingSection.classList.remove('hidden');
        videoElements.upscaleBtn.disabled = true;

        const res = videoState.selectedResolution;
        let targetW, targetH;
        if (res === '1080p') { targetW = 1920; targetH = 1080; }
        else if (res === '4K') { targetW = 3840; targetH = 2160; }
        else if (res === '8K') { targetW = 7680; targetH = 4320; }
        else { targetW = 1920; targetH = 1080; }

        videoElements.statusText.textContent = 'Upscaling video to ' + res.toUpperCase() + '...';
        videoElements.statusDetail.textContent = 'Target: ' + targetW + 'x' + targetH;
        videoElements.progressPercent.textContent = '0%';
        videoElements.progressFill.style.width = '0%';

        const video = videoElements.preview;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        const canvasStream = canvas.captureStream(30);

        let combinedStream;
        try {
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaElementSource(video);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            source.connect(audioCtx.destination);

            const audioTrack = destination.stream.getAudioTracks()[0];
            combinedStream = new MediaStream([
                canvasStream.getVideoTracks()[0],
                audioTrack
            ]);
        } catch (audioErr) {
            console.warn('Could not capture audio, proceeding without audio:', audioErr);
            combinedStream = canvasStream;
        }

        const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 5000000
        });

        const chunks = [];
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = function() {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            videoState.processedDataUrl = url;
            videoState.jobId = 'local-' + Date.now();

            videoElements.progressPercent.textContent = '100%';
            videoElements.progressFill.style.width = '100%';
            videoElements.statusText.textContent = 'Upscaling complete!';
            videoElements.statusDetail.textContent = 'Output: ' + targetW + 'x' + targetH + ' WebM';
            videoElements.processingSection.classList.add('hidden');
            videoElements.upscaleBtn.disabled = false;
            videoElements.downloadSection.classList.remove('hidden');

            if (window.UIHandler && window.UIHandler.showToast) {
                window.UIHandler.showToast('Video upscaled to ' + res.toUpperCase() + ' successfully!', 'success');
            }
        };

        mediaRecorder.start(1000);

        video.currentTime = 0;
        video.muted = false;
        const duration = video.duration;

        let animFrameId;
        function drawFrame() {
            if (video.paused || video.ended) {
                return;
            }
            ctx.drawImage(video, 0, 0, targetW, targetH);

            const progress = Math.round((video.currentTime / duration) * 100);
            videoElements.progressPercent.textContent = progress + '%';
            videoElements.progressFill.style.width = progress + '%';
            videoElements.statusText.textContent = 'Upscaling: ' + Math.round(video.currentTime) + 's / ' + Math.round(duration) + 's';

            animFrameId = requestAnimationFrame(drawFrame);
        }

        video.onended = function() {
            cancelAnimationFrame(animFrameId);
            mediaRecorder.stop();
            video.onended = null;
        };

        await video.play();
        drawFrame();

    } catch (error) {
        videoElements.processingSection.classList.add('hidden');
        videoElements.upscaleBtn.disabled = false;
        window.UIHandler.showToast('Error: ' + error.message, 'error');
    }
}


// ============================================================================
// Resize Controls
// ============================================================================

/**
 * Initialize resize controls
 */
function initResizeControls() {
    // Resize method select
    videoElements.resizeMethodSelect.addEventListener('change', (e) => {
        videoState.resizeMethod = e.target.value;
        
        if (e.target.value === 'filesize') {
            videoElements.filesizeOption.classList.remove('hidden');
            videoElements.dimensionsOption.classList.add('hidden');
        } else if (e.target.value === 'dimensions') {
            videoElements.dimensionsOption.classList.remove('hidden');
            videoElements.filesizeOption.classList.add('hidden');
        }
    });
    
    // Target filesize slider
    videoElements.targetFilesizeSlider.addEventListener('input', (e) => {
        videoElements.filesizeValue.textContent = e.target.value;
    });
    
    // Resize button
    videoElements.resizeBtn.addEventListener('click', resizeVideo);
}

/**
 * Resize video based on selected method
 */
async function resizeVideo() {
    if (!videoState.originalFile) {
        window.UIHandler.showToast('Please upload a video first', 'error');
        return;
    }
    try {
        videoElements.processingSection.classList.remove('hidden');
        videoElements.downloadSection.classList.add('hidden');
        videoElements.resizeBtn.disabled = true;
        let targetW, targetH;
        if (videoState.resizeMethod === 'dimensions') {
            targetW = parseInt(videoElements.resizeWidthInput.value) || 1280;
            targetH = parseInt(videoElements.resizeHeightInput.value) || 720;
        } else {
            targetW = 1280;
            targetH = 720;
        }
        videoElements.statusText.textContent = 'Resizing video frame...';
        videoElements.statusDetail.textContent = 'Target: ' + targetW + 'x' + targetH;
        videoElements.progressPercent.textContent = '50%';
        videoElements.progressFill.style.width = '50%';
        const video = videoElements.preview;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, targetW, targetH);
        videoState.processedDataUrl = canvas.toDataURL('image/png');
        videoState.jobId = 'local-' + Date.now();
        videoElements.progressPercent.textContent = '100%';
        videoElements.progressFill.style.width = '100%';
        setTimeout(function() {
            videoElements.processingSection.classList.add('hidden');
            videoElements.downloadSection.classList.remove('hidden');
            videoElements.resizeBtn.disabled = false;
            window.UIHandler.showToast('Video frame resized successfully!', 'success');
        }, 500);
    } catch (error) {
        videoElements.processingSection.classList.add('hidden');
        videoElements.resizeBtn.disabled = false;
        window.UIHandler.showToast('Error: ' + error.message, 'error');
    }
}

// ============================================================================
// Status Polling
// ============================================================================

/**
 * Start polling for video processing status
 */
function startStatusPolling() {
    // Clear any existing interval
    if (videoState.statusPollInterval) {
        clearInterval(videoState.statusPollInterval);
    }
    
    // Poll every 2 seconds
    videoState.statusPollInterval = setInterval(checkVideoStatus, 2000);
    
    // Check immediately
    checkVideoStatus();
}

/**
 * Check video processing status
 */
async function checkVideoStatus() {
    if (!videoState.jobId) {
        return;
    }
    
    try {
        const response = await window.UIHandler.apiRequest(`/api/video/status/${videoState.jobId}`);
        
        const status = response.status;
        const progress = response.progress || 0;
        
        // Update progress UI
        videoElements.progressPercent.textContent = `${progress}%`;
        videoElements.progressFill.style.width = `${progress}%`;
        
        if (status === 'processing') {
            videoElements.statusText.textContent = 'Processing video...';
            videoElements.statusDetail.textContent = 'This may take several minutes depending on video length and quality';
        } else if (status === 'completed') {
            // Stop polling
            clearInterval(videoState.statusPollInterval);
            videoState.statusPollInterval = null;
            
            // Hide processing, show download
            videoElements.processingSection.classList.add('hidden');
            videoElements.downloadSection.classList.remove('hidden');
            
            // Re-enable buttons
            videoElements.upscaleBtn.disabled = false;
            videoElements.resizeBtn.disabled = false;
            
            window.UIHandler.showToast('Video processed successfully!', 'success');
            
        } else if (status === 'failed') {
            // Stop polling
            clearInterval(videoState.statusPollInterval);
            videoState.statusPollInterval = null;
            
            // Hide processing
            videoElements.processingSection.classList.add('hidden');
            
            // Re-enable buttons
            videoElements.upscaleBtn.disabled = false;
            videoElements.resizeBtn.disabled = false;
            
            const errorMsg = response.error || 'Video processing failed';
            window.UIHandler.showToast(errorMsg, 'error');
        }
        
    } catch (error) {
        console.error('Error checking video status:', error);
        // Don't show error toast for polling failures, just log them
    }
}

// ============================================================================
// Download Processed Video
// ============================================================================

/**
 * Download processed video
 */
async function downloadVideo() {
    if (!videoState.processedDataUrl) {
        window.UIHandler.showToast('No processed video available', 'error');
        return;
    }
    try {
        const link = document.createElement('a');
        link.href = videoState.processedDataUrl;
        link.download = 'upscaled_video_' + Date.now() + '.webm';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.UIHandler.showToast('Download started!', 'success');
    } catch (error) {
        window.UIHandler.showToast('Error: ' + error.message, 'error');
    }
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

/**
 * Setup all event listeners for video editor
 */
function setupVideoEventListeners() {
    // File input click
    videoElements.dropzone.addEventListener('click', () => {
        videoElements.fileInput.click();
    });
    
    // File input change
    videoElements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoFile(e.target.files[0]);
        }
    });
    
    // Drag and drop
    window.UIHandler.setupDragAndDrop(videoElements.dropzone, handleVideoFile);
    
    // Remove video button
    videoElements.removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetVideoEditor();
    });
    
    // Download button
    videoElements.downloadBtn.addEventListener('click', downloadVideo);
    
    // Initialize tabs and controls
    initTabs();
    initUpscaleControls();
    initResizeControls();
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize video editor when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initVideoElements();
    setupVideoEventListeners();
    console.log('Video Editor initialized');
});

// ============================================================================
// Cleanup on page unload
// ============================================================================

window.addEventListener('beforeunload', () => {
    if (videoState.statusPollInterval) {
        clearInterval(videoState.statusPollInterval);
    }
});
