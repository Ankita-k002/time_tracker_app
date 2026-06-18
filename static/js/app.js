// ----------------------------------------------------
// Time Tracker - Interactive Core JavaScript File
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let timerInterval = null;
    let elapsedSeconds = 0;
    let isPaused = false;
    let currentSessionStartTime = null;
    let currentSessionTitle = '';
    
    let allSessions = [];
    let selectedDateFilter = null; // YYYY-MM-DD
    
    // Calendar state
    let calendarDate = new Date(); // Current viewing month
    
    // Cache DOM Elements
    const tabButtons = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Clock DOM Elements
    const localClockEl = document.getElementById('local-digital-clock');
    const localDateEl = document.getElementById('local-date');
    const sessionTimerEl = document.getElementById('session-timer');
    const timerStatusEl = document.getElementById('timer-status');
    const mainTimerCardEl = document.querySelector('.main-timer-card');
    
    // Control Buttons
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnEnd = document.getElementById('btn-end');
    const sessionTitleInput = document.getElementById('session-title');
    
    // Stats Elements
    const statTodayEl = document.getElementById('stat-today');
    const statMonthEl = document.getElementById('stat-month');
    const statSessionsEl = document.getElementById('stat-sessions');
    
    // Calendar DOM Elements
    const calendarMonthYearEl = document.getElementById('calendar-month-year');
    const calendarDaysEl = document.getElementById('calendar-days');
    const btnPrevMonth = document.getElementById('btn-prev-month');
    const btnNextMonth = document.getElementById('btn-next-month');
    
    // History DOM Elements
    const sessionLogListEl = document.getElementById('session-log-list');
    const btnClearFilterEl = document.getElementById('btn-clear-filter');
    const historyFilterDescEl = document.getElementById('history-filter-desc');
    
    // BigQuery Releases DOM Elements
    const releasesFeedEl = document.getElementById('releases-feed-container');
    const releasesSearchEl = document.getElementById('releases-search');
    const releaseFilterBadges = document.querySelectorAll('.filter-badge');
    let rawReleases = [];

    // ------------------------------------------------
    // 1. Tab Navigation Routing
    // ------------------------------------------------
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add('active');
            
            // Fetch relevant data on switch
            if (tabId === 'tab-releases' && rawReleases.length === 0) {
                fetchReleases();
            } else if (tabId === 'tab-study') {
                loadStudyData();
            }
        });
    });

    // ------------------------------------------------
    // 2. Real-time Digital Clocks
    // ------------------------------------------------
    function updateLocalClock() {
        const now = new Date();
        
        // Format time: HH:MM:SS
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        localClockEl.textContent = `${hours}:${minutes}:${seconds}`;
        
        // Format date: DayOfWeek, Month Day, Year
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        localDateEl.textContent = now.toLocaleDateString('en-US', options);
    }
    
    setInterval(updateLocalClock, 1000);
    updateLocalClock(); // Initial run

    // ------------------------------------------------
    // 3. Persistent Study Timer Logic
    // ------------------------------------------------
    function formatTime(totalSeconds) {
        const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSeconds % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    }

    function timerTick() {
        elapsedSeconds++;
        sessionTimerEl.textContent = formatTime(elapsedSeconds);
        // Persist accumulated seconds in case of reload
        localStorage.setItem('study_elapsed_seconds', elapsedSeconds);
    }

    function startTimer(restore = false) {
        if (!restore) {
            currentSessionStartTime = new Date().toISOString();
            elapsedSeconds = 0;
            currentSessionTitle = sessionTitleInput.value.trim() || 'Untitled Session';
            isPaused = false;
            
            // Persist to local storage
            localStorage.setItem('study_timer_active', 'true');
            localStorage.setItem('study_start_time', currentSessionStartTime);
            localStorage.setItem('study_session_title', currentSessionTitle);
            localStorage.setItem('study_elapsed_seconds', '0');
            localStorage.setItem('study_is_paused', 'false');
        } else {
            // Restore details
            currentSessionStartTime = localStorage.getItem('study_start_time');
            currentSessionTitle = localStorage.getItem('study_session_title') || 'Untitled Session';
            elapsedSeconds = parseInt(localStorage.getItem('study_elapsed_seconds') || '0');
            isPaused = localStorage.getItem('study_is_paused') === 'true';
            
            sessionTitleInput.value = currentSessionTitle;
            sessionTimerEl.textContent = formatTime(elapsedSeconds);
        }

        sessionTitleInput.disabled = true;
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnEnd.disabled = false;
        
        mainTimerCardEl.classList.add('active-timer-running');
        
        if (isPaused) {
            timerStatusEl.className = "card-status-badge paused";
            timerStatusEl.innerHTML = '<i class="fa-solid fa-pause"></i> Paused';
            btnPause.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
        } else {
            timerStatusEl.className = "card-status-badge running";
            timerStatusEl.innerHTML = '<i class="fa-solid fa-circle-play"></i> Studying...';
            btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            
            // Adjust elapsedSeconds if window was closed/refreshed while active (not paused)
            if (restore && currentSessionStartTime) {
                const startEpoch = new Date(currentSessionStartTime).getTime();
                const nowEpoch = new Date().getTime();
                // If elapsedSeconds is lower, recalculate based on actual start time and pause time
                const secondsSinceStart = Math.floor((nowEpoch - startEpoch) / 1000);
                if (secondsSinceStart > elapsedSeconds) {
                    elapsedSeconds = secondsSinceStart;
                    sessionTimerEl.textContent = formatTime(elapsedSeconds);
                }
            }
            
            timerInterval = setInterval(timerTick, 1000);
        }
    }

    function pauseTimer() {
        if (isPaused) {
            // Resume
            isPaused = false;
            localStorage.setItem('study_is_paused', 'false');
            timerStatusEl.className = "card-status-badge running";
            timerStatusEl.innerHTML = '<i class="fa-solid fa-circle-play"></i> Studying...';
            btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            
            // Adjust start time if we paused for a long time (to preserve elapsed accuracy)
            // But simplest is to just start ticking again
            timerInterval = setInterval(timerTick, 1000);
            showToast("Session resumed", "info");
        } else {
            // Pause
            isPaused = true;
            localStorage.setItem('study_is_paused', 'true');
            clearInterval(timerInterval);
            timerStatusEl.className = "card-status-badge paused";
            timerStatusEl.innerHTML = '<i class="fa-solid fa-pause"></i> Paused';
            btnPause.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
            showToast("Session paused", "warning");
        }
    }

    async function endTimer() {
        clearInterval(timerInterval);
        const endTime = new Date().toISOString();
        const finalSeconds = elapsedSeconds;
        const finalTitle = sessionTitleInput.value.trim() || 'Untitled Session';
        
        // Construct standard YYYY-MM-DD locally
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Reset UI
        sessionTimerEl.textContent = "00:00:00";
        timerStatusEl.className = "card-status-badge";
        timerStatusEl.innerHTML = '<i class="fa-solid fa-circle-pause"></i> Idle';
        mainTimerCardEl.classList.remove('active-timer-running');
        
        sessionTitleInput.value = '';
        sessionTitleInput.disabled = false;
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        btnEnd.disabled = true;
        
        // Clear Local Storage
        localStorage.removeItem('study_timer_active');
        localStorage.removeItem('study_start_time');
        localStorage.removeItem('study_session_title');
        localStorage.removeItem('study_elapsed_seconds');
        localStorage.removeItem('study_is_paused');
        
        elapsedSeconds = 0;
        isPaused = false;

        if (finalSeconds < 5) {
            showToast("Session discarded (too short)", "warning");
            return;
        }

        // Save to Database
        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: finalTitle,
                    start_time: currentSessionStartTime || new Date(Date.now() - finalSeconds*1000).toISOString(),
                    end_time: endTime,
                    duration_seconds: finalSeconds,
                    date: dateStr
                })
            });
            
            const result = await response.json();
            if (response.ok) {
                showToast(`Session saved: ${formatTime(finalSeconds)}`, "success");
                loadStudyData(); // Refresh list and dashboard calendar
            } else {
                showToast(`Error saving session: ${result.error}`, "danger");
            }
        } catch (error) {
            console.error("Error saving session:", error);
            showToast("Network error. Unable to save session.", "danger");
        }
    }

    // Attach Event Listeners to Buttons
    btnStart.addEventListener('click', () => startTimer(false));
    btnPause.addEventListener('click', pauseTimer);
    btnEnd.addEventListener('click', endTimer);

    // Restore Timer state on load if active
    if (localStorage.getItem('study_timer_active') === 'true') {
        startTimer(true);
    }

    // ------------------------------------------------
    // 4. Data Loading: Sessions history and calendar
    // ------------------------------------------------
    async function loadStudyData() {
        try {
            const response = await fetch('/api/sessions');
            if (response.ok) {
                allSessions = await response.json();
                renderAnalytics();
                renderCalendar();
                renderSessionLogs();
            }
        } catch (error) {
            console.error("Error fetching study sessions:", error);
            showToast("Could not load study sessions", "danger");
        }
    }

    // Render stats
    function renderAnalytics() {
        const todayStr = getLocalDateString(new Date());
        const currentMonthYearStr = getLocalMonthYearString(new Date());
        
        let secondsToday = 0;
        let secondsMonth = 0;
        
        allSessions.forEach(session => {
            // Compare dates
            const sessionDate = new Date(session.start_time);
            const sessDateStr = getLocalDateString(sessionDate);
            const sessMonthYearStr = getLocalMonthYearString(sessionDate);
            
            if (sessDateStr === todayStr) {
                secondsToday += session.duration_seconds;
            }
            if (sessMonthYearStr === currentMonthYearStr) {
                secondsMonth += session.duration_seconds;
            }
        });
        
        statTodayEl.textContent = formatDurationShort(secondsToday);
        statMonthEl.textContent = formatDurationShort(secondsMonth);
        statSessionsEl.textContent = allSessions.length;
    }

    function getLocalDateString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getLocalMonthYearString(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    function formatDurationShort(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (hours === 0 && minutes === 0) return "0m";
        if (hours === 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
    }

    // Render Calendar Widget
    function renderCalendar() {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        
        // Header Text: e.g. "June 2026"
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        calendarMonthYearEl.textContent = `${monthNames[month]} ${year}`;
        
        calendarDaysEl.innerHTML = '';
        
        // First day of current month
        const firstDayIndex = new Date(year, month, 1).getDay();
        // Total days in current month
        const totalDays = new Date(year, month + 1, 0).getDate();
        // Total days in previous month
        const prevTotalDays = new Date(year, month, 0).getDate();
        
        // Sum study seconds for each day of this month
        const dailyDuration = {};
        allSessions.forEach(s => {
            const dateObj = new Date(s.start_time);
            if (dateObj.getFullYear() === year && dateObj.getMonth() === month) {
                const day = dateObj.getDate();
                dailyDuration[day] = (dailyDuration[day] || 0) + s.duration_seconds;
            }
        });
        
        // Render empty cells from previous month
        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevTotalDays - i + 1;
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell other-month';
            cell.textContent = dayNum;
            calendarDaysEl.appendChild(cell);
        }
        
        // Render current month days
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            cell.textContent = day;
            
            // Format full date YYYY-MM-DD
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const fullDateStr = `${year}-${mStr}-${dStr}`;
            
            // Determine level
            const daySeconds = dailyDuration[day] || 0;
            let level = 0;
            if (daySeconds > 0) {
                if (daySeconds < 1800) level = 1; // Under 30 mins
                else if (daySeconds < 7200) level = 2; // 30m to 2h
                else level = 3; // 2h+
            }
            
            cell.classList.add(`study-level-${level}`);
            
            // Check if today
            if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
                cell.classList.add('today');
            }
            
            // Check if selected
            if (selectedDateFilter === fullDateStr) {
                cell.classList.add('selected');
            }
            
            // Title tooltip
            if (daySeconds > 0) {
                cell.title = `Studied ${formatDurationShort(daySeconds)}`;
            } else {
                cell.title = "No study records";
            }
            
            // Click to filter logs
            cell.addEventListener('click', () => {
                if (selectedDateFilter === fullDateStr) {
                    // Toggle off filter
                    selectedDateFilter = null;
                    cell.classList.remove('selected');
                } else {
                    selectedDateFilter = fullDateStr;
                    document.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('selected'));
                    cell.classList.add('selected');
                }
                updateFilterView();
                renderSessionLogs();
            });
            
            calendarDaysEl.appendChild(cell);
        }
    }

    function updateFilterView() {
        if (selectedDateFilter) {
            btnClearFilterEl.classList.remove('hidden');
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            const dateParsed = new Date(selectedDateFilter + 'T00:00:00');
            historyFilterDescEl.textContent = `Sessions on ${dateParsed.toLocaleDateString('en-US', options)}`;
        } else {
            btnClearFilterEl.classList.add('hidden');
            historyFilterDescEl.textContent = 'All recorded sessions';
        }
    }

    btnClearFilterEl.addEventListener('click', () => {
        selectedDateFilter = null;
        document.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('selected'));
        updateFilterView();
        renderSessionLogs();
    });

    btnPrevMonth.addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });

    btnNextMonth.addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Render Session logs list
    function renderSessionLogs() {
        sessionLogListEl.innerHTML = '';
        
        let filteredSessions = allSessions;
        if (selectedDateFilter) {
            filteredSessions = allSessions.filter(s => s.date === selectedDateFilter);
        }
        
        if (filteredSessions.length === 0) {
            sessionLogListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <p>No sessions recorded for this selection.</p>
                </div>
            `;
            return;
        }
        
        // Group sessions by day
        const groups = {};
        filteredSessions.forEach(s => {
            const dateParsed = new Date(s.start_time);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDay = dateParsed.toLocaleDateString('en-US', options);
            if (!groups[formattedDay]) groups[formattedDay] = [];
            groups[formattedDay].push(s);
        });
        
        // Render groups
        for (const [dayName, sessions] of Object.entries(groups)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'log-group';
            
            const groupTitle = document.createElement('div');
            groupTitle.className = 'log-group-title';
            groupTitle.textContent = dayName;
            groupDiv.appendChild(groupTitle);
            
            sessions.forEach(session => {
                const item = document.createElement('div');
                item.className = 'log-item';
                
                const startHour = formatTimeAmPm(new Date(session.start_time));
                const endHour = formatTimeAmPm(new Date(session.end_time));
                
                item.innerHTML = `
                    <div class="log-meta">
                        <div class="log-title">${escapeHTML(session.title)}</div>
                        <div class="log-times">
                            <i class="fa-regular fa-clock"></i> ${startHour} - ${endHour}
                        </div>
                    </div>
                    <div class="log-right">
                        <span class="log-duration">${formatTime(session.duration_seconds)}</span>
                        <button class="btn-delete-log" data-id="${session.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
                
                // Add delete functionality
                item.querySelector('.btn-delete-log').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete study session: "${session.title}"?`)) {
                        await deleteSession(session.id);
                    }
                });
                
                groupDiv.appendChild(item);
            });
            
            sessionLogListEl.appendChild(groupDiv);
        }
    }

    async function deleteSession(id) {
        try {
            const response = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast("Session deleted successfully", "info");
                loadStudyData();
            } else {
                showToast("Failed to delete session", "danger");
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            showToast("Network error. Unable to delete.", "danger");
        }
    }

    function formatTimeAmPm(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = String(minutes).padStart(2, '0');
        return `${hours}:${minutes} ${ampm}`;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // ------------------------------------------------
    // 5. BigQuery Release Notes Fetching & Parser
    // ------------------------------------------------
    async function fetchReleases() {
        releasesFeedEl.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Retrieving release entries...</p>
            </div>
        `;
        
        try {
            const response = await fetch('/api/releases');
            if (response.ok) {
                rawReleases = await response.json();
                renderReleases();
            } else {
                throw new Error("API call failed");
            }
        } catch (error) {
            console.error("Error fetching release notes:", error);
            releasesFeedEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Unable to connect to Google Cloud feed. Please check your network connection.</p>
                </div>
            `;
            showToast("Failed to fetch BigQuery release notes", "danger");
        }
    }

    // Smart parsing for release content to map headers into premium layout
    function formatReleaseContent(rawContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawContent;
        
        const sections = [];
        let currentSection = null;
        
        Array.from(tempDiv.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H3') {
                const category = node.textContent.trim();
                currentSection = {
                    category: category,
                    elements: []
                };
                sections.push(currentSection);
            } else if (currentSection) {
                currentSection.elements.push(node.cloneNode(true));
            } else {
                // If text is before any H3
                if (node.textContent.trim() !== "") {
                    if (!sections.length) {
                        currentSection = {
                            category: 'General',
                            elements: []
                        };
                        sections.push(currentSection);
                    }
                    currentSection.elements.push(node.cloneNode(true));
                }
            }
        });
        
        if (sections.length === 0) {
            // Fallback: If no tags matched but content exists
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'release-section section-general';
            fallbackDiv.innerHTML = '<h3>Release</h3>' + rawContent;
            return fallbackDiv.outerHTML;
        }
        
        let html = '';
        sections.forEach(sec => {
            const catClass = sec.category.toLowerCase().replace(/[^a-z0-9]/g, '');
            const wrapper = document.createElement('div');
            wrapper.className = `release-section section-${catClass}`;
            
            const h3 = document.createElement('h3');
            h3.textContent = sec.category;
            wrapper.appendChild(h3);
            
            sec.elements.forEach(el => {
                wrapper.appendChild(el);
            });
            
            html += wrapper.outerHTML;
        });
        
        return html;
    }

    function renderReleases() {
        releasesFeedEl.innerHTML = '';
        
        const searchQuery = releasesSearchEl.value.trim().toLowerCase();
        const activeFilter = document.querySelector('.filter-badge.active').getAttribute('data-filter');
        
        let filteredReleases = rawReleases;
        
        // Apply filter category and search query
        filteredReleases = filteredReleases.map(release => {
            // To filter content by sections, we need to inspect the sections
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = release.content;
            
            // Get all sections
            const sections = tempDiv.querySelectorAll('h3');
            let matchedSections = [];
            
            // If there are no section headings, default category is 'general'
            const categories = sections.length > 0 
                ? Array.from(sections).map(s => s.textContent.trim().toLowerCase()) 
                : ['general'];
                
            // Search text check
            const matchesSearch = 
                release.title.toLowerCase().includes(searchQuery) ||
                release.content.toLowerCase().includes(searchQuery);
                
            // Category filter check
            let matchesCategory = activeFilter === 'all';
            if (activeFilter !== 'all') {
                matchesCategory = categories.some(cat => cat.includes(activeFilter));
            }
            
            if (matchesSearch && matchesCategory) {
                // If filtering by a specific category, show ONLY the sections that match that category!
                if (activeFilter !== 'all') {
                    // Let's filter the contents of HTML in a premium way
                    const resultDiv = document.createElement('div');
                    let currentH3 = null;
                    let capture = false;
                    
                    Array.from(tempDiv.childNodes).forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H3') {
                            const cat = node.textContent.trim().toLowerCase();
                            if (cat.includes(activeFilter)) {
                                capture = true;
                                resultDiv.appendChild(node.cloneNode(true));
                            } else {
                                capture = false;
                            }
                        } else if (capture) {
                            resultDiv.appendChild(node.cloneNode(true));
                        }
                    });
                    
                    return {
                        ...release,
                        visibleContent: resultDiv.innerHTML
                    };
                }
                
                return {
                    ...release,
                    visibleContent: release.content
                };
            }
            return null;
        }).filter(r => r !== null);
        
        if (filteredReleases.length === 0) {
            releasesFeedEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-rss-square"></i>
                    <p>No release notes found matching the criteria.</p>
                </div>
            `;
            return;
        }
        
        // Render release cards
        filteredReleases.forEach(release => {
            const card = document.createElement('div');
            card.className = 'release-card';
            
            // Render nice date format
            const pubDate = new Date(release.updated || Date.now());
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = pubDate.toLocaleDateString('en-US', options);
            
            card.innerHTML = `
                <div class="release-header">
                    <div class="release-date">${formattedDate}</div>
                    <a href="${release.link}" target="_blank" class="release-link">
                        View GCP Docs <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
                <div class="release-content">
                    ${formatReleaseContent(release.visibleContent)}
                </div>
            `;
            
            releasesFeedEl.appendChild(card);
        });
    }

    // Attach Search & Filters
    releasesSearchEl.addEventListener('input', renderReleases);
    
    releaseFilterBadges.forEach(badge => {
        badge.addEventListener('click', () => {
            releaseFilterBadges.forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            renderReleases();
        });
    });

    // ------------------------------------------------
    // 6. Toast Notification Helper
    // ------------------------------------------------
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="fa-solid fa-info-circle"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'danger') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
        if (type === 'warning') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
        
        toast.innerHTML = `
            ${icon}
            <div class="toast-content">${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Remove after 3.5s
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3500);
    }

    // ------------------------------------------------
    // 7. Initial Startup Executions
    // ------------------------------------------------
    loadStudyData();
});
