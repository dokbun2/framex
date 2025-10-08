// DOM Elements
const mainApp = document.getElementById('mainApp');
const fileInput = document.getElementById('fileInput');
const logoBtn = document.getElementById('logoBtn');

const video = document.getElementById('video');
const videoContainer = document.getElementById('videoContainer');
const uploadPrompt = document.getElementById('uploadPrompt');
const uploadBtn = document.getElementById('uploadBtn');
const videoControls = document.getElementById('videoControls');

const extractFrame = document.getElementById('extractFrame');
const extractAll = document.getElementById('extractAll');
const newVideo = document.getElementById('newVideo');
const intervalSelect = document.getElementById('intervalSelect');
const formatSelect = document.getElementById('formatSelect');
const scaleSelect = document.getElementById('scaleSelect');
const aiEngineSelect = document.getElementById('aiEngineSelect');
const apiKeyBtn = document.getElementById('apiKeyBtn');

const framesGrid = document.getElementById('framesGrid');
const frameCount = document.getElementById('frameCount');
const downloadAll = document.getElementById('downloadAll');
const clearAll = document.getElementById('clearAll');
const emptyState = document.getElementById('emptyState');

const progressModal = document.getElementById('progressModal');
const progressFill = document.getElementById('progressFill');
const currentProgress = document.getElementById('currentProgress');
const totalProgress = document.getElementById('totalProgress');

// Preview Modal Elements
const previewModal = document.getElementById('previewModal');
const previewImage = document.getElementById('previewImage');
const previewTimestamp = document.getElementById('previewTimestamp');
const previewDimensions = document.getElementById('previewDimensions');
const previewDownload = document.getElementById('previewDownload');
const closePreview = document.getElementById('closePreview');

// State
let currentVideo = null;
let extractedFrames = [];

// Manual API test function (for console testing) - DISABLED
/*
window.testReplicateUpscale = async function() {
    const apiKey = 'r8_O558HPn6Pw0Mr5qmgDlqRe4TXFHgmd0gQasF'; // Your API key

    // Save the API key
    localStorage.setItem('replicate_api_key', apiKey);
    console.log('API Key saved:', apiKey.substring(0, 15) + '...');

    // Create a test image (small red square)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);

    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    console.log('Test image created');

    try {
        console.log('Starting Real-ESRGAN test...');
        const result = await upscaleWithRealESRGAN(blob, 2);
        console.log('Test complete! Result:', result);

        // Create image from result to verify
        const img = new Image();
        img.src = URL.createObjectURL(result);
        img.onload = () => {
            console.log('Upscaled image dimensions:', img.width, 'x', img.height);
            document.body.appendChild(img);
            showNotification('테스트 성공! 페이지 하단에 결과 이미지가 표시됩니다.', 'success');
        };
    } catch (error) {
        console.error('Test failed:', error);
        showNotification('테스트 실패: ' + error.message, 'error');
    }
};
*/

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initializeVideoControls();
    initializeGallery();
    initializeLogo();
    initializePreviewModal();
    // initializeAPIKey(); // API 기능 비활성화
});

// Logo functionality
function initializeLogo() {
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            resetToUpload();
        });
    }
}

// API Key management
function initializeAPIKey() {
    if (apiKeyBtn) {
        apiKeyBtn.addEventListener('click', () => {
            const currentKey = localStorage.getItem('replicate_api_key') || '';
            const newKey = prompt('Replicate API 키를 입력하세요:\n\n1. https://replicate.com/account/api-tokens 에서 확인\n2. "r8_"로 시작하는 키 복사\n3. 아래에 붙여넣기', currentKey);

            if (newKey && newKey.trim()) {
                localStorage.setItem('replicate_api_key', newKey.trim());
                showNotification('API 키가 저장되었습니다.', 'success');

                // Update button UI
                apiKeyBtn.classList.add('bg-primary/20', 'border-primary/50');
                apiKeyBtn.classList.remove('bg-accent/20', 'border-border/50');
                apiKeyBtn.title = 'API 키 설정됨 (클릭하여 수정)';

                // Test API key if it's new
                if (newKey.trim() !== currentKey) {
                    testReplicateAPI(newKey.trim());
                }
            } else if (newKey === '') {
                localStorage.removeItem('replicate_api_key');
                showNotification('API 키가 제거되었습니다.', 'info');

                // Update button UI
                apiKeyBtn.classList.remove('bg-primary/20', 'border-primary/50');
                apiKeyBtn.classList.add('bg-accent/20', 'border-border/50');
                apiKeyBtn.title = 'API 키 설정 필요';
            }
        });
    }

    // Check if API key exists and update UI
    const hasApiKey = localStorage.getItem('replicate_api_key');
    if (apiKeyBtn) {
        if (hasApiKey) {
            apiKeyBtn.classList.add('bg-primary/20', 'border-primary/50');
            apiKeyBtn.classList.remove('bg-accent/20', 'border-border/50');
            apiKeyBtn.title = 'API 키 설정됨 (클릭하여 수정)';
        } else {
            apiKeyBtn.classList.remove('bg-primary/20', 'border-primary/50');
            apiKeyBtn.classList.add('bg-accent/20', 'border-border/50');
            apiKeyBtn.title = 'API 키 설정 필요';
        }
    }
}

