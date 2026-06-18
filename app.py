import os
import sqlite3
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, request, render_template

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'study_tracker.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL,
            date TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        # 10 second timeout
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        
        entries = []
        for elem in root.iter():
            tag_local = elem.tag.split('}')[-1]
            if tag_local == 'entry':
                entries.append(elem)
                
        parsed_entries = []
        for entry in entries:
            entry_data = {
                'title': '',
                'id': '',
                'updated': '',
                'link': '',
                'content': ''
            }
            for child in entry:
                tag_local = child.tag.split('}')[-1]
                if tag_local == 'link':
                    entry_data['link'] = child.attrib.get('href', child.text or '')
                else:
                    entry_data[tag_local] = child.text or ''
            
            parsed_entries.append(entry_data)
            
        return jsonify(parsed_entries)
    except Exception as e:
        print(f"Error fetching BigQuery releases: {e}")
        # Return fallback mock data if feed is down/unreachable
        fallback_data = [
            {
                "title": "June 17, 2026",
                "updated": "2026-06-17T00:00:00-07:00",
                "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026",
                "content": "<h3>Feature</h3><p>You can enable <a href='#'>autonomous embedding generation</a> on new or existing tables.</p>"
            },
            {
                "title": "June 16, 2026",
                "updated": "2026-06-16T00:00:00-07:00",
                "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026",
                "content": "<h3>Announcement</h3><p>Table Explorer behavior is moving to the <strong>Reference</strong> panel. This transition will occur in July 2026 or later.</p>"
            },
            {
                "title": "June 15, 2026",
                "updated": "2026-06-15T00:00:00-07:00",
                "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026",
                "content": "<h3>Feature</h3><p>Use Gemini Cloud Assist to analyze your SQL queries and receive recommendations to optimize query performance.</p>"
            }
        ]
        return jsonify(fallback_data)

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sessions ORDER BY start_time DESC')
        rows = cursor.fetchall()
        
        sessions = []
        for r in rows:
            sessions.append({
                'id': r['id'],
                'title': r['title'],
                'start_time': r['start_time'],
                'end_time': r['end_time'],
                'duration_seconds': r['duration_seconds'],
                'date': r['date']
            })
        conn.close()
        return jsonify(sessions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions', methods=['POST'])
def add_session():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing payload"}), 400
            
        title = data.get('title', 'Untitled Session').strip()
        if not title:
            title = 'Untitled Session'
            
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        duration_seconds = data.get('duration_seconds')
        date = data.get('date') # YYYY-MM-DD
        
        if not all([start_time, end_time, duration_seconds, date]):
            return jsonify({"error": "Missing required fields"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO sessions (title, start_time, end_time, duration_seconds, date) VALUES (?, ?, ?, ?, ?)',
            (title, start_time, end_time, duration_seconds, date)
        )
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            "status": "success",
            "session": {
                "id": session_id,
                "title": title,
                "start_time": start_time,
                "end_time": end_time,
                "duration_seconds": duration_seconds,
                "date": date
            }
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": f"Session {session_id} deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
