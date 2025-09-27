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

// Load active queues
async function loadQueues() {
    try {
        const response = await fetch('/api/queue/active');
        const data = await response.json();
        updateQueueDisplay(data);
    } catch (error) {
        console.error('Error loading queues:', error);
    }
}

// Update queue display
function updateQueueDisplay(data) {
    // Clear all queue lists
    const lists = document.querySelectorAll('.queue-list');
    lists.forEach(list => {
        list.innerHTML = '';
    });

    // Process cuci queues
    data.cuci.forEach(vehicle => {
        let targetId;
        switch(vehicle.status) {
            case 'waiting':
                targetId = 'cuci-waiting';
                break;
            case 'washing':
                targetId = 'cuci-washing';
                break;
            case 'drying':
                targetId = 'cuci-drying';
                break;
            case 'completed':
                targetId = 'cuci-completed';
                break;
        }
        if (targetId) {
            addQueueItem(targetId, vehicle, 'cuci');
        }
    });

    // Process detailing queues with 3 item limit per column
    const detailingColumns = {
        'detailing-waiting': 0,
        'detailing-process': 0,
        'detailing-completed': 0
    };
    
    data.detailing.forEach(vehicle => {
        let targetId;
        switch(vehicle.status) {
            case 'waiting':
                targetId = 'detailing-waiting';
                break;
            case 'detailing':
                targetId = 'detailing-process';
                break;
            case 'completed':
                targetId = 'detailing-completed';
                break;
        }
        if (targetId && detailingColumns[targetId] < 3) {
            addQueueItem(targetId, vehicle, 'detailing');
            detailingColumns[targetId]++;
        }
    });
}

// Add queue item to display
function addQueueItem(targetId, vehicle, serviceType) {
    const container = document.getElementById(targetId);
    
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = `queue-item ${serviceType}`;
    item.setAttribute('data-status', vehicle.status);
    item.innerHTML = `
        <div class="queue-number">${vehicle.queue_number}</div>
        <div class="plate-number">${vehicle.plate_number}</div>
    `;
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

// Initialize application
function initializeApp() {
    // Update clock
    setInterval(updateClock, 1000);
    updateClock();

    // Initialize audio status
    updateAudioStatus();
    checkAudioPermission();
    
    // Show initial instruction
    setTimeout(() => {
        if (!audioContext) {
            console.log('Click anywhere to enable audio notifications');
        }
    }, 2000);

    // Load initial data
    loadQueues();
    loadRunningText();

    // Refresh every 30 seconds as backup
    setInterval(() => {
        loadQueues();
    }, 30000);
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

    // Socket event listeners
    socket.on('queueUpdate', (data) => {
        // Check if this is a status change to completed
        if (data.action === 'statusChanged' && data.vehicle && data.vehicle.status === 'completed') {
            const plateNumber = data.vehicle.plate_number;
            const serviceType = data.vehicle.service_type;
            
            console.log(`Vehicle completed: ${plateNumber} (${serviceType})`);
            
            // Play notification sound
            setTimeout(() => {
                playNotificationBeep();
            }, 500);
            
            // Announce completion with text-to-speech
            setTimeout(() => {
                announceCompletion(plateNumber);
            }, 1000);
            
            // Show visual alert
            setTimeout(() => {
                showCompletionAlert(plateNumber, serviceType);
            }, 1500);
        }
        
        // Update display
        loadQueues();
    });

    socket.on('dailyReset', (data) => {
        loadQueues();
    });

    // Socket listener for running text updates
    socket.on('runningTextUpdate', (data) => {
        document.getElementById('runningText').textContent = data.text;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
});