// Test Replicate API connection
async function testReplicateAPI(apiKey) {
    try {
        showNotification('API 연결 테스트 중...', 'info');

        // Simple test: Check if API key is valid by making a minimal request
        const response = await fetch('https://api.replicate.com/v1/models/stability-ai/sdxl', {
            method: 'GET',
            headers: {
                'Authorization': `Token ${apiKey}`
            }
        });

        if (response.ok) {
            showNotification('✅ API 연결 성공! Real-ESRGAN을 사용할 수 있습니다.', 'success');
            console.log('API test successful');
        } else if (response.status === 401) {
            showNotification('❌ API 키가 올바르지 않습니다. 다시 확인해주세요.', 'error');
            console.error('Invalid API key');
        } else {
            showNotification('⚠️ API 연결 확인 실패. 키는 저장되었습니다.', 'warning');
            console.error('API test failed with status:', response.status);
        }
    } catch (error) {
        console.error('API test error:', error);
        showNotification('⚠️ 네트워크 오류. 나중에 다시 시도해주세요.', 'warning');
    }
}

// Preview Modal functionality
function initializePreviewModal() {
    // Close preview on close button click
    if (closePreview) {
        closePreview.addEventListener('click', closePreviewModal);
    }

    // Close preview on background click
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                closePreviewModal();
            }
        });
    }

    // Close preview on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewModal && !previewModal.classList.contains('hidden')) {
            closePreviewModal();
        }
    });
}

function openPreviewModal(frameData) {
    if (!previewModal || !previewImage) return;

    // Set image
    previewImage.src = frameData.url;

    // Set timestamp
    if (previewTimestamp) {
        previewTimestamp.textContent = `${frameData.timestamp}초`;
    }

    // Set dimensions
    if (previewDimensions) {
        const scaleText = frameData.scale > 1 ? ` (${frameData.scale}x 업스케일)` : '';
        previewDimensions.textContent = frameData.dimensions ?
            `${frameData.dimensions}${scaleText}` :
            `${frameData.originalWidth}x${frameData.originalHeight}`;
    }

    // Set download handler
    if (previewDownload) {
        previewDownload.onclick = () => {
            downloadFrame(frameData.url, frameData.timestamp, formatSelect.value, frameData.scale || 1);
        };
    }

    // Show modal
    previewModal.classList.remove('hidden');
}

function closePreviewModal() {
    if (previewModal) {
        previewModal.classList.add('hidden');
        if (previewImage) {
            previewImage.src = '';
        }
    }
}

// Upload functionality
function initializeUpload() {
    // Upload button click
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Drag and drop on video container
    if (videoContainer) {
        videoContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (uploadPrompt && uploadPrompt.style.display !== 'none') {
                videoContainer.classList.add('bg-accent/10');
            }
        });

        videoContainer.addEventListener('dragleave', () => {
            videoContainer.classList.remove('bg-accent/10');
        });

        videoContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            videoContainer.classList.remove('bg-accent/10');

            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                handleVideoFile(files[0]);
            } else if (files.length > 0) {
                showNotification('Please select a valid video file.', 'error');
            }
        });
    }

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoFile(e.target.files[0]);
        }
    });
}

