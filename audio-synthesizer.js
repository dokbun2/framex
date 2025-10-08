// Audio Synthesizer - Web Audio API를 사용한 동적 오디오 생성
class AudioSynthesizer {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.currentSources = [];
        this.analyser = null;
        this.lastAnalysisResult = null;
        
        // 프리셋 음악 패턴 정의
        this.musicPatterns = {
            ambient: {
                notes: [130.81, 164.81, 196.00, 261.63], // C3, E3, G3, C4 (Cmaj)
                tempo: 60,
                waveform: 'sine',
                reverb: 0.8,
                description: '차분하고 평화로운 분위기'
            },
            cinematic: {
                notes: [110.00, 130.81, 164.81, 196.00, 220.00], // A2, C3, E3, G3, A3
                tempo: 75,
                waveform: 'triangle',
                reverb: 0.9,
                description: '영화적이고 웅장한 느낌'
            },
            upbeat: {
                notes: [261.63, 329.63, 392.00, 523.25], // C4, E4, G4, C5
                tempo: 120,
                waveform: 'square',
                reverb: 0.3,
                description: '경쾌하고 활기찬 리듬'
            },
            dramatic: {
                notes: [87.31, 110.00, 130.81, 174.61], // F2, A2, C3, F3 (Fmin)
                tempo: 90,
                waveform: 'sawtooth',
                reverb: 0.7,
                description: '드라마틱하고 긴장감 있는'
            },
            peaceful: {
                notes: [146.83, 174.61, 220.00, 293.66], // D3, F3, A3, D4 (Dmaj)
                tempo: 50,
                waveform: 'sine',
                reverb: 0.9,
                description: '평화롭고 고요한'
            }
        };
        
