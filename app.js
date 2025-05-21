document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const moodOptions = document.querySelectorAll('.mood-option');
    const saveBtn = document.getElementById('save-btn');
    const moodNote = document.getElementById('mood-note');
    const dateDisplay = document.getElementById('date-display');
    const moodHistory = document.getElementById('mood-history');
    const notificationPermission = document.querySelector('.notification-permission');
    const enableNotificationsBtn = document.getElementById('enable-notifications');
    const laterBtn = document.getElementById('later-btn');
    
    // Variables
    let selectedMood = null;
    let moodData = JSON.parse(localStorage.getItem('moodData')) || [];
    let moodChart = null;
    
    // Initialize
    updateDateDisplay();
    renderHistory();
    renderChart();
    checkNotificationPermission();
    
    // Event Listeners
    moodOptions.forEach(option => {
        option.addEventListener('click', function() {
            moodOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedMood = this.getAttribute('data-mood');
        });
    });
    
    saveBtn.addEventListener('click', saveMoodEntry);
    enableNotificationsBtn.addEventListener('click', requestNotificationPermission);
    laterBtn.addEventListener('click', () => {
        notificationPermission.style.display = 'none';
    });
    
    // Functions
    function updateDateDisplay() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-US', options);
    }
    
    function saveMoodEntry() {
        if (!selectedMood) {
            alert('Please select a mood first!');
            return;
        }
        
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        
        // Check if entry already exists for today
        const existingEntryIndex = moodData.findIndex(entry => entry.date === dateString);
        
        const entry = {
            date: dateString,
            mood: selectedMood,
            note: moodNote.value.trim(),
            timestamp: now.getTime()
        };
        
        if (existingEntryIndex !== -1) {
            moodData[existingEntryIndex] = entry;
        } else {
            moodData.push(entry);
        }
        
        localStorage.setItem('moodData', JSON.stringify(moodData));
        
        // Reset form
        moodOptions.forEach(opt => opt.classList.remove('active'));
        selectedMood = null;
        moodNote.value = '';
        
        // Update UI
        renderHistory();
        renderChart();
        
        // Show confirmation
        showConfirmation('Mood saved successfully!');
    }
    
    function renderHistory() {
        moodHistory.innerHTML = '';
        
        if (moodData.length === 0) {
            moodHistory.innerHTML = '<p class="text-muted text-center">No entries yet. Start by saving your first mood!</p>';
            return;
        }
        
        // Sort by date (newest first)
        const sortedData = [...moodData].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedData.forEach(entry => {
            const entryDate = new Date(entry.date);
            const dateStr = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const entryEl = document.createElement('div');
            entryEl.className = `history-item ${entry.mood}`;
            entryEl.style.backgroundColor = `var(--${entry.mood})`;
            if (entry.mood === 'stormy') {
                entryEl.style.color = 'white';
            }
            
            entryEl.innerHTML = `
                <div>
                    <strong>${dateStr}</strong>
                    <div>${getMoodEmoji(entry.mood)} ${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}</div>
                    ${entry.note ? `<small>${entry.note}</small>` : ''}
                </div>
                <div class="mood-emoji">${getMoodEmoji(entry.mood)}</div>
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
    
    function renderChart() {
        const ctx = document.getElementById('history-chart').getContext('2d');
        
        // Group by mood for last 7 days
        const last7Days = moodData.slice(-7).reverse();
        const labels = last7Days.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const moodValues = last7Days.map(entry => {
            // Convert mood to numerical value for chart
            const moodOrder = ['sunny', 'breezy', 'foggy', 'cloudy', 'rainy', 'stormy'];
            return moodOrder.indexOf(entry.mood);
        });
        
        if (moodChart) {
            moodChart.destroy();
        }
        
        moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mood Trend',
                    data: moodValues,
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: last7Days.map(entry => `var(--${entry.mood})`),
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
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
            }
        });
    }
    
    function checkNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }
        
        if (Notification.permission === 'granted') {
            // Already granted, schedule notifications
            scheduleDailyNotification();
        } else if (Notification.permission !== 'denied') {
            // Show permission request
            notificationPermission.style.display = 'block';
        }
    }
    
    function requestNotificationPermission() {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationPermission.style.display = 'none';
                scheduleDailyNotification();
                showConfirmation('Notifications enabled! You\'ll get daily reminders.');
            }
        });
    }
    
    function scheduleDailyNotification() {
        // Check if notifications are supported and permitted
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
        // Clear any existing notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.getNotifications().then(notifications => {
                    notifications.forEach(notification => notification.close());
                });
            });
        }
        
        // Schedule notification for 7 PM daily
        const now = new Date();
        const targetTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            19, 0, 0
        );
        
        // If it's already past 7 PM, schedule for tomorrow
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilNotification = targetTime.getTime() - now.getTime();
        
        setTimeout(() => {
            showNotification();
            // Then schedule for every 24 hours
            setInterval(showNotification, 24 * 60 * 60 * 1000);
        }, timeUntilNotification);
    }
    
    function showNotification() {
        const options = {
            body: 'How is your emotional weather today? Log your mood in Nature\'s Mood Diary!',
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
    }
    
    function showConfirmation(message) {
        const confirmation = document.createElement('div');
        confirmation.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 animate__animated animate__fadeInDown';
        confirmation.style.zIndex = '1000';
        confirmation.textContent = message;
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.classList.add('animate__fadeOutUp');
            setTimeout(() => confirmation.remove(), 1000);
        }, 3000);
    }
});

// Service Worker Registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
