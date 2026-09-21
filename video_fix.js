async function upscaleVideo() {
  if (!videoState.originalFile) {
    window.UIHandler.showToast('Please upload a video first', 'error');
    return;
  }
  try {
    videoElements.processingSection.classList.remove('hidden');
    videoElements.downloadSection.classList.add('hidden');
    videoElements.upscaleBtn.disabled = true;
    const res = videoState.selectedResolution;
    let targetW, targetH;
    if (res === '1080p') { targetW = 1920; targetH = 1080; }
    else if (res === '4K') { targetW = 3840; targetH = 2160; }
    else if (res === '8K') { targetW = 7680; targetH = 4320; }
    else { targetW = 1920; targetH = 1080; }
    videoElements.statusText.textContent = 'Scaling video frame to ' + res.toUpperCase() + '...';
    videoElements.statusDetail.textContent = 'Target: ' + targetW + 'x' + targetH;
    videoElements.progressPercent.textContent = '0%';
    videoElements.progressFill.style.width = '0%';
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(function () {
      progress += 10;
      if (progress > 90) progress = 90;
      videoElements.progressPercent.textContent = progress + '%';
      videoElements.progressFill.style.width = progress + '%';
    }, 200);
    // Use canvas to scale video frame
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
    clearInterval(progressInterval);
    videoElements.progressPercent.textContent = '100%';
    videoElements.progressFill.style.width = '100%';
    setTimeout(function () {
      videoElements.processingSection.classList.add('hidden');
      videoElements.downloadSection.classList.remove('hidden');
      videoElements.upscaleBtn.disabled = false;
      window.UIHandler.showToast('Video frame scaled to ' + res.toUpperCase() + ' successfully!', 'success');
    }, 500);
  } catch (error) {
    videoElements.processingSection.classList.add('hidden');
    videoElements.upscaleBtn.disabled = false;
    window.UIHandler.showToast('Error: ' + error.message, 'error');
  }
}

// ============================================================================
// Resize Control