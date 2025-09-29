// JS Carwash Display Script
// Audio notification system and queue management

const socket = io();

// Audio notification system
let isAudioEnabled = true;
let audioContext = null;

// Create audio context for notification sounds
function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        isAudioEnabled = true;
        updateAudioStatus();
        console.log('Audio context initialized');
    } catch (error) {
        console.warn('Web Audio API not supported:', error);
        isAudioEnabled = false;
        updateAudioStatus();
    }
}

// Update audio status indicator
function updateAudioStatus() {
    const audioIcon = document.getElementById('audio-icon');
    const audioText = document.getElementById('audio-text');
    
    if (isAudioEnabled && audioContext) {
        audioIcon.className = 'fas fa-volume-up';
        audioText.textContent = 'Audio: ON';
        audioIcon.style.color = '#4CAF50';
    } else {
        audioIcon.className = 'fas fa-volume-mute';
        audioText.textContent = 'Audio: OFF';
        audioIcon.style.color = '#f44336';
    }
}

// Play notification beep sound
function playNotificationBeep() {
    if (!isAudioEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.warn('Error playing beep sound:', error);
    }
}

// Convert plate number to spell out each character
function spellOutPlateNumber(plateNumber) {
    const numberMap = {
        '0': 'nol',
        '1': 'satu',
        '2': 'dua', 
        '3': 'tiga',
        '4': 'empat',
        '5': 'lima',
        '6': 'enam',
        '7': 'tujuh',
        '8': 'delapan',
        '9': 'sembilan'
    };
    
    return plateNumber
        .split('')
        .map(char => {
            if (char === ' ') {
                return ' '; // Keep spaces
            } else if (numberMap[char]) {
                return numberMap[char]; // Convert numbers
            } else {
                return char.toUpperCase(); // Keep letters as uppercase
            }
        })
        .join(' '); // Add space between each character
}

// Text-to-speech announcement
function announceCompletion(plateNumber) {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech not supported');
        return;
    }
    
    try {
        // Stop any ongoing speech
        speechSynthesis.cancel();
        
        // Convert plate number to spell out each character
        const spelledPlateNumber = spellOutPlateNumber(plateNumber);
        
        // Get voice
        const voices = speechSynthesis.getVoices();
        const indonesianVoice = voices.find(voice => 
            voice.lang.includes('id') || voice.name.includes('Indonesia')
        );
        
        // First announcement - plate number (slower)
        const plateUtterance = new SpeechSynthesisUtterance(spelledPlateNumber);
        plateUtterance.lang = 'id-ID';
        plateUtterance.volume = 0.8;
        plateUtterance.rate = 0.7; // Slower for plate number clarity
        plateUtterance.pitch = 1.0;
        if (indonesianVoice) plateUtterance.voice = indonesianVoice;
        
        // Second part - "telah selesai" (faster)
        plateUtterance.onend = () => {
            const completionUtterance = new SpeechSynthesisUtterance('telah selesai');
            completionUtterance.lang = 'id-ID';
            completionUtterance.volume = 0.8;
            completionUtterance.rate = 1.1; // Faster for "telah selesai"
            completionUtterance.pitch = 1.0;
            if (indonesianVoice) completionUtterance.voice = indonesianVoice;
            
            // Third part - repeat plate number and completion
            completionUtterance.onend = () => {
                setTimeout(() => {
                    const repeatPlateUtterance = new SpeechSynthesisUtterance(spelledPlateNumber);
                    repeatPlateUtterance.lang = 'id-ID';
                    repeatPlateUtterance.volume = 0.8;
                    repeatPlateUtterance.rate = 0.7; // Slower for plate number
                    repeatPlateUtterance.pitch = 1.0;
                    if (indonesianVoice) repeatPlateUtterance.voice = indonesianVoice;
                    
                    repeatPlateUtterance.onend = () => {
                        const finalCompletionUtterance = new SpeechSynthesisUtterance('telah selesai');
                        finalCompletionUtterance.lang = 'id-ID';
                        finalCompletionUtterance.volume = 0.8;
                        finalCompletionUtterance.rate = 1.1; // Faster for "telah selesai"
                        finalCompletionUtterance.pitch = 1.0;
                        if (indonesianVoice) finalCompletionUtterance.voice = indonesianVoice;
                        
                        speechSynthesis.speak(finalCompletionUtterance);
                    };
                    
                    speechSynthesis.speak(repeatPlateUtterance);
                }, 300); // Short pause before repeat
            };
            
            speechSynthesis.speak(completionUtterance);
        };
        
        speechSynthesis.speak(plateUtterance);
        console.log(`Announcing: ${spelledPlateNumber} telah selesai`);
    } catch (error) {
        console.warn('Error in text-to-speech:', error);
    }
}

// Show visual completion alert
function showCompletionAlert(plateNumber, serviceType) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'completion-alert';
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-check-circle"></i>
            <div class="alert-text">
                <div class="alert-title">KENDARAAN SELESAI</div>
                <div class="alert-plate">${plateNumber}</div>
                <div class="alert-service">${serviceType === 'cuci' ? 'Cuci Mobil' : 'Detailing'}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 500);
    }, 8000);
}

