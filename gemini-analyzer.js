// Gemini API Integration for Intelligent Audio Generation
class GeminiAnalyzer {
    constructor() {
        this.apiKey = null;
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        this.analysisCache = new Map();
        this.frameAnalysisResults = [];
        
        // Audio mapping based on scene analysis
        this.audioMappings = {
            moods: {
                'energetic': { bgm: 'upbeat', effects: ['whoosh', 'click'] },
                'calm': { bgm: 'ambient', effects: [] },
                'dramatic': { bgm: 'dramatic', effects: ['impact', 'transition'] },
                'peaceful': { bgm: 'peaceful', effects: [] },
                'tense': { bgm: 'cinematic', effects: ['impact'] },
                'cheerful': { bgm: 'upbeat', effects: ['click'] }
            },
            scenes: {
                'action': { bgm: 'dramatic', effects: ['impact', 'whoosh'] },
                'nature': { bgm: 'peaceful', effects: [] },
                'urban': { bgm: 'upbeat', effects: ['click', 'transition'] },
                'indoor': { bgm: 'ambient', effects: ['click'] },
                'sports': { bgm: 'upbeat', effects: ['impact', 'whoosh'] },
                'celebration': { bgm: 'upbeat', effects: ['click', 'transition'] }
            },
            objects: {
                'people': { preferredBgm: 'cinematic', effects: [] },
                'vehicles': { preferredBgm: 'upbeat', effects: ['whoosh'] },
                'animals': { preferredBgm: 'peaceful', effects: [] },
                'technology': { preferredBgm: 'upbeat', effects: ['click'] }
            }
        };
    }

