"""
Photo and Video Editing API Server
===================================
Flask-based REST API server for photo and video processing.

Based on technical specifications from technical_spec.md
API endpoints implement photo editing (PIL/Pillow) and video processing (FFmpeg).
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image, ImageEnhance, ImageFilter
import os
import uuid
import json
from pathlib import Path
from datetime import datetime
import threading
from typing import Dict, Optional
import traceback

# Import video processor
from video_processor import VideoProcessor, validate_video_format, get_video_metadata


# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
MAX_PHOTO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_PHOTO_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Job tracking for async processing
jobs = {}
job_lock = threading.Lock()


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def allowed_photo_file(filename: str) -> bool:
    """Check if file extension is allowed for photos."""
    return Path(filename).suffix.lower() in ALLOWED_PHOTO_EXTENSIONS


def allowed_video_file(filename: str) -> bool:
    """Check if file extension is allowed for videos."""
    return Path(filename).suffix.lower() in ALLOWED_VIDEO_EXTENSIONS


def generate_job_id() -> str:
    """Generate unique job ID."""
    return str(uuid.uuid4())


def get_file_path(filename: str) -> str:
    """Get full path for uploaded file."""
    return os.path.join(UPLOAD_FOLDER, filename)


def update_job_status(job_id: str, status: str, **kwargs):
    """Update job status in tracking dictionary."""
    with job_lock:
        if job_id in jobs:
            jobs[job_id]['status'] = status
            jobs[job_id]['updated_at'] = datetime.now().isoformat()
            jobs[job_id].update(kwargs)


# ============================================================================
# PHOTO PROCESSING FUNCTIONS
# ============================================================================

def process_photo_sync(input_path: str, output_path: str, effects: Dict) -> bool:
    """
    Process photo with specified effects synchronously.
    
    Based on PhotoEditor.py capabilities documented in photo_effects.txt:
    - 10 filters (BLUR, CONTOUR, DETAIL, EDGE_ENHANCE, EDGE_ENHANCE_MORE,
                  FIND_EDGES, EMBOSS, SHARPEN, SMOOTH, SMOOTH_MORE)
    - 4 enhancers (Color, Contrast, Brightness, Sharpness) with 0.0-2.0 range
    - Transformations (resize, rotate, crop, flip)
    
    Args:
        input_path: Path to input image
        output_path: Path to save processed image
        effects: Dictionary of effects to apply
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Load image
        image = Image.open(input_path)
        
        # Apply filter if specified
        if 'filter' in effects and effects['filter']:
            filter_name = effects['filter'].upper()
            valid_filters = ['BLUR', 'CONTOUR', 'DETAIL', 'EDGE_ENHANCE', 
                           'EDGE_ENHANCE_MORE', 'FIND_EDGES', 'EMBOSS', 
                           'SHARPEN', 'SMOOTH', 'SMOOTH_MORE']
            
            if filter_name in valid_filters:
                image = image.filter(getattr(ImageFilter, filter_name))
        
        # Apply brightness enhancement (range: 0.0 to 2.0)
        if 'brightness' in effects and effects['brightness'] != 1.0:
            factor = float(effects['brightness'])
            if 0.0 <= factor <= 2.0:
                enhancer = ImageEnhance.Brightness(image)
                image = enhancer.enhance(factor)
        
        # Apply contrast enhancement (range: 0.0 to 2.0)
        if 'contrast' in effects and effects['contrast'] != 1.0:
            factor = float(effects['contrast'])
            if 0.0 <= factor <= 2.0:
                enhancer = ImageEnhance.Contrast(image)
                image = enhancer.enhance(factor)
        
        # Apply color/saturation enhancement (range: 0.0 to 2.0)
        if 'color' in effects and effects['color'] != 1.0:
            factor = float(effects['color'])
            if 0.0 <= factor <= 2.0:
                enhancer = ImageEnhance.Color(image)
                image = enhancer.enhance(factor)
        
        # Apply sharpness enhancement (range: 0.0 to 2.0)
        if 'sharpness' in effects and effects['sharpness'] != 1.0:
            factor = float(effects['sharpness'])
            if 0.0 <= factor <= 2.0:
                enhancer = ImageEnhance.Sharpness(image)
                image = enhancer.enhance(factor)
        
        # Apply transformations
        if 'rotate' in effects and effects['rotate'] != 0:
            angle = float(effects['rotate'])
            image = image.rotate(angle, expand=True, fillcolor=(255, 255, 255))
        
        if 'flip_horizontal' in effects and effects['flip_horizontal']:
            image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        
        if 'flip_vertical' in effects and effects['flip_vertical']:
            image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        
        if 'resize' in effects and effects['resize']:
            width = int(effects['resize'].get('width', image.width))
            height = int(effects['resize'].get('height', image.height))
            image = image.resize((width, height))
        
        # Save with high quality
        image.save(output_path, quality=95)
        return True
        
    except Exception as e:
        print(f"Photo processing error: {e}")
        traceback.print_exc()
        return False


