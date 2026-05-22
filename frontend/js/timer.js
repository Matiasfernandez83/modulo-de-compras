// Temporizador de sesión
let timerInterval = null;
let startTime = null;

export function startSessionTimer() {
    startTime = Date.now();
    
    timerInterval = setInterval(() => {
        updateTimerDisplay();
    }, 1000);
}

export function stopSessionTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const displaySeconds = seconds % 60;
    const displayMinutes = minutes % 60;
    const displayHours = hours;
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = 
            `${pad(displayHours)}:${pad(displayMinutes)}:${pad(displaySeconds)}`;
    }
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

export function getSessionDuration() {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 60000); // en minutos
}

