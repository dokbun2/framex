// Motion Detector - Canvas API를 사용한 움직임 감지
class MotionDetector {
    constructor() {
        this.previousFrame = null;
        this.motionHistory = [];
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Motion detection parameters
        this.threshold = 25; // Pixel difference threshold
        this.gridSize = 20; // Grid size for motion regions
    }
    
    // Extract frame from video
    extractFrame(video) {
        this.canvas.width = video.videoWidth || 640;
        this.canvas.height = video.videoHeight || 360;
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Calculate pixel difference between two frames
    calculatePixelDiff(frame1, frame2) {
        if (!frame1 || !frame2) return null;
        
        const data1 = frame1.data;
        const data2 = frame2.data;
        const length = data1.length;
        let totalDiff = 0;
        let changedPixels = 0;
        
        // Motion grid for regional detection
        const cols = Math.ceil(this.canvas.width / this.gridSize);
        const rows = Math.ceil(this.canvas.height / this.gridSize);
        const motionGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
        
        for (let i = 0; i < length; i += 4) {
            // Calculate RGB difference
            const rDiff = Math.abs(data1[i] - data2[i]);
            const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
            const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
            const avgDiff = (rDiff + gDiff + bDiff) / 3;
            
            if (avgDiff > this.threshold) {
                changedPixels++;
                totalDiff += avgDiff;
                
                // Mark motion in grid
                const pixelIndex = i / 4;
                const x = pixelIndex % this.canvas.width;
                const y = Math.floor(pixelIndex / this.canvas.width);
                const gridX = Math.floor(x / this.gridSize);
                const gridY = Math.floor(y / this.gridSize);
                
                if (gridY < rows && gridX < cols) {
                    motionGrid[gridY][gridX]++;
                }
            }
        }
        
        // Calculate motion intensity (0-1)
        const intensity = Math.min(changedPixels / (length / 4), 1);
        
        // Find motion hotspots
        const hotspots = this.findHotspots(motionGrid);
        
        // Calculate motion vector (simplified)
        const vector = this.calculateMotionVector(motionGrid);
        
        return {
            intensity,
            changedPixels,
            totalDiff,
            hotspots,
            vector,
            grid: motionGrid
        };
    }
    
    // Find areas with most motion
    findHotspots(motionGrid) {
        const hotspots = [];
        const rows = motionGrid.length;
        const cols = motionGrid[0].length;
        const threshold = 10; // Minimum motion pixels to be considered hotspot
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (motionGrid[y][x] > threshold) {
                    hotspots.push({
                        x: x * this.gridSize + this.gridSize / 2,
                        y: y * this.gridSize + this.gridSize / 2,
                        intensity: motionGrid[y][x],
                        gridX: x,
                        gridY: y
                    });
                }
            }
        }
        
