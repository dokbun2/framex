// Audio Generator JavaScript
let audioContext = null;  // Shared audio context
let currentVideo = null;
let bgmBuffer = null;
let sfxBuffers = {};
let bgmSource = null;
let analyser = null;
let isPlaying = false;
let geminiAnalyzer = null;
let motionDetector = null;
let enhancedAudioEngine = null;

// Initialize Audio Context - SHARED INSTANCE
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        // Store in window for global access
        window.sharedAudioContext = audioContext;
    }
    return audioContext;
}

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    console.log('Audio Generator: Initializing...');
    
    // Get all elements first
    const videoUploadBox = document.getElementById('videoUploadBox');
    const videoInput = document.getElementById('videoInput');
    
    // Debug log
    console.log('Elements found:', {
        videoUploadBox: !!videoUploadBox,
        videoInput: !!videoInput
    });
    
    // Check if critical elements exist
    if (!videoUploadBox || !videoInput) {
        console.error('Audio Generator: Critical elements not found!', {
            videoUploadBox: videoUploadBox,
            videoInput: videoInput
        });
        return;
    }
    const videoPreview = document.getElementById('videoPreview');
    const videoInfo = document.getElementById('videoInfo');
    const fileName = document.getElementById('fileName');
    const duration = document.getElementById('duration');
    
    const bgmVolume = document.getElementById('bgmVolume');
    const bgmVolumeValue = document.getElementById('bgmVolumeValue');
    const sfxVolume = document.getElementById('sfxVolume');
    const sfxVolumeValue = document.getElementById('sfxVolumeValue');
    
    const applyAudio = document.getElementById('applyAudio');
    const downloadResult = document.getElementById('downloadResult');
    
    const audioVisualizer = document.getElementById('audioVisualizer');
    const canvasCtx = audioVisualizer ? audioVisualizer.getContext('2d') : null;
    
    // Gemini AI Elements
    const geminiApiKey = document.getElementById('geminiApiKey');
    const saveApiKey = document.getElementById('saveApiKey');
    const apiKeySection = document.getElementById('apiKeySection');
    const aiControls = document.getElementById('aiControls');
    const analyzeVideo = document.getElementById('analyzeVideo');
    const autoApply = document.getElementById('autoApply');
    const analysisProgress = document.getElementById('analysisProgress');
    const analyzeProgressFill = document.getElementById('analyzeProgressFill');
    const analyzeProgressText = document.getElementById('analyzeProgressText');
    
    // Initialize modules with error handling
    try {
        // Initialize shared audio context first
        initAudioContext();
        console.log('Audio context initialized');
        
        // Initialize Gemini Analyzer
        geminiAnalyzer = new GeminiAnalyzer();
        console.log('Gemini Analyzer initialized');
        
        // Initialize Motion Detector
        motionDetector = new MotionDetector();
        console.log('Motion Detector initialized');
        
        // Initialize Enhanced Audio Engine
        enhancedAudioEngine = new EnhancedAudioEngine();
        console.log('Enhanced Audio Engine initialized');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
    
    // Real-time motion tracking variables
    let motionTrackingInterval = null;
    let isMotionTracking = false;
    
    // Check for saved API key
    if (geminiAnalyzer.loadApiKey()) {
        if (geminiApiKey) geminiApiKey.value = '••••••••••••••••••••';
        if (apiKeySection) apiKeySection.style.display = 'none';
        if (aiControls) aiControls.style.display = 'block';
    }
    
    // Save API Key
    if (saveApiKey && geminiApiKey) {
        saveApiKey.addEventListener('click', () => {
            const key = geminiApiKey.value.trim();
            if (key) {
                geminiAnalyzer.setApiKey(key);
                geminiApiKey.value = '••••••••••••••••••••';
                if (apiKeySection) apiKeySection.style.display = 'none';
                if (aiControls) aiControls.style.display = 'block';
                showNotification('API Key 저장됨', 'success');
            } else {
                showNotification('API Key를 입력해주세요', 'error');
            }
        });
    }
    
    // Analyze Video Button
    if (analyzeVideo) {
        analyzeVideo.addEventListener('click', async () => {
        if (!currentVideo) {
            showNotification('먼저 비디오를 업로드해주세요', 'error');
            return;
        }
        
        analyzeVideo.disabled = true;
        analysisProgress.style.display = 'block';
        
        try {
            // Initialize enhanced audio engine
            await enhancedAudioEngine.initialize();
            
            // Reset motion detector
            motionDetector.reset();
            
            // Analyze video with enhanced settings
            const recommendation = await geminiAnalyzer.analyzeVideo(currentVideo, {
                sampleRate: 0.5, // Analyze every 0.5 seconds for better motion detection
                maxFrames: 16,  // More frames for better temporal analysis
                onProgress: (progress) => {
                    const percentage = Math.round(progress * 100);
                    analyzeProgressFill.style.width = `${percentage}%`;
                    analyzeProgressText.textContent = `${percentage}%`;
                    
                    // Also analyze motion for each frame
                    const motionData = motionDetector.analyzeMotion(currentVideo);
                    console.log('Motion detected:', motionData);
                }
            });
            
            if (recommendation) {
                // Get motion summary
                const motionSummary = motionDetector.getMotionSummary();
                console.log('Motion summary:', motionSummary);
                
                if (autoApply.checked) {
                    // Use enhanced audio engine with motion data
                    if (motionSummary) {
                        enhancedAudioEngine.generateFromMotion(
                            motionSummary,
                            recommendation.analysisDetails[0]?.analysis
                        );
                        showNotification('🎵 동적 오디오 생성 완료! 움직임에 맞춰 음악이 재생됩니다.', 'success');
                    } else {
                        // Fallback to original synthesizer
                        geminiAnalyzer.applyRecommendations(recommendation);
                        showNotification('AI 분석 완료! 추천 설정이 적용되었습니다.', 'success');
                    }
                    
                    // Enable download button and show audio controls
                    const downloadBtn = document.getElementById('downloadWithAudio');
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                    const stopBtn = document.getElementById('stopAudio');
                    if (stopBtn) {
                        stopBtn.style.display = 'inline-flex';
                    }
                    const audioInfo = document.getElementById('generatedAudioInfo');
                    if (audioInfo) {
                        audioInfo.style.display = 'block';
                    }
                    
                    // Update audio status
                    const audioStatus = document.getElementById('audioStatus');
                    if (audioStatus && motionSummary) {
                        audioStatus.innerHTML = `
                            <p><strong>움직임 패턴:</strong> ${motionSummary.pattern}</p>
                            <p><strong>평균 강도:</strong> ${(motionSummary.averageIntensity * 100).toFixed(1)}%</p>
                            <p><strong>추천 BPM:</strong> ${motionSummary.suggestedTempo}</p>
                        `;
                    }
                    
                    // Start visualizer with enhanced engine
                    if (enhancedAudioEngine && enhancedAudioEngine.analyser) {
                        startEnhancedVisualizer();
                        startRealtimeMotionTracking();
                    } else if (window.audioSynthesizer && window.audioSynthesizer.analyser) {
                        startVisualizer();
                    }
                } else {
                    geminiAnalyzer.displayAnalysisResults(recommendation);
                    showNotification('AI 분석 완료! 결과를 확인하세요.', 'success');
                }
            } else {
                showNotification('분석에 실패했습니다. 다시 시도해주세요.', 'error');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            showNotification('분석 중 오류가 발생했습니다: ' + error.message, 'error');
        } finally {
            analyzeVideo.disabled = false;
            analysisProgress.style.display = 'none';
            analyzeProgressFill.style.width = '0%';
            analyzeProgressText.textContent = '0%';
        }
        });
    }


    // Video Upload
    if (videoUploadBox && videoInput) {
        videoUploadBox.addEventListener('click', () => {
            videoInput.click();
        });

        videoUploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            videoUploadBox.classList.add('drag-over');
        });

        videoUploadBox.addEventListener('dragleave', () => {
            videoUploadBox.classList.remove('drag-over');
        });

        videoUploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            videoUploadBox.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                handleVideoUpload(files[0]);
            }
        });

        videoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleVideoUpload(e.target.files[0]);
            }
        });
        
        console.log('Video upload event listeners attached successfully');
    } else {
        console.error('Cannot attach video upload listeners - elements missing');
    }

    // Handle video upload
    function handleVideoUpload(file) {
        const videoURL = URL.createObjectURL(file);
        
        videoPreview.src = videoURL;
        videoPreview.style.display = 'block';
        videoUploadBox.style.display = 'none';
        videoInfo.style.display = 'block';
        
        fileName.textContent = file.name;
        
        videoPreview.addEventListener('loadedmetadata', () => {
            duration.textContent = videoPreview.duration.toFixed(2);
            currentVideo = videoPreview; // Set currentVideo to the video element for Gemini analysis
            
            // Enable analyze button if API key is set
            if (geminiAnalyzer && geminiAnalyzer.apiKey) {
                analyzeVideo.disabled = false;
            }
        });
        
        // Add video playback event listeners for motion tracking
        videoPreview.addEventListener('play', () => {
            if (enhancedAudioEngine && enhancedAudioEngine.isPlaying && !isMotionTracking) {
                startRealtimeMotionTracking();
            }
        });
        
        videoPreview.addEventListener('pause', () => {
            if (isMotionTracking) {
                stopRealtimeMotionTracking();
            }
        });
        
        videoPreview.addEventListener('ended', () => {
            if (isMotionTracking) {
                stopRealtimeMotionTracking();
            }
            if (enhancedAudioEngine) {
                enhancedAudioEngine.stopAll();
            }
        });
    }

    // Volume Controls
    if (bgmVolume) {
        bgmVolume.addEventListener('input', (e) => {
            bgmVolumeValue.textContent = e.target.value + '%';
            if (bgmSource && bgmSource.gainNode) {
                bgmSource.gainNode.gain.value = e.target.value / 100;
            }
            if (enhancedAudioEngine && enhancedAudioEngine.masterGain) {
                enhancedAudioEngine.masterGain.gain.value = e.target.value / 100;
            }
        });
    }

    if (sfxVolume) {
        sfxVolume.addEventListener('input', (e) => {
            sfxVolumeValue.textContent = e.target.value + '%';
        });
    }

    // Load BGM
    async function loadBGM(type) {
        initAudioContext();
        
        // In a real implementation, you would load actual audio files
        // For demo, we'll create synthetic sounds
        bgmBuffer = await createSyntheticBGM(type);
    }

    // Create synthetic BGM (placeholder)
    async function createSyntheticBGM(type) {
        const sampleRate = audioContext.sampleRate;
        const duration = 10; // 10 seconds loop
        const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
        
        // Generate different patterns based on type
        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                switch(type) {
                    case 'ambient':
                        // Soft sine waves
                        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1 * 
                                        Math.sin(2 * Math.PI * 0.1 * i / sampleRate);
                        break;
                    case 'cinematic':
                        // Low frequency rumble
                        channelData[i] = Math.sin(2 * Math.PI * 60 * i / sampleRate) * 0.15 * 
                                        Math.sin(2 * Math.PI * 0.05 * i / sampleRate);
                        break;
                    case 'upbeat':
                        // Higher frequency with rhythm
                        channelData[i] = Math.sin(2 * Math.PI * 880 * i / sampleRate) * 0.1 * 
                                        (Math.floor(i / (sampleRate * 0.25)) % 2);
                        break;
                    case 'dramatic':
                        // Building intensity
                        channelData[i] = Math.sin(2 * Math.PI * 220 * i / sampleRate) * 
                                        (i / channelData.length) * 0.2;
                        break;
                    case 'peaceful':
                        // Gentle waves
                        channelData[i] = Math.sin(2 * Math.PI * 330 * i / sampleRate) * 0.05 * 
                                        Math.cos(2 * Math.PI * 0.2 * i / sampleRate);
                        break;
                }
            }
        }
        
        return buffer;
    }

    // Stop BGM
    function stopBGM() {
        if (bgmSource) {
            bgmSource.stop();
            bgmSource = null;
        }
    }

    // Play BGM
    function playBGM() {
        if (bgmBuffer) {
            stopBGM();
            bgmSource = audioContext.createBufferSource();
            bgmSource.buffer = bgmBuffer;
            bgmSource.loop = true;
            
            const gainNode = audioContext.createGain();
            gainNode.gain.value = bgmVolume.value / 100;
            bgmSource.gainNode = gainNode;
            
            bgmSource.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioContext.destination);
            
            bgmSource.start();
        }
    }

    // Effect buttons
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playEffect(btn.dataset.effect);
        });
    });

    // Play sound effect
    function playEffect(type) {
        initAudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const now = audioContext.currentTime;
        gainNode.gain.value = sfxVolume.value / 100;
        
        switch(type) {
            case 'click':
                oscillator.frequency.value = 1000;
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                break;
            case 'whoosh':
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                break;
            case 'impact':
                oscillator.frequency.value = 50;
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                break;
            case 'transition':
                oscillator.frequency.setValueAtTime(500, now);
                oscillator.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                break;
        }
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    // Remove preview audio button handler as it doesn't exist in HTML

    // Audio Visualizer
    function startVisualizer() {
        if (!analyser) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function draw() {
            if (!isPlaying) return;
            
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = '#000';
            canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);
            
            const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                const r = 229;
                const g = 9;
                const b = 20;
                
                canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                canvasCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }

    // Apply audio to video
    if (applyAudio) {
        applyAudio.addEventListener('click', async () => {
            if (!currentVideo) {
                showNotification('먼저 비디오를 업로드해주세요.', 'error');
                return;
            }
            
            showProgressModal();
            
            // In a real implementation, you would:
            // 1. Use MediaRecorder API to combine video and audio
            // 2. Process with Web Audio API
            // 3. Export the combined file
            
            setTimeout(() => {
                hideProgressModal();
                if (downloadResult) {
                    downloadResult.disabled = false;
                }
                showNotification('오디오가 성공적으로 적용되었습니다!', 'success');
            }, 2000);
        });
    }

    // Download result
    if (downloadResult) {
        downloadResult.addEventListener('click', () => {
            // In a real implementation, download the processed video
            showNotification('다운로드 기능은 준비 중입니다.', 'info');
        });
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#28A745' : type === 'error' ? '#DC3545' : '#5B5FDE'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Progress modal
    function showProgressModal() {
        document.getElementById('progressModal').style.display = 'flex';
        const progressFill = document.getElementById('progressFill');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 180);
    }

    function hideProgressModal() {
        document.getElementById('progressModal').style.display = 'none';
    }
    
    // Stop Audio button
    const stopAudioBtn = document.getElementById('stopAudio');
    if (stopAudioBtn) {
        stopAudioBtn.addEventListener('click', () => {
            // Stop real-time motion tracking if active
            if (typeof stopRealtimeMotionTracking === 'function') {
                stopRealtimeMotionTracking();
            }
            
            // Stop enhanced audio engine
            if (enhancedAudioEngine && enhancedAudioEngine.stopAll) {
                try {
                    enhancedAudioEngine.stopAll();
                } catch (e) {
                    console.error('Error stopping enhanced audio:', e);
                }
            }
            
            // Stop audio synthesizer
            if (window.audioSynthesizer && window.audioSynthesizer.stopAll) {
                try {
                    window.audioSynthesizer.stopAll();
                } catch (e) {
                    console.error('Error stopping synthesizer:', e);
                }
            }
            
            // Stop any BGM that might be playing
            if (typeof stopBGM === 'function') {
                stopBGM();
            }
            
            // Update UI
            stopAudioBtn.style.display = 'none';
            isPlaying = false;
            showNotification('오디오 재생이 정지되었습니다.', 'info');
        });
    }
    
    // Download with Audio button
    const downloadWithAudioBtn = document.getElementById('downloadWithAudio');
    if (downloadWithAudioBtn) {
        downloadWithAudioBtn.addEventListener('click', async () => {
            if (!currentVideo) {
                showNotification('먼저 비디오를 업로드해주세요.', 'error');
                return;
            }
            
            // Check if audio has been generated
            const hasAudio = (window.audioSynthesizer && window.audioSynthesizer.isPlaying) || 
                           (enhancedAudioEngine && enhancedAudioEngine.isPlaying);
            
            if (!hasAudio) {
                showNotification('먼저 비디오를 분석하고 오디오를 생성해주세요.', 'error');
                return;
            }
            
            // Check if VideoAudioMerger is available
            if (typeof VideoAudioMerger === 'undefined') {
                showNotification('비디오 병합 모듈을 로드할 수 없습니다. 페이지를 새로고침해주세요.', 'error');
                return;
            }
            
            const merger = new VideoAudioMerger();
            showProgressModal();
            
            try {
                // Stop current playback
                if (enhancedAudioEngine && enhancedAudioEngine.stopAll) {
                    enhancedAudioEngine.stopAll();
                }
                if (window.audioSynthesizer && window.audioSynthesizer.stopAll) {
                    window.audioSynthesizer.stopAll();
                }
                
                // Use the appropriate audio engine for merging
                const audioEngine = enhancedAudioEngine || window.audioSynthesizer;
                
                // Merge video with audio
                const mergedBlob = await merger.mergeVideoWithAudio(
                    currentVideo,
                    audioEngine,
                    {
                        duration: currentVideo.duration,
                        onProgress: (progress) => {
                            const progressFill = document.getElementById('progressFill');
                            if (progressFill) {
                                progressFill.style.width = `${Math.round(progress * 100)}%`;
                            }
                        }
                    }
                );
                
                // Download the merged video
                merger.downloadMergedVideo(mergedBlob, 'video-with-ai-audio.webm');
                showNotification('비디오와 오디오가 성공적으로 합쳐졌습니다!', 'success');
                
            } catch (error) {
                console.error('Merge error:', error);
                showNotification('비디오 병합 중 오류가 발생했습니다: ' + error.message, 'error');
            } finally {
                hideProgressModal();
            }
        });
    }
    
    // Enhanced visualizer function for motion-based audio
    function startEnhancedVisualizer() {
        if (!enhancedAudioEngine || !enhancedAudioEngine.analyser) return;
        
        const canvas = document.getElementById('audioVisualizer');
        const canvasCtx = canvas.getContext('2d');
        const analyser = enhancedAudioEngine.analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function draw() {
            if (!enhancedAudioEngine.isPlaying) {
                canvasCtx.fillStyle = '#181818';
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                return;
            }
            
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            // Create gradient background
            const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(1, '#0a0a0a');
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                
                // Color based on frequency and motion
                const hue = (i / bufferLength) * 120 + 180; // Blue to purple
                const saturation = 50 + (dataArray[i] / 255) * 50;
                const lightness = 30 + (dataArray[i] / 255) * 40;
                
                canvasCtx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
                
                // Add glow effect for high intensity
                if (dataArray[i] > 200) {
                    canvasCtx.shadowBlur = 10;
                    canvasCtx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, 2);
                    canvasCtx.shadowBlur = 0;
                }
                
                x += barWidth;
            }
        }
        
        draw();
    }
    
    // Original visualizer function
    function startVisualizer() {
        if (!window.audioSynthesizer || !window.audioSynthesizer.analyser) return;
        
        const canvas = document.getElementById('audioVisualizer');
        const canvasCtx = canvas.getContext('2d');
        const analyser = window.audioSynthesizer.analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function draw() {
            if (!window.audioSynthesizer.isPlaying) {
                // Clear canvas when not playing
                canvasCtx.fillStyle = '#181818';
                canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                return;
            }
            
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = '#181818';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                
                // Gradient colors
                const r = barHeight + 25 * (i / bufferLength);
                const g = 250 * (i / bufferLength);
                const b = 50;
                
                canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }
    
    // Real-time motion tracking during playback
    function startRealtimeMotionTracking() {
        if (isMotionTracking || !currentVideo || !enhancedAudioEngine) return;
        
        isMotionTracking = true;
        const motionCanvas = document.createElement('canvas');
        const motionUpdateFrequency = 200; // Update every 200ms
        let frameCount = 0;
        
        // Create motion intensity display
        let motionDisplay = document.getElementById('motionIntensityDisplay');
        if (!motionDisplay) {
            motionDisplay = document.createElement('div');
            motionDisplay.id = 'motionIntensityDisplay';
            motionDisplay.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 1000;
                min-width: 200px;
            `;
            document.body.appendChild(motionDisplay);
        }
        
        // Start tracking
        motionTrackingInterval = setInterval(() => {
            if (!currentVideo.paused && !currentVideo.ended) {
                // Analyze current frame motion
                const motionData = motionDetector.analyzeMotion(currentVideo);
                frameCount++;
                
                // Update display
                if (motionDisplay) {
                    const intensityBar = '█'.repeat(Math.floor(motionData.intensity * 20));
                    const emptyBar = '░'.repeat(20 - Math.floor(motionData.intensity * 20));
                    
                    motionDisplay.innerHTML = `
                        <div><strong>🎬 실시간 모션 추적</strong></div>
                        <div>강도: ${intensityBar}${emptyBar}</div>
                        <div>타입: ${translateMotionType(motionData.type)}</div>
                        <div>패턴: ${translatePattern(motionData.pattern)}</div>
                        <div>프레임: ${frameCount}</div>
                    `;
                }
                
                // Update audio parameters every 5 frames
                if (frameCount % 5 === 0) {
                    const motionSummary = motionDetector.getMotionSummary();
                    if (motionSummary && enhancedAudioEngine.isPlaying) {
                        enhancedAudioEngine.updateFromMotion(motionSummary);
                        
                        // Add visual feedback for audio changes
                        if (motionSummary.suggestedTempo !== enhancedAudioEngine.currentTempo) {
                            showMiniNotification(`BPM → ${motionSummary.suggestedTempo}`, 'tempo');
                        }
                    }
                }
                
                // Detect specific events and trigger sounds
                if (motionData.intensity > 0.4 && motionData.type === 'intense') {
                    enhancedAudioEngine.playEventSound('collision', 0.1);
                }
            } else if (currentVideo.ended) {
                stopRealtimeMotionTracking();
            }
        }, motionUpdateFrequency);
        
        console.log('Real-time motion tracking started');
    }
    
    // Stop real-time motion tracking
    function stopRealtimeMotionTracking() {
        if (motionTrackingInterval) {
            clearInterval(motionTrackingInterval);
            motionTrackingInterval = null;
        }
        isMotionTracking = false;
        
        // Remove motion display
        const motionDisplay = document.getElementById('motionIntensityDisplay');
        if (motionDisplay) {
            motionDisplay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                motionDisplay.remove();
            }, 300);
        }
        
        console.log('Real-time motion tracking stopped');
    }
    
    // Translation helpers for motion display
    function translateMotionType(type) {
        const translations = {
            'static': '정적',
            'minimal': '최소',
            'moderate': '보통',
            'active': '활발',
            'intense': '강렬'
        };
        return translations[type] || type;
    }
    
    function translatePattern(pattern) {
        const translations = {
            'rhythmic': '리듬',
            'continuous': '연속',
            'variable': '가변',
            'steady': '일정',
            'static': '정적',
            'unknown': '미확인'
        };
        return translations[pattern] || pattern;
    }
    
    // Mini notification for real-time updates
    function showMiniNotification(message, type = 'info') {
        const mini = document.createElement('div');
        mini.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 12px;
            background: ${type === 'tempo' ? '#FF6B6B' : '#5B5FDE'};
            color: white;
            border-radius: 20px;
            font-size: 11px;
            z-index: 2000;
            animation: bounceIn 0.3s ease;
        `;
        mini.textContent = message;
        document.body.appendChild(mini);
        
        setTimeout(() => {
            mini.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => mini.remove(), 300);
        }, 1500);
    }
    
    // Final initialization check
    console.log('Audio Generator: Full initialization complete');
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes bounceIn {
        0% {
            transform: scale(0.8) translateY(10px);
            opacity: 0;
        }
        50% {
            transform: scale(1.05) translateY(-2px);
        }
        100% {
            transform: scale(1) translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);