    // Set API Key
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    // Load API Key from storage
    loadApiKey() {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            this.apiKey = savedKey;
            return true;
        }
        return false;
    }

    // Convert canvas/video frame to base64
    frameToBase64(canvas, video, timestamp) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Convert to base64 (reduce quality for API efficiency)
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        return base64;
    }

    // Analyze single frame with Gemini Vision
    async analyzeFrame(base64Image, frameIndex) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not set');
        }

        // Check cache first
        const cacheKey = `frame_${frameIndex}`;
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        const requestBody = {
            contents: [{
                parts: [
                    {
                        text: `Analyze this video frame for synchronized audio generation. Provide a detailed JSON response with:
                        1. "mood": The overall mood (energetic, calm, dramatic, peaceful, tense, cheerful)
                        2. "scene_type": Type of scene (action, nature, urban, indoor, sports, celebration)
                        3. "key_objects": Main objects visible (people, vehicles, animals, technology)
                        4. "motion_analysis": {
                            "movement_intensity": 0-1 scale of motion amount,
                            "movement_type": "static", "slow", "moderate", "fast", "chaotic",
                            "primary_action": Describe main action (walking, running, jumping, sitting, etc),
                            "collision_events": Any impacts or collisions detected,
                            "gesture_detected": Hand movements, clapping, waving, etc
                        }
                        5. "human_detection": {
                            "people_count": Number of people visible,
                            "pose_description": Body positions (standing, sitting, moving),
                            "facial_expression": If visible (happy, sad, neutral, talking),
                            "interaction": People interacting with objects or each other
                        }
                        6. "audio_cues": {
                            "suggested_music_tempo": BPM range (60-180),
                            "rhythm_pattern": "steady", "syncopated", "irregular", "none",
                            "suggested_effects": Specific sound effects with timestamps,
                            "volume_dynamics": "quiet", "moderate", "loud", "variable"
                        }
                        7. "temporal_changes": Compare with previous frame if this is not the first frame
                        8. "confidence": Your confidence level (0-1)
                        
                        Focus on motion, events, and temporal changes for precise audio synchronization.`
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1024
            }
        };

        try {
            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            // Parse JSON from response
            let analysis;
            try {
                // Extract JSON from the response text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (e) {
                console.error('Failed to parse Gemini response:', e);
                // Fallback analysis
                analysis = this.createFallbackAnalysis();
            }

            // Cache the result
            this.analysisCache.set(cacheKey, analysis);
            return analysis;

        } catch (error) {
            console.error('Gemini API error:', error);
            return this.createFallbackAnalysis();
        }
    }

    // Create fallback analysis when API fails
    createFallbackAnalysis() {
        return {
            mood: 'calm',
            scene_type: 'indoor',
            key_objects: [],
            suggested_music_tempo: 'medium',
            suggested_effects: [],
            confidence: 0.3,
            is_fallback: true
        };
    }

    // Analyze multiple frames from a video
    async analyzeVideo(video, options = {}) {
        const {
            sampleRate = 0.5, // Analyze every 0.5 seconds for better motion detection
            maxFrames = 16, // Increased for better temporal analysis
            onProgress = () => {}
        } = options;

        const duration = video.duration;
        const frameCount = Math.min(Math.floor(duration / sampleRate), maxFrames);
        const canvas = document.createElement('canvas');
        
        this.frameAnalysisResults = [];
        
        for (let i = 0; i < frameCount; i++) {
            const timestamp = i * sampleRate;
            video.currentTime = timestamp;
            
            // Wait for frame to load
            await new Promise(resolve => {
                video.onseeked = resolve;
            });
            
            const base64 = this.frameToBase64(canvas, video, timestamp);
            const analysis = await this.analyzeFrame(base64, i);
            
            this.frameAnalysisResults.push({
                timestamp,
                analysis
            });
            
            onProgress((i + 1) / frameCount);
            
            // Rate limiting (avoid hitting API limits)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return this.generateAudioRecommendations();
    }

    // Generate audio recommendations based on analysis
    generateAudioRecommendations() {
        if (this.frameAnalysisResults.length === 0) {
            return null;
        }

        // Aggregate analysis results
        const moodCounts = {};
        const sceneCounts = {};
        const effectsSuggested = new Set();
        let totalConfidence = 0;

        this.frameAnalysisResults.forEach(result => {
            const { analysis } = result;
            
            // Count moods
            moodCounts[analysis.mood] = (moodCounts[analysis.mood] || 0) + 1;
            
            // Count scenes
            sceneCounts[analysis.scene_type] = (sceneCounts[analysis.scene_type] || 0) + 1;
            
            // Collect suggested effects
            if (analysis.suggested_effects) {
                analysis.suggested_effects.forEach(effect => effectsSuggested.add(effect));
            }
            
            totalConfidence += analysis.confidence || 0.5;
        });

        // Determine dominant mood and scene
        const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
            moodCounts[a] > moodCounts[b] ? a : b
        );
        
        const dominantScene = Object.keys(sceneCounts).reduce((a, b) => 
            sceneCounts[a] > sceneCounts[b] ? a : b
        );

        // Get audio recommendations
        const moodAudio = this.audioMappings.moods[dominantMood] || this.audioMappings.moods['calm'];
        const sceneAudio = this.audioMappings.scenes[dominantScene] || this.audioMappings.scenes['indoor'];
        
        // Combine recommendations
        const recommendation = {
            bgm: moodAudio.bgm || sceneAudio.bgm,
            effects: [...new Set([...moodAudio.effects, ...sceneAudio.effects])],
            suggestedEffects: Array.from(effectsSuggested),
            dominantMood,
            dominantScene,
            confidence: totalConfidence / this.frameAnalysisResults.length,
            analysisDetails: this.frameAnalysisResults
        };

        return recommendation;
    }

    // Apply recommendations to audio controls
    applyRecommendations(recommendation) {
        if (!recommendation) return;

        // Initialize audio synthesizer if not already done
        if (!window.audioSynthesizer) {
            window.audioSynthesizer = new AudioSynthesizer();
        }

        // Generate and play audio based on analysis
        const audioResult = window.audioSynthesizer.generateAudioFromAnalysis(recommendation);
        
        // Update UI to reflect selected audio
        const bgmSelect = document.getElementById('bgmSelect');
        if (bgmSelect && recommendation.bgm) {
            bgmSelect.value = recommendation.bgm;
            bgmSelect.dispatchEvent(new Event('change'));
        }

        // Highlight recommended effects
        const effectButtons = document.querySelectorAll('.effect-btn');
        effectButtons.forEach(btn => {
            const effect = btn.dataset.effect;
            if (recommendation.effects.includes(effect)) {
                btn.classList.add('recommended');
                btn.classList.add('active');
            }
        });

        // Show analysis results with audio generation info
        this.displayAnalysisResults(recommendation);
        
        // Add audio playback controls
        this.addAudioControls(audioResult);
    }
    
    // Add audio playback controls
    addAudioControls(audioResult) {
        let controlPanel = document.getElementById('audioControlPanel');
        if (!controlPanel) {
            controlPanel = document.createElement('div');
            controlPanel.id = 'audioControlPanel';
            controlPanel.className = 'audio-control-panel';
            
            const resultsPanel = document.getElementById('analysisResults');
            if (resultsPanel) {
                resultsPanel.appendChild(controlPanel);
            }
        }
        
        controlPanel.innerHTML = `
            <div class="audio-controls-generated">
                <h4>🎵 생성된 오디오</h4>
                <div class="generated-info">
                    <p><strong>배경음악:</strong> ${this.translateBgm(audioResult.music)} (재생 중)</p>
                    <p><strong>효과음:</strong> ${audioResult.effects.map(e => this.translateEffect(e)).join(', ') || '없음'}</p>
                </div>
                <div class="playback-controls">
                    <button id="stopGeneratedAudio" class="btn-stop">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="4" y="4" width="8" height="8"/>
                        </svg>
                        정지
                    </button>
                    <button id="replayGeneratedAudio" class="btn-replay">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 4V0L3 5l5 5V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h2c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4z"/>
                        </svg>
                        다시 재생
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('stopGeneratedAudio')?.addEventListener('click', () => {
            window.audioSynthesizer?.stopAll();
        });
        
        document.getElementById('replayGeneratedAudio')?.addEventListener('click', () => {
            window.audioSynthesizer?.generateAudioFromAnalysis(this.frameAnalysisResults[this.frameAnalysisResults.length - 1]);
        });
    }

    // Display analysis results in UI
    displayAnalysisResults(recommendation) {
        // Create or update analysis results panel
        let resultsPanel = document.getElementById('analysisResults');
        if (!resultsPanel) {
            resultsPanel = document.createElement('div');
            resultsPanel.id = 'analysisResults';
            resultsPanel.className = 'analysis-results';
            
            const controlsSection = document.querySelector('.audio-controls');
            controlsSection.insertBefore(resultsPanel, controlsSection.firstChild);
        }

        resultsPanel.innerHTML = `
            <div class="analysis-header">
                <h3>🤖 AI 분석 결과</h3>
                <span class="confidence-badge" style="background: ${recommendation.confidence > 0.7 ? '#4CAF50' : '#FF9800'}">
                    신뢰도: ${Math.round(recommendation.confidence * 100)}%
                </span>
            </div>
            <div class="analysis-content">
                <div class="analysis-item">
                    <strong>감지된 분위기:</strong> ${this.translateMood(recommendation.dominantMood)}
                </div>
                <div class="analysis-item">
                    <strong>장면 유형:</strong> ${this.translateScene(recommendation.dominantScene)}
                </div>
                <div class="analysis-item">
                    <strong>추천 BGM:</strong> ${this.translateBgm(recommendation.bgm)}
                </div>
                <div class="analysis-item">
                    <strong>추천 효과음:</strong> ${recommendation.effects.map(e => this.translateEffect(e)).join(', ') || '없음'}
                </div>
            </div>
        `;
    }

    // Translation helpers
    translateMood(mood) {
        const translations = {
            'energetic': '활기찬',
            'calm': '차분한',
            'dramatic': '드라마틱한',
            'peaceful': '평화로운',
            'tense': '긴장감 있는',
            'cheerful': '경쾌한'
        };
        return translations[mood] || mood;
    }

    translateScene(scene) {
        const translations = {
            'action': '액션',
            'nature': '자연',
            'urban': '도시',
            'indoor': '실내',
            'sports': '스포츠',
            'celebration': '축하'
        };
        return translations[scene] || scene;
    }

    translateBgm(bgm) {
        const translations = {
            'ambient': '앰비언트',
            'cinematic': '시네마틱',
            'upbeat': '경쾌한',
            'dramatic': '드라마틱',
            'peaceful': '평화로운'
        };
        return translations[bgm] || bgm;
    }

    translateEffect(effect) {
        const translations = {
            'click': '클릭음',
            'whoosh': '휙 소리',
            'impact': '임팩트',
            'transition': '전환음'
        };
        return translations[effect] || effect;
    }
}

// Export for use in other modules
window.GeminiAnalyzer = GeminiAnalyzer;