        // Sort by intensity and return top hotspots
        return hotspots.sort((a, b) => b.intensity - a.intensity).slice(0, 5);
    }
    
    // Calculate overall motion direction
    calculateMotionVector(motionGrid) {
        const rows = motionGrid.length;
        const cols = motionGrid[0].length;
        let weightedX = 0;
        let weightedY = 0;
        let totalWeight = 0;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const weight = motionGrid[y][x];
                if (weight > 0) {
                    weightedX += x * weight;
                    weightedY += y * weight;
                    totalWeight += weight;
                }
            }
        }
        
        if (totalWeight === 0) {
            return { x: 0, y: 0, magnitude: 0 };
        }
        
        const centerX = cols / 2;
        const centerY = rows / 2;
        const avgX = weightedX / totalWeight;
        const avgY = weightedY / totalWeight;
        
        // Vector from center to weighted average
        const vectorX = avgX - centerX;
        const vectorY = avgY - centerY;
        const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
        
        return {
            x: vectorX / cols, // Normalize to -1 to 1
            y: vectorY / rows,
            magnitude: magnitude / Math.sqrt(centerX * centerX + centerY * centerY)
        };
    }
    
    // Analyze motion between current and previous frame
    analyzeMotion(video) {
        const currentFrame = this.extractFrame(video);
        
        if (!this.previousFrame) {
            this.previousFrame = currentFrame;
            return {
                intensity: 0,
                type: 'static',
                hotspots: [],
                vector: { x: 0, y: 0, magnitude: 0 }
            };
        }
        
        const diff = this.calculatePixelDiff(this.previousFrame, currentFrame);
        
        // Classify motion type based on intensity
        let motionType = 'static';
        if (diff.intensity > 0.01 && diff.intensity <= 0.05) {
            motionType = 'minimal';
        } else if (diff.intensity > 0.05 && diff.intensity <= 0.15) {
            motionType = 'moderate';
        } else if (diff.intensity > 0.15 && diff.intensity <= 0.3) {
            motionType = 'active';
        } else if (diff.intensity > 0.3) {
            motionType = 'intense';
        }
        
        // Store in history for temporal analysis
        this.motionHistory.push({
            timestamp: video.currentTime,
            intensity: diff.intensity,
            type: motionType,
            vector: diff.vector
        });
        
        // Keep only last 10 frames in history
        if (this.motionHistory.length > 10) {
            this.motionHistory.shift();
        }
        
        // Detect motion patterns
        const pattern = this.detectMotionPattern();
        
        // Update previous frame
        this.previousFrame = currentFrame;
        
        return {
            intensity: diff.intensity,
            type: motionType,
            hotspots: diff.hotspots,
            vector: diff.vector,
            pattern: pattern,
            changedPixels: diff.changedPixels
        };
    }
    
    // Detect patterns in motion history
    detectMotionPattern() {
        if (this.motionHistory.length < 3) {
            return 'unknown';
        }
        
        const recentIntensities = this.motionHistory.slice(-5).map(m => m.intensity);
        const avgIntensity = recentIntensities.reduce((a, b) => a + b, 0) / recentIntensities.length;
        
        // Check for rhythmic patterns
        let isRhythmic = false;
        if (this.motionHistory.length >= 4) {
            const peaks = [];
            for (let i = 1; i < recentIntensities.length - 1; i++) {
                if (recentIntensities[i] > recentIntensities[i - 1] && 
                    recentIntensities[i] > recentIntensities[i + 1]) {
                    peaks.push(i);
                }
            }
            isRhythmic = peaks.length >= 2;
        }
        
        // Classify pattern
        if (isRhythmic) {
            return 'rhythmic'; // Good for beat-matched music
        } else if (avgIntensity > 0.2) {
            return 'continuous'; // Constant motion
        } else if (avgIntensity < 0.05) {
            return 'static'; // Little to no motion
        } else {
            const variance = this.calculateVariance(recentIntensities);
            if (variance > 0.1) {
                return 'variable'; // Changing motion
            } else {
                return 'steady'; // Consistent motion
            }
        }
    }
    
    // Calculate variance for pattern detection
    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }
    
    // Reset detector state
    reset() {
        this.previousFrame = null;
        this.motionHistory = [];
    }
    
    // Get motion summary for audio generation
    getMotionSummary() {
        if (this.motionHistory.length === 0) {
            return null;
        }
        
        const intensities = this.motionHistory.map(m => m.intensity);
        const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
        const maxIntensity = Math.max(...intensities);
        const pattern = this.detectMotionPattern();
        
        // Calculate dominant direction
        const vectors = this.motionHistory.map(m => m.vector);
        const avgVector = {
            x: vectors.reduce((sum, v) => sum + v.x, 0) / vectors.length,
            y: vectors.reduce((sum, v) => sum + v.y, 0) / vectors.length
        };
        
        return {
            averageIntensity: avgIntensity,
            maxIntensity: maxIntensity,
            pattern: pattern,
            dominantDirection: avgVector,
            historyLength: this.motionHistory.length,
            suggestedTempo: this.intensityToTempo(avgIntensity),
            suggestedVolume: Math.min(avgIntensity * 2, 1)
        };
    }
    
    // Convert motion intensity to suggested BPM
    intensityToTempo(intensity) {
        // Map intensity (0-1) to BPM (60-180)
        const minBPM = 60;
        const maxBPM = 180;
        return Math.round(minBPM + (intensity * (maxBPM - minBPM)));
    }
}

// Export for use
window.MotionDetector = MotionDetector;