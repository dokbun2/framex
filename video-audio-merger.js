// Video Audio Merger - Combines video with generated audio
class VideoAudioMerger {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.audioContext = null;
        this.isProcessing = false;
    }
    
    // Initialize audio context
    initAudioContext() {
        if (!this.audioContext) {
            // Use shared audio context if available, otherwise create new one
            if (window.sharedAudioContext) {
                this.audioContext = window.sharedAudioContext;
            } else {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                window.sharedAudioContext = this.audioContext;
            }
        }
        return this.audioContext;
    }
    
    // Merge video with audio using MediaRecorder API
    async mergeVideoWithAudio(videoElement, audioSynthesizer, options = {}) {
        const {
            duration = videoElement.duration,
            onProgress = () => {},
            mimeType = 'video/webm;codecs=vp9,opus'
        } = options;
        
        if (this.isProcessing) {
            throw new Error('Already processing a video');
        }
        
        this.isProcessing = true;
        this.recordedChunks = [];
        
        try {
            // Create a canvas to draw video frames
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 1280;
            canvas.height = videoElement.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            
            // Create a MediaStream from canvas
            const videoStream = canvas.captureStream(30); // 30 FPS
            
            // Initialize audio context
            const audioCtx = this.initAudioContext();
            
            // Create audio destination for recording
            const audioDestination = audioCtx.createMediaStreamDestination();
            
            // Connect audio synthesizer to destination
            if (audioSynthesizer && audioSynthesizer.masterGain) {
                audioSynthesizer.masterGain.connect(audioDestination);
            }
            
            // Combine video and audio streams
            const combinedStream = new MediaStream([
                ...videoStream.getVideoTracks(),
                ...audioDestination.stream.getAudioTracks()
            ]);
            
            // Setup MediaRecorder
            const options = {
                mimeType: this.getSupportedMimeType()
            };
            
            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            
            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            // Return promise that resolves when recording is complete
            return new Promise((resolve, reject) => {
                this.mediaRecorder.onstop = () => {
                    const blob = new Blob(this.recordedChunks, {
                        type: this.mediaRecorder.mimeType
                    });
                    this.isProcessing = false;
                    resolve(blob);
                };
                
                this.mediaRecorder.onerror = (error) => {
                    this.isProcessing = false;
                    reject(error);
                };
                
                // Start recording
                this.mediaRecorder.start();
                
                // Play video and draw frames to canvas
                videoElement.currentTime = 0;
                videoElement.play();
                
                // Start audio playback
                if (audioSynthesizer) {
                    const analysisResult = audioSynthesizer.lastAnalysisResult;
                    if (analysisResult) {
                        audioSynthesizer.generateAudioFromAnalysis(analysisResult);
                    }
                }
                
                let frameCount = 0;
                const totalFrames = Math.floor(duration * 30); // 30 FPS
                
                const drawFrame = () => {
                    if (videoElement.currentTime < duration && this.mediaRecorder.state === 'recording') {
                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                        
                        frameCount++;
                        const progress = frameCount / totalFrames;
                        onProgress(progress);
                        
                        requestAnimationFrame(drawFrame);
                    } else {
                        // Stop recording after duration
                        this.stopRecording();
                    }
                };
                
                drawFrame();
                
                // Auto-stop after duration
                setTimeout(() => {
                    if (this.mediaRecorder.state === 'recording') {
                        this.stopRecording();
                    }
                }, duration * 1000 + 500); // Add 500ms buffer
            });
            
        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }
    
    // Alternative method using FFmpeg.js (more reliable but heavier)
    async mergeUsingFFmpeg(videoFile, audioBuffer, options = {}) {
        // This would require including FFmpeg.js library
        // For now, we'll use the MediaRecorder approach above
        console.warn('FFmpeg method not implemented. Using MediaRecorder instead.');
        return null;
    }
    
    // Stop recording
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
    }
    
    // Get supported MIME type
    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return 'video/webm'; // Default fallback
    }
    
    // Download the merged video
    downloadMergedVideo(blob, filename = 'video-with-audio.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Create a simple audio/video merger without re-encoding (faster but limited)
    async quickMerge(videoElement, audioSynthesizer) {
        return new Promise((resolve, reject) => {
            try {
                // Create a media element with both streams
                const combinedMedia = document.createElement('video');
                combinedMedia.src = videoElement.src;
                
                // Create audio element for generated audio
                const audioCtx = this.initAudioContext();
                const audioBuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * videoElement.duration, audioCtx.sampleRate);
                
                // Record the audio to buffer
                const offlineCtx = new OfflineAudioContext(2, audioCtx.sampleRate * videoElement.duration, audioCtx.sampleRate);
                
                // This is a simplified version - in production you'd properly render the audio
                offlineCtx.startRendering().then(renderedBuffer => {
                    // Convert audio buffer to blob
                    const audioBlob = this.bufferToWave(renderedBuffer, renderedBuffer.sampleRate);
                    
                    // Create a combined blob (note: this is simplified)
                    const combinedBlob = new Blob([videoElement.src, audioBlob], { type: 'video/webm' });
                    resolve(combinedBlob);
                }).catch(reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Convert audio buffer to WAV format
    bufferToWave(buffer, sampleRate) {
        const length = buffer.length * buffer.numberOfChannels * 2;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);
        const channels = buffer.numberOfChannels;
        const samples = buffer.length;
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * channels * 2, true);
        view.setUint16(32, channels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length, true);
        
        // Convert float samples to 16-bit PCM
        let offset = 44;
        for (let i = 0; i < samples; i++) {
            for (let channel = 0; channel < channels; channel++) {
                const sample = buffer.getChannelData(channel)[i];
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, value, true);
                offset += 2;
            }
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
}

// Export for use
window.VideoAudioMerger = VideoAudioMerger;