// Video controls
function initializeVideoControls() {
    // Extract current frame
    if (extractFrame) {
        extractFrame.addEventListener('click', () => {
            if (video.readyState >= 2) {
                extractCurrentFrame();
            } else {
                showNotification('Video not loaded yet.', 'error');
            }
        });
    }

    // Extract all frames
    if (extractAll) {
        extractAll.addEventListener('click', () => {
            if (video.readyState >= 2) {
                extractAllFrames();
            } else {
                showNotification('Video not loaded yet.', 'error');
            }
        });
    }

    // New video
    if (newVideo) {
        newVideo.addEventListener('click', () => {
            resetToUpload();
        });
    }
}

// Gallery controls
function initializeGallery() {
    // Download all
    if (downloadAll) {
        downloadAll.addEventListener('click', () => {
            if (extractedFrames.length === 0) {
                showNotification('No frames to download.', 'error');
                return;
            }
            downloadAllFrames();
        });
    }

    // Clear all
    if (clearAll) {
        clearAll.addEventListener('click', () => {
            if (extractedFrames.length === 0) {
                showNotification('No frames to clear.', 'error');
                return;
            }
            if (confirm('Delete all extracted frames?')) {
                clearAllFrames();
            }
        });
    }
}

// Store event handlers globally to remove them later
let videoMetadataHandler = null;
let videoErrorHandler = null;

// Handle video file
function handleVideoFile(file) {
    // Check file size (max 500MB for web)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('File size exceeds 500MB limit.', 'error');
        return;
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
        showNotification('Please select a valid video file.', 'error');
        return;
    }

    // Remove any existing event listeners
    if (videoMetadataHandler) {
        video.removeEventListener('loadedmetadata', videoMetadataHandler);
        videoMetadataHandler = null;
    }
    if (videoErrorHandler) {
        video.removeEventListener('error', videoErrorHandler);
        videoErrorHandler = null;
    }

    currentVideo = file;
    const videoURL = URL.createObjectURL(file);

    // Hide upload prompt and show video
    if (uploadPrompt) {
        uploadPrompt.style.display = 'none';
    }
    video.classList.remove('hidden');

    // Show video controls
    if (videoControls) {
        videoControls.classList.remove('hidden');
    }

    // Create new handlers
    videoMetadataHandler = function onMetadataLoaded() {
        video.removeEventListener('loadedmetadata', videoMetadataHandler);
        videoMetadataHandler = null;

        const aspectRatio = video.videoWidth / video.videoHeight;
        const isPortrait = aspectRatio < 1;

        console.log('Video loaded:', {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: aspectRatio.toFixed(2),
            orientation: isPortrait ? 'portrait' : 'landscape',
            filename: file.name
        });

        showNotification(`Video loaded: ${file.name}`, 'success');
    };

    videoErrorHandler = function onVideoError(e) {
        if (videoErrorHandler) {
            video.removeEventListener('error', videoErrorHandler);
            videoErrorHandler = null;

            if (currentVideo) {
                console.error('Video load error:', e);
                showNotification('Failed to load video.', 'error');
                resetToUpload();
            }
        }
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', videoMetadataHandler);
    video.addEventListener('error', videoErrorHandler);

    // Set video source after listeners are attached
    video.src = videoURL;
}

// AI Upscaling API functions
async function upscaleWithAI(blob, engine, scale) {
    // API 기능 비활성화 - 항상 기본 브라우저 업스케일링 사용
    return blob;

    /*
    const aiEngine = engine || aiEngineSelect.value;

    if (aiEngine === 'none') {
        return blob; // Return original if no AI engine selected
    }

    try {
        switch(aiEngine) {
            case 'waifu2x':
                return await upscaleWithWaifu2x(blob, scale);
            case 'realesrgan':
                return await upscaleWithRealESRGAN(blob, scale);
            case 'gfpgan':
                return await upscaleWithGFPGAN(blob, scale);
            default:
                return blob;
        }
    } catch (error) {
        console.error('AI upscaling failed:', error);
        showNotification('AI 업스케일링 실패, 기본 방식으로 처리됩니다.', 'warning');
        return blob;
    }
    */
}

// waifu2x API (Free, works for anime/cartoon style)
async function upscaleWithWaifu2x(blob, scale) {
    try {
        // Alternative 1: waifu2x.udp.jp (Free, no API key needed)
        const formData = new FormData();
        const file = new File([blob], 'image.png', { type: blob.type });
        formData.append('file', file);
        formData.append('scale', Math.min(scale, 2));
        formData.append('noise', '2');

        // Note: This requires CORS proxy for browser usage
        console.log('waifu2x requires server proxy for CORS. Using browser fallback.');
        return await browserUpscale(blob, scale);

    } catch (error) {
        console.error('waifu2x API error:', error);
        return await browserUpscale(blob, scale);
    }
}

