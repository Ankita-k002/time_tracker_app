# Time Tracker & BigQuery Releases Dashboard

A premium, modern web application designed for anyone who wants to track their study or work progress, keep a detailed record of their focus sessions, and stay organized. 

Alongside the tracker, the app includes a **Google Cloud BigQuery Release Notes Aggregator** (which parses Google's official XML release feed into a searchable, categorized updates grid). This integration lets users monitor cloud data updates in one dashboard while managing their learning sessions.

---

## 🎓 Course Project

This web application was built using **Antigravity CLI** while attending the **Kaggle x Google: 5-Day AI Agents (Intensive Vibe Coding Course with Google)**.

---

## 🛠️ Tech Stack & Architecture

- **Backend Framework**: Python Flask (handling HTML rendering and JSON REST API routes)
- **Database**: SQLite (persisting study records in `study_tracker.db`)
- **Frontend Core**: Vanilla JavaScript (ES6+), HTML5, and CSS3
- **External CDN Utilities**: FontAwesome (vector icons), Google Fonts (Plus Jakarta Sans, JetBrains Mono, Orbitron)
- **Data Source**: Official GCP XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`)

---

## 🚀 Key Features

### 1. Persistent Study Focus Timer
*   **Live Neon Clock**: Displays elapsed focus duration with a sleek digital font (`Orbitron`) and breathing animations.
*   **Crash & Refresh Resilient**: The stopwatch session syncs with the browser's `localStorage`. If you close the tab or reload, the active timer continues counting accurately from its start time.
*   **Contextual Titles**: Users can add custom session labels (e.g. *BigQuery Optimization*, *Python Refactoring*).

### 2. Analytics & Interactive Heatmap
*   **Real-time Metrics**: Summarizes total study hours completed *Today*, *This Month*, and *Total Sessions* recorded.
*   **GitHub-Style Contribution Grid**: Renders an interactive calendar of the month, color-coding days by study intensity (0 hrs, <30m, 30m-2h, 2h+).
*   **Interactive History Filtering**: Clicking on any day in the monthly calendar instantly filters the daily study log list to focus on that specific date.

### 3. XML Feed Parsing & Filtering
*   **Structure Decomposition**: Automatically splits BigQuery release notes into categorized sections:
    *   🟢 **Features**
    *   🟣 **Announcements**
    *   🔵 **Fixes**
    *   🟡 **Deprecations**
*   **Instant Query Search**: Search bar filters day entries dynamically as you type.
*   **Category Navigation**: Badges filter the feed to isolate specific categories across all days.

---

## 📂 Project Structure

```
time_tracker_app/
│
├── app.py                  # Flask Web Server & APIs (Releases XML parsing & DB CRUD)
├── study_tracker.db        # SQLite Local Database (created on start)
├── README.md               # Project Documentation
├── .gitignore              # Files ignored by Git
│
├── templates/
│   └── index.html          # Main HTML structure
│
└── static/
    ├── css/
    │   └── style.css       # Layout styles, glassmorphic themes, and keyframe glows
    └── js/
        └── app.js          # Clock managers, timer triggers, API hooks, and widgets
```

---

## ⚙️ Setup & Installation

### Prerequisites
Make sure you have **Python 3.x** installed.

### Step-by-Step Launch
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Ankita-k002/time_tracker_app.git
    cd time_tracker_app
    ```

2.  **Install Flask**:
    ```bash
    pip install flask
    ```

3.  **Run the Server**:
    ```bash
    python app.py
    ```

4.  **Open in Browser**:
    Go to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to view and use the dashboard.

---

## 📝 Database Schema
Logged study records are stored in the local SQLite table:
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    date TEXT NOT NULL
);
```

---

## 📄 License
This project is licensed under the MIT License. Feel free to customize it to fit your study habits!