        // 사운드 이펙트 정의
        this.soundEffects = {
            click: {
                frequency: 1000,
                duration: 0.05,
                type: 'square',
                envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 }
            },
            whoosh: {
                frequency: 800,
                duration: 0.5,
                type: 'noise',
                envelope: { attack: 0.05, decay: 0.1, sustain: 0.2, release: 0.3 },
                sweep: { start: 200, end: 2000 }
            },
            impact: {
                frequency: 60,
                duration: 0.3,
                type: 'sine',
                envelope: { attack: 0.001, decay: 0.1, sustain: 0.05, release: 0.2 },
                distortion: 0.8
            },
            transition: {
                frequency: 440,
                duration: 0.8,
                type: 'triangle',
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.4 },
                sweep: { start: 220, end: 880 }
            }
        };
    }
    
    // 오디오 컨텍스트 초기화
    async initialize() {
        if (this.isInitialized) return;
        
        // Use shared audio context if available, otherwise create new one
        if (window.sharedAudioContext) {
            this.audioContext = window.sharedAudioContext;
        } else {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.sharedAudioContext = this.audioContext;
        }
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.5;
        
        // 리버브 생성
        this.convolver = this.audioContext.createConvolver();
        await this.createReverbImpulse();
        this.convolver.connect(this.masterGain);
        
        // 애널라이저 생성 (비주얼라이저용)
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        this.isInitialized = true;
    }
    
    // 리버브 임펄스 응답 생성
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
    
    // 배경음악 생성 및 재생
    async playBackgroundMusic(type = 'ambient', volume = 0.5) {
        if (!this.isInitialized) await this.initialize();
        
        // 기존 음악 정지
        this.stopAll();
        
        const pattern = this.musicPatterns[type] || this.musicPatterns.ambient;
        const startTime = this.audioContext.currentTime;
        const noteDuration = 60 / pattern.tempo;
        
        // 음악 루프 생성
        const playLoop = () => {
            if (!this.isPlaying) return;
            
            pattern.notes.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filterNode = this.audioContext.createBiquadFilter();
                
                // 오실레이터 설정
                osc.type = pattern.waveform;
                osc.frequency.value = freq;
                
                // 필터 설정 (따뜻한 사운드를 위해)
                filterNode.type = 'lowpass';
                filterNode.frequency.value = 2000;
                filterNode.Q.value = 1;
                
                // 볼륨 엔벨로프
                const attackTime = 0.1;
                const decayTime = 0.2;
                const sustainLevel = 0.3;
                const releaseTime = 0.5;
                
                const noteStartTime = startTime + (index * noteDuration / 4);
                
                gainNode.gain.setValueAtTime(0, noteStartTime);
                gainNode.gain.linearRampToValueAtTime(volume * 0.3, noteStartTime + attackTime);
                gainNode.gain.linearRampToValueAtTime(volume * sustainLevel, noteStartTime + attackTime + decayTime);
                gainNode.gain.linearRampToValueAtTime(0, noteStartTime + noteDuration);
                
                // 연결
                osc.connect(filterNode);
                filterNode.connect(gainNode);
                
                // 리버브 양 조절
                if (pattern.reverb > 0.5) {
                    const dryGain = this.audioContext.createGain();
                    const wetGain = this.audioContext.createGain();
                    
                    dryGain.gain.value = 1 - pattern.reverb;
                    wetGain.gain.value = pattern.reverb;
                    
                    gainNode.connect(dryGain);
                    gainNode.connect(wetGain);
                    
                    dryGain.connect(this.masterGain);
                    wetGain.connect(this.convolver);
                } else {
                    gainNode.connect(this.masterGain);
                }
                
                // 재생
                osc.start(noteStartTime);
                osc.stop(noteStartTime + noteDuration);
                
                this.currentSources.push(osc);
            });
            
            // 다음 루프 예약
            setTimeout(() => playLoop(), noteDuration * 1000);
        };
        
        this.isPlaying = true;
        playLoop();
    }
    
    // 사운드 이펙트 재생
    async playSoundEffect(type, volume = 0.7) {
        if (!this.isInitialized) await this.initialize();
        
        const effect = this.soundEffects[type];
        if (!effect) return;
        
        const startTime = this.audioContext.currentTime;
        
        if (effect.type === 'noise') {
            // 노이즈 생성 (whoosh 효과)
            const bufferSize = this.audioContext.sampleRate * effect.duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 10;
            
            // 주파수 스윕
            if (effect.sweep) {
                filter.frequency.setValueAtTime(effect.sweep.start, startTime);
                filter.frequency.exponentialRampToValueAtTime(effect.sweep.end, startTime + effect.duration);
            }
            
            const gainNode = this.audioContext.createGain();
            this.applyEnvelope(gainNode, effect.envelope, volume, startTime, effect.duration);
            
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            source.start(startTime);
            source.stop(startTime + effect.duration);
            
        } else {
            // 일반 오실레이터 효과
            const osc = this.audioContext.createOscillator();
            osc.type = effect.type;
            osc.frequency.value = effect.frequency;
            
            // 주파수 스윕 적용
            if (effect.sweep) {
                osc.frequency.setValueAtTime(effect.sweep.start, startTime);
                osc.frequency.exponentialRampToValueAtTime(effect.sweep.end, startTime + effect.duration);
            }
            
            const gainNode = this.audioContext.createGain();
            this.applyEnvelope(gainNode, effect.envelope, volume, startTime, effect.duration);
            
            // 디스토션 추가 (impact 효과)
            if (effect.distortion) {
                const distortion = this.audioContext.createWaveShaper();
                distortion.curve = this.makeDistortionCurve(effect.distortion * 100);
                distortion.oversample = '4x';
                
                osc.connect(distortion);
                distortion.connect(gainNode);
            } else {
                osc.connect(gainNode);
            }
            
            gainNode.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + effect.duration);
        }
    }
    
    // ADSR 엔벨로프 적용
    applyEnvelope(gainNode, envelope, maxVolume, startTime, duration) {
        const { attack, decay, sustain, release } = envelope;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(maxVolume, startTime + attack);
        gainNode.gain.linearRampToValueAtTime(maxVolume * sustain, startTime + attack + decay);
        gainNode.gain.setValueAtTime(maxVolume * sustain, startTime + duration - release);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }
    
    // 디스토션 커브 생성
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        
        return curve;
    }
    
    // 분석 결과에 따른 자동 오디오 생성
    generateAudioFromAnalysis(analysisResult) {
        const { dominantMood, dominantScene, effects, confidence } = analysisResult;
        
        // Store the analysis result for later use
        this.lastAnalysisResult = analysisResult;
        
        // 신뢰도가 낮으면 기본값 사용
        if (confidence < 0.5) {
            this.playBackgroundMusic('ambient', 0.3);
            return;
        }
        
        // 분위기에 따른 배경음악 선택
        const moodToMusic = {
            'energetic': 'upbeat',
            'calm': 'ambient',
            'dramatic': 'dramatic',
            'peaceful': 'peaceful',
            'tense': 'cinematic',
            'cheerful': 'upbeat'
        };
        
        const musicType = moodToMusic[dominantMood] || 'ambient';
        const volume = confidence > 0.7 ? 0.5 : 0.3;
        
        // 배경음악 재생
        this.playBackgroundMusic(musicType, volume);
        
        // 추천된 효과음 자동 재생 (시간차를 두고)
        if (effects && effects.length > 0) {
            effects.forEach((effect, index) => {
                setTimeout(() => {
                    this.playSoundEffect(effect, 0.6);
                }, (index + 1) * 2000); // 2초 간격으로 효과음 재생
            });
        }
        
        return {
            music: musicType,
            effects: effects,
            confidence: confidence
        };
    }
    
    // 모든 오디오 정지
    stopAll() {
        this.isPlaying = false;
        this.currentSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // 이미 정지된 소스 무시
            }
        });
        this.currentSources = [];
    }
    
    // 볼륨 조절
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = volume / 100;
        }
    }
}

// Export for use
window.AudioSynthesizer = AudioSynthesizer;