// Real-ESRGAN using Replicate API (Paid but high quality)
async function upscaleWithRealESRGAN(blob, scale) {
    try {
        // Get API key from localStorage
        const REPLICATE_API_KEY = localStorage.getItem('replicate_api_key');

        if (!REPLICATE_API_KEY) {
            showNotification('Real-ESRGAN 사용을 위해 API 키를 설정해주세요. (설정 버튼 클릭)', 'warning');
            return await browserUpscale(blob, scale);
        }

        console.log('Using Replicate API with key:', REPLICATE_API_KEY.substring(0, 10) + '...');

        // Convert blob to base64
        const base64 = await blobToBase64(blob);

        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b', // Latest Real-ESRGAN version
                input: {
                    image: base64,
                    scale: Math.min(scale, 4), // Real-ESRGAN max is 4x
                    face_enhance: false,
                    model: 'RealESRGAN_x4plus' // Best quality model
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Replicate API error:', errorData);
            throw new Error(`Replicate API error: ${response.status}`);
        }

        const prediction = await response.json();
        console.log('Prediction created:', prediction.id);

        // Poll for result
        const resultUrl = await pollReplicateResult(prediction.id, REPLICATE_API_KEY);

        if (!resultUrl) {
            throw new Error('No result URL from Replicate');
        }

        const imageResponse = await fetch(resultUrl);
        return await imageResponse.blob();

    } catch (error) {
        console.error('Real-ESRGAN API error:', error);
        showNotification('Real-ESRGAN 처리 실패, 브라우저 업스케일링 사용', 'warning');
        return await browserUpscale(blob, scale);
    }
}

// GFPGAN using MyHeritage API alternative (Face enhancement)
async function upscaleWithGFPGAN(blob, scale) {
    // Since GFPGAN is mainly for face restoration,
    // we can use AI-based face enhancement as alternative
    console.log('GFPGAN requires specialized server, using enhanced browser upscaling');

    // Apply sharpening filter after upscaling for better face details
    return await browserUpscaleWithSharpening(blob, scale);
}

// Helper: Convert blob to base64
async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Helper: Poll Replicate for result
async function pollReplicateResult(predictionId, apiKey, maxAttempts = 60) {
    console.log('Polling for result:', predictionId);

    for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                'Authorization': `Token ${apiKey}`
            }
        });

        if (!response.ok) {
            console.error('Poll error:', response.status);
            throw new Error(`Poll error: ${response.status}`);
        }

        const prediction = await response.json();
        console.log(`Attempt ${i + 1}/${maxAttempts} - Status:`, prediction.status);

        if (prediction.status === 'succeeded') {
            console.log('Prediction succeeded, output:', prediction.output);
            // Real-ESRGAN returns the image URL directly
            return prediction.output;
        } else if (prediction.status === 'failed') {
            console.error('Prediction failed:', prediction.error);
            throw new Error(`Prediction failed: ${prediction.error}`);
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Polling timeout');
}

// Enhanced browser upscaling with sharpening
async function browserUpscaleWithSharpening(blob, scale) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // First upscale
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Apply sharpening filter
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const sharpened = applySharpenFilter(imageData);
            ctx.putImageData(sharpened, 0, 0);

            canvas.toBlob((upscaledBlob) => {
                resolve(upscaledBlob);
            }, blob.type, 0.95);
        };
        img.src = URL.createObjectURL(blob);
    });
}

// Sharpening filter implementation
function applySharpenFilter(imageData) {
    const weights = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);

    const src = imageData.data;
    const sw = imageData.width;
    const sh = imageData.height;
    const w = sw;
    const h = sh;
    const output = new ImageData(w, h);
    const dst = output.data;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * w + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = sy + cy - halfSide;
                    const scx = sx + cx - halfSide;

                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        const srcOff = (scy * sw + scx) * 4;
                        const wt = weights[cy * side + cx];

                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                    }
                }
            }

            dst[dstOff] = Math.min(Math.max(r, 0), 255);
            dst[dstOff + 1] = Math.min(Math.max(g, 0), 255);
            dst[dstOff + 2] = Math.min(Math.max(b, 0), 255);
            dst[dstOff + 3] = src[dstOff + 3];
        }
    }

    return output;
}