# ============================================================================
# VIDEO PROCESSING FUNCTIONS (Async)
# ============================================================================

def process_video_async(job_id: str, operation: str, **kwargs):
    """
    Process video asynchronously in background thread.
    
    Args:
        job_id: Unique job identifier
        operation: Type of operation ('upscale', 'resize_filesize', 'trim')
        **kwargs: Operation-specific parameters
    """
    try:
        update_job_status(job_id, 'processing', progress=0)
        
        input_path = kwargs.get('input_path')
        output_path = kwargs.get('output_path')
        
        # Create video processor
        processor = VideoProcessor(input_path)
        
        # Execute operation
        success = False
        if operation == 'upscale':
            resolution = kwargs.get('resolution', '1080p')
            quality = kwargs.get('quality', 'high')
            success = processor.upscale(output_path, resolution, quality)
            
        elif operation == 'resize_filesize':
            target_mb = kwargs.get('target_mb', 50)
            success = processor.resize_by_filesize(output_path, target_mb)
            
        elif operation == 'resize_dimensions':
            width = kwargs.get('width')
            height = kwargs.get('height')
            maintain_aspect = kwargs.get('maintain_aspect', True)
            quality = kwargs.get('quality', 'medium')
            success = processor.resize_by_dimensions(output_path, width, height, 
                                                    maintain_aspect, quality)
            
        elif operation == 'trim':
            start_time = kwargs.get('start_time', 0)
            duration = kwargs.get('duration')
            success = processor.trim(output_path, start_time, duration)
        
        if success:
            update_job_status(job_id, 'completed', progress=100, 
                            output_file=os.path.basename(output_path))
        else:
            update_job_status(job_id, 'failed', error='Processing failed')
            
    except Exception as e:
        error_msg = str(e)
        print(f"Video processing error: {error_msg}")
        traceback.print_exc()
        update_job_status(job_id, 'failed', error=error_msg)


# ============================================================================
# PHOTO API ENDPOINTS
# ============================================================================

