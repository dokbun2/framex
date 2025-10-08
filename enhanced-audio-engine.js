// Enhanced Audio Engine - 움직임 기반 사운드 이펙트 생성
class EnhancedAudioEngine {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.currentSources = [];
        this.analyser = null;
        this.masterGain = null;
        
        // Motion to sound effect mapping (NO MUSIC)
        this.motionSounds = {
            // Movement intensity only affects volume
            static: { volume: 0.0, energy: 0.0 },
            minimal: { volume: 0.3, energy: 0.2 },
            moderate: { volume: 0.5, energy: 0.5 },
            active: { volume: 0.7, energy: 0.7 },
            intense: { volume: 0.9, energy: 0.9 }
        };
        
        // Realistic sound effects based on detected actions
        this.soundEffects = {
            // Human movement sounds
            footstep: {
                type: 'footstep',
                variations: ['soft', 'normal', 'heavy'],
                duration: 0.15,
                interval: 500 // ms between steps
            },
            handGesture: {
                type: 'swoosh',
                duration: 0.2,
                frequency: [600, 1200] // Frequency range
            },
            clapping: {
                type: 'clap',
                duration: 0.05,
                frequency: [2000, 4000]
            },
            
            // Environmental sounds
            rain: {
                type: 'continuous',
                density: 100, // drops per second
                duration: 'continuous'
            },
            wind: {
                type: 'continuous',
                intensity: 0.5,
                duration: 'continuous'
            },
            thunder: {
                type: 'impact',
                duration: 2.0,
                frequency: [30, 100]
            },
            
            // Object interaction sounds
            doorOpen: {
                type: 'creak',
                duration: 0.8,
                frequency: [200, 400]
            },
            impact: {
                type: 'hit',
                duration: 0.1,
                frequency: [80, 200]
            },
            waterSplash: {
                type: 'splash',
                duration: 0.3,
                frequency: [500, 2000]
            }
        };
        