// Browser-based upscaling fallback
async function browserUpscale(blob, scale) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // Use high quality settings
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((upscaledBlob) => {
                resolve(upscaledBlob);
            }, blob.type);
        };
        img.src = URL.createObjectURL(blob);
    });
}

// Extract current frame with upscaling
async function extractCurrentFrame() {
    const scale = parseFloat(scaleSelect.value);
    const aiEngine = aiEngineSelect.value;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Draw at original size first for AI processing
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob for processing
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, `image/${formatSelect.value}`);
    });

    let finalBlob = blob;

    // Apply AI upscaling if selected
    if (aiEngine !== 'none' && scale > 1) {
        showNotification('AI 업스케일링 처리 중...', 'info');
        finalBlob = await upscaleWithAI(blob, aiEngine, scale);
    } else if (scale > 1) {
        // Use browser upscaling
        finalBlob = await browserUpscale(blob, scale);

    }

    // Create frame element and add to gallery
    const frameUrl = URL.createObjectURL(finalBlob);
    const timestamp = video.currentTime.toFixed(2);

    // Get actual dimensions from processed image
    const img = new Image();
    img.onload = () => {
        const dimensions = `${img.width}x${img.height}`;
        addFrameToGallery(frameUrl, timestamp, finalBlob, dimensions, scale, aiEngine);

        let message = '프레임이 추출되었습니다.';
        if (aiEngine !== 'none' && scale > 1) {
            const engineName = aiEngineSelect.options[aiEngineSelect.selectedIndex].text;
            message = `${engineName}로 ${scale}배 업스케일링 완료 (${dimensions})`;
        } else if (scale > 1) {
            message = `브라우저로 ${scale}배 업스케일링 완료 (${dimensions})`;
        }
        showNotification(message, 'success');
    };
    img.src = frameUrl;
}

// Extract all frames with upscaling
async function extractAllFrames() {
    const interval = parseFloat(intervalSelect.value);
    const scale = parseFloat(scaleSelect.value);
    const aiEngine = aiEngineSelect.value;
    const duration = video.duration;
    const totalFrames = Math.floor(duration / interval);

    if (totalFrames > 100) {
        let message = `${totalFrames}개의 프레임을 추출합니다. 계속하시겠습니까?`;
        if (aiEngine !== 'none' && scale > 1) {
            const engineName = aiEngineSelect.options[aiEngineSelect.selectedIndex].text;
            message = `${totalFrames}개의 프레임을 ${engineName}로 ${scale}배 업스케일링합니다. 계속하시겠습니까?`;
        } else if (scale > 1) {
            message = `${totalFrames}개의 프레임을 ${scale}배 업스케일링합니다. 계속하시겠습니까?`;
        }
        if (!confirm(message)) {
            return;
        }
    }

    let currentFrame = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Draw at original size for processing
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const format = formatSelect.value;
    const mimeType = format === 'jpg' ? 'image/jpeg' :
                     format === 'webp' ? 'image/webp' : 'image/png';

    // Show progress modal with AI info
    progressModal.classList.remove('hidden');
    totalProgress.textContent = totalFrames;
    currentProgress.textContent = 0;
    progressFill.style.width = '0%';

    // Update progress modal text for AI processing
    const progressTitle = progressModal.querySelector('h3');
    const progressDesc = progressModal.querySelector('p');
    if (aiEngine !== 'none' && scale > 1) {
        progressTitle.textContent = 'AI 업스케일링 중';
        progressDesc.textContent = `${aiEngineSelect.options[aiEngineSelect.selectedIndex].text}로 프레임을 처리하는 중입니다...`;
    } else {
        progressTitle.textContent = '프레임 추출 중';
        progressDesc.textContent = '비디오를 처리하는 동안 잠시만 기다려주세요...';
    }

    async function extractNextFrame() {
        if (currentFrame >= totalFrames) {
            progressModal.classList.add('hidden');
            let message = `${totalFrames}개의 프레임이 추출되었습니다.`;
            if (aiEngine !== 'none' && scale > 1) {
                const engineName = aiEngineSelect.options[aiEngineSelect.selectedIndex].text;
                message = `${totalFrames}개의 프레임이 ${engineName}로 ${scale}배 업스케일링되었습니다.`;
            } else if (scale > 1) {
                message = `${totalFrames}개의 프레임이 ${scale}배 업스케일링되었습니다.`;
            }
            showNotification(message, 'success');
            return;
        }

        const timestamp = currentFrame * interval;
        video.currentTime = timestamp;

        video.addEventListener('seeked', async function onSeeked() {
            video.removeEventListener('seeked', onSeeked);

            // Draw frame at original size
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, mimeType, 0.95);
            });

            let finalBlob = blob;

            // Apply AI upscaling if selected
            if (aiEngine !== 'none' && scale > 1) {
                finalBlob = await upscaleWithAI(blob, aiEngine, scale);
            } else if (scale > 1) {
                finalBlob = await browserUpscale(blob, scale);
            }

            // Get actual dimensions and add to gallery
            const frameUrl = URL.createObjectURL(finalBlob);
            const img = new Image();
            img.onload = () => {
                const dimensions = `${img.width}x${img.height}`;
                addFrameToGallery(frameUrl, timestamp.toFixed(2), finalBlob, dimensions, scale, aiEngine);

                currentFrame++;
                currentProgress.textContent = currentFrame;
                progressFill.style.width = `${(currentFrame / totalFrames) * 100}%`;

                requestAnimationFrame(() => extractNextFrame());
            };
            img.src = frameUrl;
        });
    }

    extractNextFrame();
}

