"""
Video Processing Module
=======================
Implements video upscaling and resizing functionality using FFmpeg-python.

Based on research documentation from video_processing.txt
Information Date: January 30, 2024 - September 17, 2025
"""

import ffmpeg
import os
from pathlib import Path
from typing import Dict, Tuple, Optional


class VideoProcessor:
    """
    Complete video processing class for upscaling and resizing operations.
    
    Supports:
    - Upscaling to 1080p, 4K, and 8K resolutions
    - Resizing by file size (bitrate adjustment)
    - Trimming by duration
    - Multiple quality presets
    """
    
    # Standard resolution definitions
    RESOLUTIONS = {
        '1080p': (1920, 1080),
        '4k': (3840, 2160),
        '8k': (7680, 4320),
        '720p': (1280, 720),
        '480p': (854, 480)
    }
    
    # Quality settings based on research recommendations
    QUALITY_SETTINGS = {
        'high': {
            'crf': 18,           # Visually lossless
            'preset': 'slow',    # Best quality encoding
            'flags': 'lanczos'   # Highest quality scaling
        },
        'medium': {
            'crf': 23,           # Default good quality
            'preset': 'medium',  # Balanced encoding
            'flags': 'bicubic'   # Good quality scaling
        },
        'fast': {
            'crf': 28,           # Acceptable web quality
            'preset': 'fast',    # Quick encoding
            'flags': 'bilinear'  # Fast scaling
        }
    }
    
    def __init__(self, input_path: str):
        """
        Initialize video processor with input file.
        
        Args:
            input_path: Path to input video file
            
        Raises:
            FileNotFoundError: If input file doesn't exist
            ffmpeg.Error: If video cannot be probed
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input video not found: {input_path}")
        
        self.input_path = input_path
        
        try:
            self.probe_data = ffmpeg.probe(input_path)
            self.video_info = next(
                s for s in self.probe_data['streams'] 
                if s['codec_type'] == 'video'
            )
        except ffmpeg.Error as e:
            raise ffmpeg.Error(f"Failed to probe video: {e.stderr.decode() if e.stderr else str(e)}")
    
    def get_video_info(self) -> Dict:
        """
        Get current video information.
        
        Returns:
            Dictionary containing video metadata:
            - width: Video width in pixels
            - height: Video height in pixels
            - duration: Duration in seconds
            - size_mb: File size in megabytes
            - codec: Video codec name
            - fps: Frames per second
        """
        return {
            'width': int(self.video_info['width']),
            'height': int(self.video_info['height']),
            'duration': float(self.probe_data['format']['duration']),
            'size_mb': os.path.getsize(self.input_path) / (1024 * 1024),
            'codec': self.video_info['codec_name'],
            'fps': eval(self.video_info['r_frame_rate'])
        }
    
    def upscale(self, output_path: str, resolution: str = '1080p', 
                quality: str = 'high') -> bool:
        """
        Upscale video to target resolution.
        
        Implementation based on FFmpeg-python method from research documentation.
        Uses high-quality scaling algorithms (lanczos/bicubic) and H.264 codec.
        
        Args:
            output_path: Output file path
            resolution: Target resolution ('1080p', '4k', or '8k')
            quality: Quality preset ('high', 'medium', or 'fast')
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If resolution or quality preset is invalid
        """
        if resolution not in self.RESOLUTIONS:
            raise ValueError(f"Invalid resolution. Must be one of: {list(self.RESOLUTIONS.keys())}")
        
        if quality not in self.QUALITY_SETTINGS:
            raise ValueError(f"Invalid quality. Must be one of: {list(self.QUALITY_SETTINGS.keys())}")
        
        width, height = self.RESOLUTIONS[resolution]
        settings = self.QUALITY_SETTINGS[quality]
        
        try:
            (
                ffmpeg
                .input(self.input_path)
                .filter('scale', width, height, flags=settings['flags'])
                .output(
                    output_path,
                    vcodec='libx264',           # H.264 codec for best compatibility
                    crf=settings['crf'],        # Quality level
                    preset=settings['preset'],  # Encoding speed/quality tradeoff
                    acodec='aac',               # AAC audio codec
                    audio_bitrate='192k'        # High quality audio
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return True
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"Upscaling error: {error_msg}")
            return False
    
    def resize_by_filesize(self, output_path: str, target_mb: float) -> bool:
        """
        Resize video to target file size by adjusting bitrate.
        
        Implementation based on bitrate calculation method from research.
        Formula: (target_size_mb * 8192) / duration - audio_bitrate
        
        Args:
            output_path: Output file path
            target_mb: Target file size in megabytes
            
        Returns:
            True if successful, False otherwise
        """
        try:
            duration = float(self.probe_data['format']['duration'])
            audio_bitrate = 128  # kbps
            
            # Calculate target video bitrate
            target_bitrate = int((target_mb * 8192) / duration - audio_bitrate)
            
            # Ensure minimum quality
            if target_bitrate < 100:
                print(f"Warning: Target size too small ({target_mb}MB). "
                      f"Minimum bitrate of 100kbps will be used.")
                target_bitrate = 100
            
            (
                ffmpeg
                .input(self.input_path)
                .output(
                    output_path,
                    video_bitrate=f'{target_bitrate}k',
                    audio_bitrate=f'{audio_bitrate}k',
                    vcodec='libx264',
                    acodec='aac'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            # Verify output size
            output_size = os.path.getsize(output_path) / (1024 * 1024)
            print(f"Resize complete - Target: {target_mb}MB, Actual: {output_size:.2f}MB")
            return True
            
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"Resize by filesize error: {error_msg}")
            return False
    
    def trim(self, output_path: str, start_time: float = 0, 
             duration: Optional[float] = None) -> bool:
        """
        Trim video to specific duration.
        
        Uses stream copy mode for fast processing without re-encoding.
        
        Args:
            output_path: Output file path
            start_time: Start time in seconds (default: 0)
            duration: Duration in seconds (None = to end of video)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if duration:
                stream = ffmpeg.input(self.input_path, ss=start_time, t=duration)
            else:
                stream = ffmpeg.input(self.input_path, ss=start_time)
            
            (
                stream
                .output(output_path, vcodec='copy', acodec='copy')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return True
            
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"Trim error: {error_msg}")
            return False
    
    def resize_by_dimensions(self, output_path: str, width: int, height: int,
                            maintain_aspect: bool = True, quality: str = 'medium') -> bool:
        """
        Resize video to specific dimensions.
        
        Args:
            output_path: Output file path
            width: Target width in pixels
            height: Target height in pixels
            maintain_aspect: Whether to maintain aspect ratio
            quality: Quality preset ('high', 'medium', or 'fast')
            
        Returns:
            True if successful, False otherwise
        """
        if quality not in self.QUALITY_SETTINGS:
            raise ValueError(f"Invalid quality. Must be one of: {list(self.QUALITY_SETTINGS.keys())}")
        
        settings = self.QUALITY_SETTINGS[quality]
        
        try:
            stream = ffmpeg.input(self.input_path)
            
            if maintain_aspect:
                # Use -1 for one dimension to maintain aspect ratio
                stream = stream.filter('scale', width, -1)
            else:
                stream = stream.filter('scale', width, height)
            
            (
                stream
                .output(
                    output_path,
                    vcodec='libx264',
                    crf=settings['crf'],
                    preset=settings['preset'],
                    acodec='aac',
                    audio_bitrate='192k'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return True
            
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"Resize by dimensions error: {error_msg}")
            return False


def validate_video_format(filename: str) -> bool:
    """
    Validate if file format is supported.
    
    Supported formats based on research: MP4, AVI, MOV, MKV, WebM, FLV, WMV
    
    Args:
        filename: Name of the video file
        
    Returns:
        True if format is supported, False otherwise
    """
    supported_formats = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv']
    file_ext = Path(filename).suffix.lower()
    return file_ext in supported_formats


def get_video_metadata(video_path: str) -> Dict:
    """
    Get video metadata without creating VideoProcessor instance.
    
    Args:
        video_path: Path to video file
        
    Returns:
        Dictionary with video metadata
        
    Raises:
        ffmpeg.Error: If video cannot be probed
    """
    try:
        probe_data = ffmpeg.probe(video_path)
        video_stream = next(s for s in probe_data['streams'] if s['codec_type'] == 'video')
        
        return {
            'width': int(video_stream['width']),
            'height': int(video_stream['height']),
            'duration': float(probe_data['format']['duration']),
            'size_mb': os.path.getsize(video_path) / (1024 * 1024),
            'codec': video_stream['codec_name'],
            'fps': eval(video_stream['r_frame_rate']),
            'format': probe_data['format']['format_name']
        }
    except Exception as e:
        raise ffmpeg.Error(f"Failed to get video metadata: {str(e)}")


# Example usage and testing
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python video_processor.py <input_video>")
        sys.exit(1)
    
    input_video = sys.argv[1]
    
    try:
        # Create processor
        processor = VideoProcessor(input_video)
        
        # Get and display video info
        info = processor.get_video_info()
        print("\nVideo Information:")
        print(f"  Resolution: {info['width']}x{info['height']}")
        print(f"  Duration: {info['duration']:.2f} seconds")
        print(f"  Size: {info['size_mb']:.2f} MB")
        print(f"  Codec: {info['codec']}")
        print(f"  FPS: {info['fps']:.2f}")
        
        # Example operations (commented out to avoid accidental processing)
        # processor.upscale('output_4k.mp4', resolution='4k', quality='high')
        # processor.resize_by_filesize('output_50mb.mp4', target_mb=50)
        # processor.trim('output_trimmed.mp4', start_time=0, duration=30)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
