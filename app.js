// ======================
// COOKIE UTILITY FUNCTIONS
// ======================
function setCookie(name, value, daysToExpire) {
    const date = new Date();
    date.setTime(date.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const cookieName = `${name}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookies = decodedCookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return "";
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ======================
// STORAGE MANAGEMENT
// ======================
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error("LocalStorage error:", e);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("LocalStorage error:", e);
        return null;
    }
}

// ======================
// ACTIVITY TRACKING
// ======================
function initializeUserActivity() {
    const now = new Date();
    const lastVisit = getCookie('lastVisit') || now.toISOString();
    const totalVisits = parseInt(getCookie('totalVisits')) || 0;
    
    setCookie('lastVisit', now.toISOString(), 365);
    setCookie('totalVisits', totalVisits + 1, 365);
    
    return {
        firstVisit: getCookie('firstVisit') || now.toISOString(),
        lastVisit: lastVisit,
        currentVisit: now.toISOString(),
        totalVisits: totalVisits + 1,
        moodsLogged: 0,
        interactions: []
    };
}

function trackInteraction(activity, details = {}) {
    const interaction = {
        type: activity,
        timestamp: new Date().toISOString(),
        ...details
    };
    
    const userActivity = loadFromLocalStorage('userActivity') || initializeUserActivity();
    userActivity.interactions.push(interaction);
    saveToLocalStorage('userActivity', userActivity);
    
    return interaction;
}

// ======================
// MAIN APPLICATION
// ======================
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const moodOptions = document.querySelectorAll('.mood-option');
    const saveBtn = document.getElementById('save-btn');
    const moodNote = document.getElementById('mood-note');
    const dateDisplay = document.getElementById('date-display');
    const moodHistory = document.getElementById('mood-history');
    
    // Initialize Data
    let moodData = loadFromLocalStorage('moodData') || [];
    let userActivity = loadFromLocalStorage('userActivity') || initializeUserActivity();
    let selectedMood = null;
    let moodChart = null;
    
    // Track page view
    trackInteraction('page_view');
    
    // Initialize UI
    updateDateDisplay();
    renderHistory();
    setupChart();
    checkNotificationPermission();
    
    // Event Listeners
    moodOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectedMood = this.getAttribute('data-mood');
            moodOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            trackInteraction('mood_selected', { 
                mood: selectedMood 
            });
        });
    });
    
    saveBtn.addEventListener('click', saveMoodEntry);
    
    window.addEventListener('scroll', function() {
        trackInteraction('page_scroll', {
            scrollPosition: window.scrollY
        });
    });
    
    // Before page unload, save all data
    window.addEventListener('beforeunload', function() {
        saveToLocalStorage('moodData', moodData);
        saveToLocalStorage('userActivity', userActivity);
    });
    
    // ======================
    // CORE FUNCTIONS
    // ======================
    function updateDateDisplay() {
        const now = new Date();
        dateDisplay.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    function saveMoodEntry() {
        if (!selectedMood) {
            showAlert('Please select a mood first!', 'warning');
            return;
        }
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const newEntry = {
            date: today,
            mood: selectedMood,
            note: moodNote.value.trim(),
            timestamp: now.getTime()
        };
        
        // Update or add entry
        const existingIndex = moodData.findIndex(entry => entry.date === today);
        if (existingIndex >= 0) {
            moodData[existingIndex] = newEntry;
        } else {
            moodData.push(newEntry);
            userActivity.moodsLogged++;
        }
        
        // Save data
        saveToLocalStorage('moodData', moodData);
        saveToLocalStorage('userActivity', userActivity);
        setCookie('lastMood', selectedMood, 7);
        
        // Track the save action
        trackInteraction('mood_saved', {
            mood: selectedMood,
            hasNote: !!moodNote.value.trim()
        });
        
        // Reset UI
        resetForm();
        renderHistory();
        updateChart();
        
        showAlert('Mood saved successfully!', 'success');
    }
    
    function resetForm() {
        moodOptions.forEach(opt => opt.classList.remove('active'));
        selectedMood = null;
        moodNote.value = '';
    }
    
    function renderHistory() {
        moodHistory.innerHTML = '';
        
        if (moodData.length === 0) {
            moodHistory.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted">No entries yet</p>
                    <p>Select your first mood to begin!</p>
                </div>
            `;
            return;
        }
        
        // Sort by date (newest first)
        const sortedData = [...moodData].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedData.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            const dateStr = entryDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            const moodEmoji = getMoodEmoji(entry.mood);
            const moodName = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
            
            const entryEl = document.createElement('div');
            entryEl.className = `history-item ${entry.mood} animate__animated animate__fadeIn`;
            entryEl.innerHTML = `
                <div class="mood-emoji-large">${moodEmoji}</div>
                <div class="mood-details">
                    <div class="mood-date">${dateStr}</div>
                    <div class="mood-name">${moodName}</div>
                    ${entry.note ? `<div class="mood-note">${entry.note}</div>` : ''}
                </div>
            `;
            
            moodHistory.appendChild(entryEl);
        });
    }
    
    function getMoodEmoji(mood) {
        const emojis = {
            sunny: '☀️',
            rainy: '🌧️',
            cloudy: '☁️',
            stormy: '⚡',
            breezy: '🌬️',
            foggy: '🌫️'
        };
        return emojis[mood] || '❓';
    }
    
    function setupChart() {
        const chartContainer = document.getElementById('history-chart');
        chartContainer.innerHTML = '<canvas id="moodChart"></canvas>';
        updateChart();
    }
    
    function updateChart() {
        const ctx = document.getElementById('moodChart').getContext('2d');
        const last7Days = moodData.slice(-7).reverse();
        
        if (moodChart) {
            moodChart.destroy();
        }
        
        if (last7Days.length === 0) {
            return;
        }
        
        moodChart = new Chart(ctx, {
            type: 'line',
            data: getChartData(last7Days),
            options: getChartOptions()
        });
    }
    
    function getChartData(data) {
        return {
            labels: data.map(entry => {
                const date = new Date(entry.timestamp);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Mood Trend',
                data: data.map(entry => {
                    const moodOrder = ['sunny', 'breezy', 'foggy', 'cloudy', 'rainy', 'stormy'];
                    return moodOrder.indexOf(entry.mood);
                }),
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.05)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: data.map(entry => `var(--${entry.mood})`),
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        };
    }
    
    function getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 5,
                    ticks: {
                        callback: function(value) {
                            const moods = ['Sunny', 'Breezy', 'Foggy', 'Cloudy', 'Rainy', 'Stormy'];
                            return moods[value] || '';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const moods = ['Sunny', 'Breezy', 'Foggy', 'Cloudy', 'Rainy', 'Stormy'];
                            return moods[context.raw] || '';
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        };
    }
    
    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
        alert.style.zIndex = '1000';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 3000);
    }
    
    // ======================
    // NOTIFICATION FUNCTIONS
    // ======================
    function checkNotificationPermission() {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            scheduleDailyNotification();
        } else if (Notification.permission !== 'denied') {
            showNotificationPermissionRequest();
        }
    }
    
    function showNotificationPermissionRequest() {
        const notificationRequest = document.createElement('div');
        notificationRequest.className = 'notification-permission-request alert alert-info position-fixed bottom-0 start-0 end-0 m-3';
        notificationRequest.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>Get Daily Reminders</strong>
                    <p class="mb-0">Would you like to receive daily mood logging reminders?</p>
                </div>
                <div>
                    <button id="enable-notifications" class="btn btn-sm btn-primary me-2">Yes</button>
                    <button id="dismiss-notifications" class="btn btn-sm btn-outline-secondary">No Thanks</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notificationRequest);
        
        document.getElementById('enable-notifications').addEventListener('click', requestNotificationPermission);
        document.getElementById('dismiss-notifications').addEventListener('click', () => {
            notificationRequest.remove();
            setCookie('notificationDismissed', 'true', 30);
        });
    }
    
    function requestNotificationPermission() {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                document.querySelector('.notification-permission-request').remove();
                scheduleDailyNotification();
                showAlert('Notifications enabled! You\'ll get daily reminders.', 'success');
                trackInteraction('notifications_enabled');
            }
        });
    }
    
    function scheduleDailyNotification() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        
        const now = new Date();
        const targetTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            19, 0, 0
        );
        
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilNotification = targetTime.getTime() - now.getTime();
        
        setTimeout(() => {
            showDailyNotification();
            setInterval(showDailyNotification, 24 * 60 * 60 * 1000);
        }, timeUntilNotification);
    }
    
    function showDailyNotification() {
        const options = {
            body: 'How is your emotional weather today? Take a moment to log your mood.',
            icon: 'https://emojicdn.elk.sh/🌿',
            vibrate: [200, 100, 200]
        };
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('Nature\'s Mood Diary Reminder', options);
            });
        } else {
            new Notification('Nature\'s Mood Diary Reminder', options);
        }
        
        trackInteraction('notification_shown');
    }
});

// ======================
// SERVICE WORKER REGISTRATION
// ======================
if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