// Add frame to gallery with upscaling info
function addFrameToGallery(frameUrl, timestamp, blob, dimensions = '', scale = 1, aiEngine = 'none') {
    // Hide empty state if it's the first frame
    if (extractedFrames.length === 0 && emptyState) {
        emptyState.classList.add('hidden');
    }

    const frameId = `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const frameItem = document.createElement('div');
    frameItem.className = 'relative group rounded-lg overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200';
    frameItem.id = frameId;
    frameItem.style.height = 'fit-content';

    // Image container with responsive aspect ratio
    const imgContainer = document.createElement('div');
    imgContainer.className = 'aspect-video bg-muted w-full cursor-pointer';

    const img = document.createElement('img');
    img.src = frameUrl;
    img.alt = `Frame at ${timestamp}s`;
    img.className = 'w-full h-full object-contain bg-black';
    img.loading = 'lazy';

    imgContainer.appendChild(img);

    // Overlay with actions (visible on hover)
    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none';

    // Delete button (top-right)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'absolute top-2 right-2 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive hover:text-destructive-foreground pointer-events-auto';
    deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFrame(frameId, frameUrl);
    });

    // Bottom info bar
    const infoBar = document.createElement('div');
    infoBar.className = 'absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between pointer-events-auto';

    // Timestamp
    const frameTime = document.createElement('span');
    frameTime.className = 'text-sm font-medium text-white drop-shadow-sm';
    frameTime.textContent = `${timestamp}s`;

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-primary hover:text-primary-foreground transition-colors duration-200';
    downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
    `;
    downloadBtn.title = 'Download';

    const format = formatSelect.value;
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFrame(frameUrl, timestamp, format, scale);
    });

    infoBar.appendChild(frameTime);
    infoBar.appendChild(downloadBtn);

    overlay.appendChild(infoBar);

    // Add click event to the entire frame item
    frameItem.addEventListener('click', (e) => {
        // Only open preview if not clicking on a button
        if (!e.target.closest('button')) {
            const frameData = extractedFrames.find(f => f.id === frameId);
            if (frameData) {
                openPreviewModal(frameData);
            }
        }
    });

    frameItem.appendChild(imgContainer);
    frameItem.appendChild(overlay);
    frameItem.appendChild(deleteBtn);

    framesGrid.appendChild(frameItem);

    extractedFrames.push({
        id: frameId,
        url: frameUrl,
        timestamp,
        blob,
        scale: scale,
        dimensions: dimensions,
        aiEngine: aiEngine,
        originalWidth: video.videoWidth,
        originalHeight: video.videoHeight
    });
    updateFrameCount();
}