@app.route('/api/photo/upload', methods=['POST'])
def upload_photo():
    """
    Upload photo for editing.
    
    Request: multipart/form-data with 'file' field
    Response: JSON with upload_id, filename, size, and dimensions
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_photo_file(file.filename):
            return jsonify({'error': 'Invalid file format. Allowed: JPG, PNG, BMP, GIF, TIFF, WebP'}), 400
        
        # Generate unique filename
        upload_id = generate_job_id()
        file_ext = Path(file.filename).suffix
        filename = f"photo_{upload_id}{file_ext}"
        filepath = get_file_path(filename)
        
        # Save file
        file.save(filepath)
        
        # Get image dimensions
        with Image.open(filepath) as img:
            width, height = img.size
        
        file_size = os.path.getsize(filepath)
        
        # Store upload info
        with job_lock:
            jobs[upload_id] = {
                'type': 'photo',
                'filename': filename,
                'original_filename': secure_filename(file.filename),
                'status': 'uploaded',
                'created_at': datetime.now().isoformat()
            }
        
        return jsonify({
            'upload_id': upload_id,
            'filename': secure_filename(file.filename),
            'size': file_size,
            'dimensions': {'width': width, 'height': height}
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/photo/process', methods=['POST'])
def process_photo():
    """
    Apply effects to uploaded photo.
    
    Request JSON:
    {
        "upload_id": "uuid",
        "effects": {
            "filter": "SHARPEN",
            "brightness": 1.2,
            "contrast": 1.1,
            "color": 1.0,
            "sharpness": 1.3,
            "rotate": 0,
            "flip_horizontal": false,
            "flip_vertical": false
        }
    }
    
    Response: JSON with job_id and status
    """
    try:
        data = request.get_json()
        
        if not data or 'upload_id' not in data:
            return jsonify({'error': 'Missing upload_id'}), 400
        
        upload_id = data['upload_id']
        
        with job_lock:
            if upload_id not in jobs:
                return jsonify({'error': 'Invalid upload_id'}), 404
            
            upload_info = jobs[upload_id]
        
        input_filename = upload_info['filename']
        input_path = get_file_path(input_filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'Uploaded file not found'}), 404
        
        # Generate output filename
        job_id = generate_job_id()
        file_ext = Path(input_filename).suffix
        output_filename = f"processed_{job_id}{file_ext}"
        output_path = get_file_path(output_filename)
        
        # Get effects
        effects = data.get('effects', {})
        
        # Process photo synchronously (fast operation)
        success = process_photo_sync(input_path, output_path, effects)
        
        if success:
            # Store job info
            with job_lock:
                jobs[job_id] = {
                    'type': 'photo',
                    'status': 'completed',
                    'output_file': output_filename,
                    'created_at': datetime.now().isoformat()
                }
            
            return jsonify({
                'job_id': job_id,
                'status': 'completed',
                'download_url': f'/api/photo/download/{job_id}'
            }), 200
        else:
            return jsonify({'error': 'Photo processing failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/photo/download/<job_id>', methods=['GET'])
def download_photo(job_id):
    """
    Download processed photo.
    
    Args:
        job_id: Job identifier
        
    Response: Image file
    """
    try:
        with job_lock:
            if job_id not in jobs:
                return jsonify({'error': 'Invalid job_id'}), 404
            
            job_info = jobs[job_id]
        
        if job_info['status'] != 'completed':
            return jsonify({'error': 'Job not completed'}), 400
        
        output_filename = job_info['output_file']
        output_path = get_file_path(output_filename)
        
        if not os.path.exists(output_path):
            return jsonify({'error': 'Output file not found'}), 404
        
        return send_file(output_path, as_attachment=True, 
                        download_name=f"edited_{output_filename}")
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# VIDEO API ENDPOINTS
# ============================================================================

@app.route('/api/video/upload', methods=['POST'])
def upload_video():
    """
    Upload video for processing.
    
    Request: multipart/form-data with 'file' field
    Response: JSON with upload_id, filename, size, duration, and resolution
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_video_file(file.filename):
            return jsonify({'error': 'Invalid file format. Allowed: MP4, AVI, MOV, MKV, WebM, FLV, WMV'}), 400
        
        # Generate unique filename
        upload_id = generate_job_id()
        file_ext = Path(file.filename).suffix
        filename = f"video_{upload_id}{file_ext}"
        filepath = get_file_path(filename)
        
        # Save file
        file.save(filepath)
        
        # Get video metadata
        metadata = get_video_metadata(filepath)
        
        # Store upload info
        with job_lock:
            jobs[upload_id] = {
                'type': 'video',
                'filename': filename,
                'original_filename': secure_filename(file.filename),
                'status': 'uploaded',
                'metadata': metadata,
                'created_at': datetime.now().isoformat()
            }
        
        return jsonify({
            'upload_id': upload_id,
            'filename': secure_filename(file.filename),
            'size': metadata['size_mb'] * 1024 * 1024,
            'duration': metadata['duration'],
            'resolution': {
                'width': metadata['width'],
                'height': metadata['height']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/video/upscale', methods=['POST'])
def upscale_video():
    """
    Upscale video to target resolution (1080p/4K/8K).
    
    Request JSON:
    {
        "upload_id": "uuid",
        "resolution": "4k",
        "quality": "high"
    }
    
    Response: JSON with job_id and status
    """
    try:
        data = request.get_json()
        
        if not data or 'upload_id' not in data:
            return jsonify({'error': 'Missing upload_id'}), 400
        
        upload_id = data['upload_id']
        resolution = data.get('resolution', '1080p')
        quality = data.get('quality', 'high')
        
        # Validate resolution
        valid_resolutions = ['1080p', '4k', '8k']
        if resolution not in valid_resolutions:
            return jsonify({'error': f'Invalid resolution. Must be one of: {valid_resolutions}'}), 400
        
        with job_lock:
            if upload_id not in jobs:
                return jsonify({'error': 'Invalid upload_id'}), 404
            
            upload_info = jobs[upload_id]
        
        input_filename = upload_info['filename']
        input_path = get_file_path(input_filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'Uploaded file not found'}), 404
        
        # Generate output filename
        job_id = generate_job_id()
        output_filename = f"upscaled_{resolution}_{job_id}.mp4"
        output_path = get_file_path(output_filename)
        
        # Store job info
        with job_lock:
            jobs[job_id] = {
                'type': 'video',
                'operation': 'upscale',
                'status': 'queued',
                'progress': 0,
                'created_at': datetime.now().isoformat()
            }
        
        # Start async processing
        thread = threading.Thread(
            target=process_video_async,
            args=(job_id, 'upscale'),
            kwargs={
                'input_path': input_path,
                'output_path': output_path,
                'resolution': resolution,
                'quality': quality
            }
        )
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'message': 'Video upscaling started'
        }), 202
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/video/resize', methods=['POST'])
def resize_video():
    """
    Resize video by file size or duration.
    
    Request JSON:
    {
        "upload_id": "uuid",
        "resize_type": "filesize",  // or "duration" or "dimensions"
        "target_mb": 50,             // for filesize
        "start_time": 0,             // for duration
        "duration": 30,              // for duration
        "width": 1280,               // for dimensions
        "height": 720                // for dimensions
    }
    
    Response: JSON with job_id and status
    """
    try:
        data = request.get_json()
        
        if not data or 'upload_id' not in data:
            return jsonify({'error': 'Missing upload_id'}), 400
        
        upload_id = data['upload_id']
        resize_type = data.get('resize_type', 'filesize')
        
        with job_lock:
            if upload_id not in jobs:
                return jsonify({'error': 'Invalid upload_id'}), 404
            
            upload_info = jobs[upload_id]
        
        input_filename = upload_info['filename']
        input_path = get_file_path(input_filename)
        
        if not os.path.exists(input_path):
            return jsonify({'error': 'Uploaded file not found'}), 404
        
        # Generate output filename
        job_id = generate_job_id()
        output_filename = f"resized_{job_id}.mp4"
        output_path = get_file_path(output_filename)
        
        # Prepare operation parameters
        operation = None
        kwargs = {
            'input_path': input_path,
            'output_path': output_path
        }
        
        if resize_type == 'filesize':
            operation = 'resize_filesize'
            kwargs['target_mb'] = data.get('target_mb', 50)
            
        elif resize_type == 'duration':
            operation = 'trim'
            kwargs['start_time'] = data.get('start_time', 0)
            kwargs['duration'] = data.get('duration')
            
        elif resize_type == 'dimensions':
            operation = 'resize_dimensions'
            kwargs['width'] = data.get('width', 1280)
            kwargs['height'] = data.get('height', 720)
            kwargs['maintain_aspect'] = data.get('maintain_aspect', True)
            kwargs['quality'] = data.get('quality', 'medium')
        else:
            return jsonify({'error': 'Invalid resize_type. Must be: filesize, duration, or dimensions'}), 400
        
        # Store job info
        with job_lock:
            jobs[job_id] = {
                'type': 'video',
                'operation': operation,
                'status': 'queued',
                'progress': 0,
                'created_at': datetime.now().isoformat()
            }
        
        # Start async processing
        thread = threading.Thread(
            target=process_video_async,
            args=(job_id, operation),
            kwargs=kwargs
        )
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'queued',
            'message': 'Video resizing started'
        }), 202
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/video/status/<job_id>', methods=['GET'])
def video_status(job_id):
    """
    Check video processing status.
    
    Args:
        job_id: Job identifier
        
    Response: JSON with status and progress
    """
    try:
        with job_lock:
            if job_id not in jobs:
                return jsonify({'error': 'Invalid job_id'}), 404
            
            job_info = jobs[job_id].copy()
        
        response = {
            'job_id': job_id,
            'status': job_info['status'],
            'progress': job_info.get('progress', 0)
        }
        
        if job_info['status'] == 'completed':
            response['download_url'] = f'/api/video/download/{job_id}'
        
        if job_info['status'] == 'failed':
            response['error'] = job_info.get('error', 'Unknown error')
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/video/download/<job_id>', methods=['GET'])
def download_video(job_id):
    """
    Download processed video.
    
    Args:
        job_id: Job identifier
        
    Response: Video file
    """
    try:
        with job_lock:
            if job_id not in jobs:
                return jsonify({'error': 'Invalid job_id'}), 404
            
            job_info = jobs[job_id]
        
        if job_info['status'] != 'completed':
            return jsonify({'error': 'Job not completed'}), 400
        
        output_filename = job_info['output_file']
        output_path = get_file_path(output_filename)
        
        if not os.path.exists(output_path):
            return jsonify({'error': 'Output file not found'}), 404
        
        return send_file(output_path, as_attachment=True,
                        download_name=f"processed_{output_filename}")
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'Photo and Video Editing API',
        'version': '1.0.0'
    }), 200