        // Current playback state
        this.currentTempo = 100;
        this.currentPattern = null;
        this.isPlaying = false;
        this.scheduledEvents = [];
    }
    
    // Initialize audio context and nodes
    async initialize() {
        if (this.isInitialized) return;
        
        // Use shared audio context if available, otherwise create new one
        if (window.sharedAudioContext) {
            this.audioContext = window.sharedAudioContext;
        } else {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.sharedAudioContext = this.audioContext;
        }
        
        // Master gain for volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        
        // Analyzer for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        // Create effects chain
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Create reverb
        this.convolver = this.audioContext.createConvolver();
        await this.createReverbImpulse();
        
        // Connect nodes
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        // Reverb send
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.2;
        this.masterGain.connect(this.reverbGain);
        this.reverbGain.connect(this.convolver);
        this.convolver.connect(this.audioContext.destination);
        
        this.isInitialized = true;
    }
    
    // Create reverb impulse response
    async createReverbImpulse() {
        const length = this.audioContext.sampleRate * 2;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.convolver.buffer = impulse;
    }
    
    // Generate audio based on motion analysis (SOUND EFFECTS ONLY)
    generateFromMotion(motionData, geminiAnalysis) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        // Stop current playback
        this.stopAll();
        
        // Determine volume from motion intensity
        const motionParams = this.motionSounds[motionData.type] || this.motionSounds.moderate;
        this.masterGain.gain.value = motionParams.volume;
        
        // Detect and play appropriate sound effects based on motion
        if (geminiAnalysis && geminiAnalysis.motion_analysis) {
            const motion = geminiAnalysis.motion_analysis;
            
            // Walking/Running detection
            if (motion.primary_action && 
                (motion.primary_action.includes('walking') || 
                 motion.primary_action.includes('running') ||
                 motion.primary_action.includes('stepping'))) {
                this.startFootsteps(motion.movement_intensity);
            }
            
            // Hand gesture detection
            if (motion.gesture_detected && 
                (motion.gesture_detected.includes('waving') ||
                 motion.gesture_detected.includes('pointing') ||
                 motion.gesture_detected.includes('gesturing'))) {
                this.playHandGesture();
            }
            
            // Clapping detection
            if (motion.gesture_detected && motion.gesture_detected.includes('clapping')) {
                this.playClapping();
            }
            
            // Environmental sounds based on scene
            if (geminiAnalysis.scene_type === 'nature' || 
                geminiAnalysis.key_objects?.includes('rain')) {
                this.startRainSound();
            }
            
            // Impact/collision sounds
            if (motion.collision_events) {
                this.playImpactSound();
            }
        }
        
        // Apply spatial audio based on motion vector
        if (motionData.vector && Math.abs(motionData.vector.x) > 0.1) {
            this.applySpatialAudio(motionData.vector);
        }
        
        this.isPlaying = true;
    }
    
    // Create footstep sounds
    startFootsteps(intensity = 0.5) {
        let stepInterval = 500; // Default walking pace
        
        if (intensity > 0.7) {
            stepInterval = 300; // Running
        } else if (intensity < 0.3) {
            stepInterval = 700; // Slow walk
        }
        
        const playStep = () => {
            if (!this.isPlaying) return;
            
            const now = this.audioContext.currentTime;
            
            // Create footstep sound using filtered noise
            const noise = this.createNoise(0.05);
            const filter = this.audioContext.createBiquadFilter();
            const gainNode = this.audioContext.createGain();
            
            filter.type = 'lowpass';
            filter.frequency.value = 200 + Math.random() * 100;
            filter.Q.value = 2;
            
            // Envelope for footstep
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(intensity * 0.3, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            noise.start(now);
            
            // Schedule next step
            if (this.isPlaying) {
                setTimeout(() => playStep(), stepInterval + Math.random() * 50);
            }
        };
        
        playStep();
    }
    
    // Play hand gesture swoosh sound
    playHandGesture() {
        const now = this.audioContext.currentTime;
        const duration = 0.2;
        
        // Create swoosh using filtered noise
        const noise = this.createNoise(duration);
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + duration);
        filter.Q.value = 5;
        
        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        noise.start(now);
        this.currentSources.push(noise);
    }
    
    // Play clapping sound
    playClapping() {
        const now = this.audioContext.currentTime;
        
        // Create clap using burst of filtered noise
        const noise = this.createNoise(0.03);
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        noise.start(now);
        this.currentSources.push(noise);
    }
    
    // Create rain sound effect
    startRainSound() {
        if (this.rainInterval) return; // Already playing
        
        const playRainDrop = () => {
            if (!this.isPlaying) {
                clearInterval(this.rainInterval);
                this.rainInterval = null;
                return;
            }
            
            const now = this.audioContext.currentTime;
            
            // Create multiple rain drops
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const osc = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    const filter = this.audioContext.createBiquadFilter();
                    
                    // High frequency for rain drops
                    osc.frequency.value = 4000 + Math.random() * 2000;
                    osc.type = 'sine';
                    
                    filter.type = 'highpass';
                    filter.frequency.value = 3000;
                    
                    // Very short envelope for drop sound
                    gainNode.gain.setValueAtTime(0.02, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
                    
                    osc.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(this.masterGain);
                    
                    osc.start(now);
                    osc.stop(now + 0.01);
                }, Math.random() * 100);
            }
        };
        
        // Play rain drops continuously
        this.rainInterval = setInterval(playRainDrop, 100);
        playRainDrop();
    }
    
    // Play impact/collision sound
    playImpactSound() {
        const startTime = this.audioContext.currentTime;
        const pattern = style.pattern;
        
        const playBeat = (beatIndex) => {
            if (!this.isPlaying) return;
            
            const time = startTime + (beatIndex * beatDuration / 4); // 16th notes
            const velocity = pattern[beatIndex % pattern.length];
            
            if (velocity > 0) {
                // Create drum sound
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // Vary frequency based on beat position
                if (beatIndex % 4 === 0) {
                    // Kick drum
                    osc.frequency.setValueAtTime(60, time);
                    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
                } else if (beatIndex % 4 === 2) {
                    // Snare
                    osc.frequency.setValueAtTime(200, time);
                    const noise = this.createNoise(0.05);
                    noise.connect(gainNode);
                    noise.start(time);
                } else {
                    // Hi-hat
                    osc.frequency.setValueAtTime(8000, time);
                }
                
                gainNode.gain.setValueAtTime(velocity * energy * 0.3, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                
                osc.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                osc.start(time);
                osc.stop(time + 0.1);
                
                this.currentSources.push(osc);
        const now = this.audioContext.currentTime;
        
        // Low frequency thud
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.frequency.value = 80;
        osc.type = 'sine';
        
        // Add some noise for texture
        const noise = this.createNoise(0.05);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        // Impact envelope
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.1);
        noise.start(now);
        
        this.currentSources.push(osc, noise);
    }
    
    // Schedule event-based sounds (simplified - main logic in generateFromMotion)
    scheduleEventSounds(motionAnalysis) {
        // Most sound triggering is now handled in generateFromMotion
        // This is kept for backward compatibility
        if (motionAnalysis.collision_events) {
            this.playImpactSound();
        }
    }
    
    // Create noise buffer
    createNoise(duration) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        return source;
    }
    
    // Apply spatial audio based on motion vector
    applySpatialAudio(vector) {
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, vector.x));
        
        // Reconnect through panner
        this.masterGain.disconnect();
        this.masterGain.connect(panner);
        panner.connect(this.compressor);
    }
    
    // Update audio based on continuous motion
    updateFromMotion(motionSummary) {
        if (!motionSummary || !this.isPlaying) return;
        
        // Adjust tempo dynamically (for footsteps)
        const targetTempo = motionSummary.suggestedTempo;
        if (Math.abs(this.currentTempo - targetTempo) > 10) {
            this.currentTempo = targetTempo;
            // Adjust footstep speed based on tempo
            // This would require restarting footsteps with new interval
            console.log('Tempo changed to:', targetTempo);
        }
        
        // Adjust volume based on motion
        this.masterGain.gain.linearRampToValueAtTime(
            motionSummary.suggestedVolume * 0.5,
            this.audioContext.currentTime + 0.1
        );
    }
    
    // Stop all playing sounds
    stopAll() {
        this.isPlaying = false;
        
        // Stop rain sound if playing
        if (this.rainInterval) {
            clearInterval(this.rainInterval);
            this.rainInterval = null;
        }
        
        this.currentSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        });
        
        this.currentSources = [];
        this.scheduledEvents = [];
    }
    
    // Get analyser for visualization
    getAnalyser() {
        return this.analyser;
    }
}

// Export for use
window.EnhancedAudioEngine = EnhancedAudioEngine;