// Download single frame
function downloadFrame(url, timestamp, format, scale = 1) {
    const link = document.createElement('a');
    link.href = url;
    const scaleText = scale > 1 ? `_${scale}x` : '';
    link.download = `frame_${timestamp}s${scaleText}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download all frames
function downloadAllFrames() {
    const format = formatSelect.value;

    extractedFrames.forEach((frame, index) => {
        setTimeout(() => {
            downloadFrame(frame.url, frame.timestamp, format, frame.scale || 1);
        }, index * 100); // Delay to prevent browser blocking
    });

    showNotification(`${extractedFrames.length}개의 프레임을 다운로드 중...`, 'success');
}

// Delete single frame
function deleteFrame(frameId, frameUrl) {
    const frameElement = document.getElementById(frameId);
    if (frameElement) {
        frameElement.remove();
    }

    // Remove from array and clean up URL
    const frameIndex = extractedFrames.findIndex(f => f.id === frameId);
    if (frameIndex !== -1) {
        URL.revokeObjectURL(extractedFrames[frameIndex].url);
        extractedFrames.splice(frameIndex, 1);
    }

    updateFrameCount();
    showNotification('Frame deleted.', 'success');
}

// Clear all frames
function clearAllFrames(showMessage = true) {
    framesGrid.innerHTML = '';
    extractedFrames.forEach(frame => {
        URL.revokeObjectURL(frame.url);
    });
    extractedFrames = [];
    updateFrameCount();

    // Show empty state
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }

    // Only show notification if requested
    if (showMessage) {
        showNotification('All frames cleared.', 'success');
    }
}

// Reset to upload
function resetToUpload() {
    // Remove any existing event listeners FIRST
    if (videoMetadataHandler) {
        video.removeEventListener('loadedmetadata', videoMetadataHandler);
        videoMetadataHandler = null;
    }
    if (videoErrorHandler) {
        video.removeEventListener('error', videoErrorHandler);
        videoErrorHandler = null;
    }

    // Clear current video reference
    currentVideo = null;

    // Show upload prompt, hide video
    if (uploadPrompt) {
        uploadPrompt.style.display = 'flex';
    }
    video.classList.add('hidden');

    // Hide video controls
    if (videoControls) {
        videoControls.classList.add('hidden');
    }

    // Reset video
    video.pause();
    video.src = '';
    video.load();
    fileInput.value = '';

    // Clear frames without showing notification
    if (extractedFrames.length > 0) {
        clearAllFrames(false);
    }
}

// Update frame count
function updateFrameCount() {
    frameCount.textContent = extractedFrames.length;

    // Show/hide empty state based on frame count
    if (emptyState) {
        if (extractedFrames.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }
}

// Track active notifications
let activeNotifications = new Set();

// Show notification
function showNotification(message, type = 'info') {
    // Check if this exact message is already showing
    const notificationKey = `${type}:${message}`;
    if (activeNotifications.has(notificationKey)) {
        return; // Don't show duplicate
    }

    // Remove any existing error notifications if showing a new one
    if (type === 'error') {
        document.querySelectorAll('.notification-error').forEach(el => {
            el.remove();
        });
        // Clear error notifications from tracking
        activeNotifications.forEach(key => {
            if (key.startsWith('error:')) {
                activeNotifications.delete(key);
            }
        });
    }

    activeNotifications.add(notificationKey);

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    // Dark theme colors with better contrast
    let styles;
    switch (type) {
        case 'success':
            styles = `
                background: rgba(16, 185, 129, 0.95);
                color: white;
                border: 1px solid rgba(16, 185, 129, 1);
            `;
            break;
        case 'error':
            styles = `
                background: rgba(239, 68, 68, 0.95);
                color: white;
                border: 1px solid rgba(239, 68, 68, 1);
            `;
            break;
        case 'warning':
            styles = `
                background: rgba(245, 158, 11, 0.95);
                color: white;
                border: 1px solid rgba(245, 158, 11, 1);
            `;
            break;
        default:
            styles = `
                background: rgba(30, 30, 30, 0.95);
                color: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;
    }

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        ${styles}
        backdrop-filter: blur(10px);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 2000;
        animation: slideIn 0.3s ease;
        font-size: 14px;
        font-weight: 500;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
            activeNotifications.delete(notificationKey);
        }, 300);
    }, 3000);
}

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

    /* Upload button hover effect */
    #uploadBtn:hover .bg-primary\/10 {
        background: hsl(var(--primary) / 0.2);
    }

    /* Video container drag over effect */
    #videoContainer.bg-accent\/10 {
        background: hsl(var(--accent) / 0.1);
    }

    /* Preview Modal Image Constraints */
    #previewModal img {
        max-width: 90vw;
        max-height: 85vh;
        width: auto;
        height: auto;
        display: block;
        margin: auto;
    }
`;
document.head.appendChild(style);