// Update clock with proper formatting
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}.${minutes}.${seconds}`;
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dateString = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    
    document.getElementById('clock-time').textContent = timeString;
    document.getElementById('clock-date').textContent = dateString;
}

// Cache for API responses
let queueCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds cache

// Load active queues with caching
async function loadQueues(forceRefresh = false) {
    const now = Date.now();
    
    // Use cache if available and not expired (unless forced refresh)
    if (!forceRefresh && queueCache && (now - lastFetchTime) < CACHE_DURATION) {
        updateQueueDisplay(queueCache);
        return;
    }
    
    try {
        // Add timeout for Smart TV slow networks
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch('/api/queue/active', {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update cache
        queueCache = data;
        lastFetchTime = now;
        
        updateQueueDisplay(data);
    } catch (error) {
        console.error('Error loading queues:', error);
        
        // Use cached data if available
        if (queueCache) {
            console.log('Using cached queue data due to network error');
            updateQueueDisplay(queueCache);
        } else {
            // Show error state
            displayNetworkError();
        }
    }
}

// Display network error for user feedback
function displayNetworkError() {
    const containers = document.querySelectorAll('.queue-list');
    containers.forEach(container => {
        if (container) {
            container.innerHTML = '<div class="error-message">⚠️ Koneksi bermasalah...</div>';
        }
    });
}

// Cache for current display state to avoid unnecessary DOM updates
let currentDisplayState = {
    cuci: {},
    detailing: {}
};

// Update queue display with optimized DOM manipulation
function updateQueueDisplay(data) {
    // Check if data actually changed before updating DOM
    const newState = {
        cuci: {},
        detailing: {}
    };
    
    // Build new state maps for comparison
    data.cuci.forEach(vehicle => {
        const key = `${vehicle.id}-${vehicle.status}`;
        newState.cuci[key] = vehicle;
    });
    
    data.detailing.forEach(vehicle => {
        const key = `${vehicle.id}-${vehicle.status}`;
        newState.detailing[key] = vehicle;
    });
    
    // Only update if state changed
    if (JSON.stringify(currentDisplayState) === JSON.stringify(newState)) {
        return; // No changes, skip DOM update
    }
    
    // Use DocumentFragment for efficient DOM updates
    updateCuciQueues(data.cuci);
    updateDetailingQueues(data.detailing);
    
    // Update cached state
    currentDisplayState = newState;
}

// Optimized cuci queue update
function updateCuciQueues(cuciData) {
    const containers = {
        'waiting': document.getElementById('cuci-waiting'),
        'washing': document.getElementById('cuci-washing'),
        'drying': document.getElementById('cuci-drying'),
        'completed': document.getElementById('cuci-completed')
    };
    
    // Clear containers efficiently
    Object.values(containers).forEach(container => {
        if (container) container.innerHTML = '';
    });
    
    // Use DocumentFragment for batch DOM insertion
    const fragments = {
        'waiting': document.createDocumentFragment(),
        'washing': document.createDocumentFragment(),
        'drying': document.createDocumentFragment(),
        'completed': document.createDocumentFragment()
    };
    
    cuciData.forEach(vehicle => {
        const fragment = fragments[vehicle.status];
        if (fragment) {
            const item = createQueueItem(vehicle, 'cuci');
            fragment.appendChild(item);
        }
    });
    
    // Batch append to DOM
    Object.entries(fragments).forEach(([status, fragment]) => {
        const container = containers[status];
        if (container && fragment.hasChildNodes()) {
            container.appendChild(fragment);
        }
    });
}

// Optimized detailing queue update with 3-item limit
function updateDetailingQueues(detailingData) {
    const containers = {
        'waiting': document.getElementById('detailing-waiting'),
        'detailing': document.getElementById('detailing-process'),
        'completed': document.getElementById('detailing-completed')
    };
    
    // Clear containers efficiently
    Object.values(containers).forEach(container => {
        if (container) container.innerHTML = '';
    });
    
    const fragments = {
        'waiting': document.createDocumentFragment(),
        'detailing': document.createDocumentFragment(),
        'completed': document.createDocumentFragment()
    };
    
    const counters = { 'waiting': 0, 'detailing': 0, 'completed': 0 };
    
    detailingData.forEach(vehicle => {
        const status = vehicle.status === 'detailing' ? 'detailing' : vehicle.status;
        const fragment = fragments[status];
        
        if (fragment && counters[status] < 3) {
            const item = createQueueItem(vehicle, 'detailing');
            fragment.appendChild(item);
            counters[status]++;
        }
    });
    
    // Batch append to DOM
    Object.entries(fragments).forEach(([status, fragment]) => {
        const container = containers[status === 'detailing' ? 'detailing' : status];
        if (container && fragment.hasChildNodes()) {
            container.appendChild(fragment);
        }
    });
}

// Optimized queue item creation
function createQueueItem(vehicle, serviceType) {
    const item = document.createElement('div');
    item.className = `queue-item ${serviceType}`;
    item.setAttribute('data-status', vehicle.status);
    item.setAttribute('data-id', vehicle.id);
    
    // Create elements efficiently without innerHTML
    const queueNumber = document.createElement('div');
    queueNumber.className = 'queue-number';
    queueNumber.textContent = vehicle.queue_number;
    
    const plateNumber = document.createElement('div');
    plateNumber.className = 'plate-number';
    plateNumber.textContent = vehicle.plate_number;
    
    item.appendChild(queueNumber);
    item.appendChild(plateNumber);
    
    return item;
}

// Legacy function for compatibility
function addQueueItem(targetId, vehicle, serviceType) {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    const item = createQueueItem(vehicle, serviceType);
    container.appendChild(item);
}

// Load running text from API
async function loadRunningText() {
    try {
        const response = await fetch('/api/queue/running-text');
        const data = await response.json();
        document.getElementById('runningText').textContent = data.text;
    } catch (error) {
        console.error('Error loading running text:', error);
    }
}

// Check audio permission status
function checkAudioPermission() {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' }).then((result) => {
            console.log('Microphone permission:', result.state);
        }).catch((error) => {
            console.log('Permission check not supported');
        });
    }
}

// Detect if running on Smart TV
function isSmartTV() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('smart') || 
           userAgent.includes('tv') || 
           userAgent.includes('webos') || 
           userAgent.includes('tizen') ||
           userAgent.includes('hbbtv') ||
           window.innerWidth > 1920; // Large screen indicator
}

// Initialize application with Smart TV optimizations
function initializeApp() {
    const isTV = isSmartTV();
    console.log('Device type:', isTV ? 'Smart TV' : 'Regular browser');
    
    // Optimize for Smart TV
    if (isTV) {
        // Disable audio features for Smart TV (often not supported)
        isAudioEnabled = false;
        console.log('Audio disabled for Smart TV compatibility');
        
        // Add performance indicators
        document.body.classList.add('smart-tv-mode');
        
        // Longer cache duration for Smart TV
        window.CACHE_DURATION = 10000; // 10 seconds for Smart TV
    }
    
    // Update clock
    setInterval(updateClock, 1000);
    updateClock();

    // Initialize audio status (skip for Smart TV)
    if (!isTV) {
        updateAudioStatus();
        checkAudioPermission();
        
        // Show initial instruction
        setTimeout(() => {
            if (!audioContext) {
                console.log('Click anywhere to enable audio notifications');
            }
        }, 2000);
    }

    // Load initial data
    loadQueues();
    loadRunningText();

    // Adaptive refresh intervals
    const refreshInterval = isTV ? 45000 : 30000; // Longer interval for Smart TV
    
    setInterval(() => {
        loadQueues(false); // Use cache when possible
    }, refreshInterval);
    
    // Force refresh every 2 minutes for Smart TV
    if (isTV) {
        setInterval(() => {
            loadQueues(true); // Force refresh
        }, 120000);
    }
}

// Event listeners
function setupEventListeners() {
    // Initialize audio on first user interaction
    document.addEventListener('click', initializeAudio, { once: true });
    document.addEventListener('keydown', initializeAudio, { once: true });
    document.addEventListener('touchstart', initializeAudio, { once: true });
    
    // Initialize voices when available
    if ('speechSynthesis' in window) {
        speechSynthesis.addEventListener('voiceschanged', () => {
            console.log('Speech synthesis voices loaded');
        });
    }

    // Socket event listeners with Smart TV optimizations
    socket.on('queueUpdate', (data) => {
        // Invalidate cache when real-time update received
        queueCache = null;
        
        // Check if this is a status change to completed
        if (data.action === 'statusChanged' && data.vehicle && data.vehicle.status === 'completed') {
            const plateNumber = data.vehicle.plate_number;
            const serviceType = data.vehicle.service_type;
            
            console.log(`Vehicle completed: ${plateNumber} (${serviceType})`);
            
            // Only play audio/TTS on non-Smart TV devices
            if (!isSmartTV()) {
                // Play notification sound
                setTimeout(() => {
                    playNotificationBeep();
                }, 500);
                
                // Announce completion with text-to-speech
                setTimeout(() => {
                    announceCompletion(plateNumber);
                }, 1000);
            }
            
            // Show visual alert (works on all devices)
            setTimeout(() => {
                showCompletionAlert(plateNumber, serviceType);
            }, 1500);
        }
        
        // Update display with forced refresh for real-time updates
        loadQueues(true);
    });

    socket.on('dailyReset', (data) => {
        loadQueues();
    });

    // Socket listener for running text updates
    socket.on('runningTextUpdate', (data) => {
        document.getElementById('runningText').textContent = data.text;
    });
}

// Performance monitoring for development
function addPerformanceIndicator() {
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('192.168')) {
        const indicator = document.createElement('div');
        indicator.className = 'performance-indicator';
        indicator.id = 'perf-indicator';
        document.body.appendChild(indicator);
        
        // Update performance stats
        setInterval(() => {
            const memory = performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A';
            const cacheStatus = queueCache ? 'CACHED' : 'NO CACHE';
            indicator.textContent = `Mem: ${memory} | Cache: ${cacheStatus} | TV: ${isSmartTV() ? 'YES' : 'NO'}`;
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
    addPerformanceIndicator();
});