@app.route('/api/info', methods=['GET'])
def api_info():
    """Get API information and capabilities."""
    return jsonify({
        'photo_processing': {
            'filters': ['BLUR', 'CONTOUR', 'DETAIL', 'EDGE_ENHANCE', 
                       'EDGE_ENHANCE_MORE', 'FIND_EDGES', 'EMBOSS', 
                       'SHARPEN', 'SMOOTH', 'SMOOTH_MORE'],
            'enhancers': ['brightness', 'contrast', 'color', 'sharpness'],
            'enhancer_range': [0.0, 2.0],
            'supported_formats': list(ALLOWED_PHOTO_EXTENSIONS)
        },
        'video_processing': {
            'resolutions': ['1080p', '4k', '8k'],
            'quality_presets': ['high', 'medium', 'fast'],
            'resize_types': ['filesize', 'duration', 'dimensions'],
            'supported_formats': list(ALLOWED_VIDEO_EXTENSIONS)
        }
    }), 200


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("Photo and Video Editing API Server")
    print("=" * 60)
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Max photo size: {MAX_PHOTO_SIZE / (1024*1024):.0f}MB")
    print(f"Max video size: {MAX_VIDEO_SIZE / (1024*1024):.0f}MB")
    print("\nAPI Endpoints:")
    print("  Photo: /api/photo/upload, /api/photo/process, /api/photo/download/<job_id>")
    print("  Video: /api/video/upload, /api/video/upscale, /api/video/resize")
    print("         /api/video/status/<job_id>, /api/video/download/<job_id>")
    print("  Utils: /api/health, /api/info")
    print("=" * 60)
    print("\nStarting server on http://localhost:5000")
    print("Press Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
