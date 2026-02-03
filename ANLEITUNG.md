# 📖 SD-RP Broadcast - Ausführliche Anleitung

## 🎯 Was ist das Projekt?

Dieses Projekt ist ein modernes Dashboard, das dir ermöglicht:
- Alle SD-RP Twitch Streams auf einer Seite zu sehen
- Mehrere Streams gleichzeitig anzuschauen (Multi-View)
- Den aktuellen FiveM Server-Status zu sehen
- Benachrichtigungen zu erhalten, wenn Streamer live gehen
- Clips und Statistiken der Streamer anzusehen

## 🚀 Erste Schritte

### Option 1: Einfacher Start (Empfohlen)

**Für Windows:**
1. Öffne die Konsole (CMD oder PowerShell) im Projektordner
2. Führe aus:
```bash
npm install
npm run build
npm run server
```

**Für Linux/Mac:**
1. Öffne Terminal im Projektordner
2. Führe aus:
```bash
./start.sh
```

3. Öffne deinen Browser und gehe zu: `http://localhost:3000`

### Option 2: Development Mode (Für Entwickler)

Wenn du am Code arbeiten möchtest:

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run server
```

Dann öffne: `http://localhost:5173`

## ⚙️ Konfiguration

### 1. Twitch API Credentials

Die `.env` Datei enthält bereits deine Twitch API Zugangsdaten:
```
TWITCH_CLIENT_ID=5ecop4xxzpcpola9546po8ocn3gyve
TWITCH_CLIENT_SECRET=cikn44uqsyzsjj2ent09a70o1rp61m
```

**Falls du andere Credentials brauchst:**
1. Gehe zu https://dev.twitch.tv/console
2. Erstelle eine neue Application
3. Kopiere Client ID und Secret
4. Bearbeite die `.env` Datei

### 2. Überwachte Twitch-Kanäle

Die Datei `channel_list.txt` enthält die Twitch-Namen der zu überwachenden Streamer:

```
HalloDerMax
Butterfly_Lea
thisismarlon_
JimKnopf27
rudiik11
```

**Zum Ändern:**
1. Öffne `channel_list.txt`
2. Füge neue Kanäle hinzu (ein Name pro Zeile)
3. Speichern
4. Server neu starten

### 3. Suchfilter / Keywords

Die Datei `filters.json` enthält Keywords für die Stream-Suche:

```json
{
    "keywords": [
        "deutsch",
        "sdrp"
    ]
}
```

Das Dashboard findet automatisch alle GTA V Streams, die diese Keywords im Titel haben.

**Zum Ändern:**
1. Öffne `filters.json`
2. Füge neue Keywords hinzu
3. Speichern
4. Server neu starten

## 🎮 Features im Detail

### Live Streams ansehen

1. **Einzelner Stream:**
   - Klicke auf ein Stream-Thumbnail oder "Ansehen"
   - Stream öffnet sich in einem Modal
   - Klicke "Auf Twitch öffnen" für die volle Twitch-Seite

2. **Multi-View Mode:**
   - Klicke "Multi-View" im Header
   - Wähle bis zu 4 Streams aus
   - Alle Streams werden gleichzeitig angezeigt
   - Perfekt zum Verfolgen mehrerer Perspektiven!

### Benachrichtigungen

1. Klicke auf das **Glocken-Icon** (🔔) bei einem Stream
2. Erlaube Benachrichtigungen im Browser
3. Du erhältst eine Meldung, wenn dieser Streamer live geht
4. Funktioniert auch wenn die Seite geschlossen ist (Browser muss offen sein)

### Clips anschauen

1. Klicke "Clips" bei einem Stream
2. Sieh die besten/neuesten Clips
3. Klicke auf ein Clip um es auf Twitch zu öffnen

### Statistiken

1. Klicke "Stats" im Header
2. Sieh detaillierte Infos:
   - Follower-Anzahl
   - Gesamt-Views
   - Live-Status
   - Aktueller Stream

## 🔧 Technische Details

### Wie funktioniert es?

1. **Backend (server.js):**
   - Express Server auf Port 3000
   - Fragt die Twitch API ab (alle 30 Sekunden)
   - Holt FiveM Server-Status (alle 10 Sekunden)
   - Stellt API Endpoints bereit

2. **Frontend (React + Mantine):**
   - Modern UI mit Mantine Components
   - Automatisches Refresh der Daten
   - Responsive Design (funktioniert auf Handy/Tablet/PC)

### API Endpoints

Der Server stellt folgende Endpoints bereit:

```
GET /api/twitch/streams
→ Gibt alle Live-Streams zurück

GET /api/twitch/streamer-data
→ Gibt detaillierte Streamer-Infos zurück

GET /api/twitch/clips?channel=USERNAME
→ Gibt Clips eines Kanals zurück

GET /api/fivem/status
→ Gibt FiveM Server-Status zurück

GET /health
→ Server Health-Check
```

## 🐛 Häufige Probleme & Lösungen

### Problem: "npm not found"
**Lösung:** Installiere Node.js von https://nodejs.org

### Problem: Streams werden nicht angezeigt
**Lösungen:**
1. Überprüfe ob Backend läuft: http://localhost:3000/health
2. Überprüfe `.env` Datei (Twitch Credentials korrekt?)
3. Öffne Browser Console (F12) für Fehlermeldungen

### Problem: "Port 3000 already in use"
**Lösungen:**
1. Schließe andere Programme die Port 3000 nutzen
2. Oder ändere Port in `.env`:
   ```
   PORT=3001
   ```

### Problem: CORS Errors
**Lösung:** 
- Im Development: Frontend muss auf 5173 laufen, Backend auf 3000
- In Production: Nur Backend auf Port 3000, Frontend ist gebaut

### Problem: Benachrichtigungen funktionieren nicht
**Lösungen:**
1. Browser-Benachrichtigungen müssen erlaubt sein
2. Funktioniert nur auf localhost oder HTTPS
3. Manche Browser blockieren Benachrichtigungen standardmäßig

## 📦 Production Deployment

### Mit PM2 (Empfohlen für Server):

```bash
# PM2 global installieren
npm install -g pm2

# Build erstellen
npm run build

# Mit PM2 starten
pm2 start server.js --name sdrp-broadcast

# Auto-start nach Server-Neustart
pm2 startup
pm2 save

# Status checken
pm2 status

# Logs ansehen
pm2 logs sdrp-broadcast

# Stoppen
pm2 stop sdrp-broadcast

# Neu starten
pm2 restart sdrp-broadcast
```

### Ohne PM2:

```bash
npm run build
npm run server
```

Server läuft dann auf Port 3000 (oder der Port in .env)

## 🔒 Sicherheit

**Wichtig:** Die `.env` Datei enthält deine Twitch API Secrets!

- Teile diese Datei nicht öffentlich
- Pushe sie nicht in öffentliche Git Repositories
- Bei GitHub etc.: Füge `.env` zur `.gitignore` hinzu

## 📱 Responsive Design

Das Dashboard funktioniert auf:
- 💻 Desktop/Laptop
- 📱 Smartphone
- 📲 Tablet

Die Ansicht passt sich automatisch an die Bildschirmgröße an.

## 🎨 Anpassungen

### Farben ändern
Bearbeite in `src/App.jsx`:
- Suche nach `gradient({ from: 'indigo', to: 'cyan' })`
- Ändere Farbwerte nach Wunsch
- Mantine unterstützt: blue, red, green, orange, grape, violet, etc.

### Logo/Titel ändern
In `src/App.jsx` suche nach:
```jsx
<Title order={1}>SD-RP Broadcast</Title>
```

### Discord-Link ändern
Suche nach:
```jsx
href="https://discord.gg/zAZ9TgTe"
```

## 💡 Tipps & Tricks

1. **Auto-Refresh:** Streams aktualisieren sich automatisch alle 30 Sekunden
2. **Keyboard Shortcuts:** 
   - ESC schließt Modals
   - Klicke außerhalb eines Modals zum Schließen
3. **Performance:** Multi-View mit 4 Streams kann bei langsamer Internetverbindung laggen
4. **Benachrichtigungen:** Funktionieren nur wenn Browser im Hintergrund läuft

## 📞 Support

Bei Problemen oder Fragen:
1. Checke die Console (F12 im Browser)
2. Überprüfe die Server-Logs im Terminal
3. Kontaktiere HalloDerMax

## 🎉 Viel Erfolg!

Das war's! Du solltest jetzt ein voll funktionsfähiges SD-RP Broadcast Dashboard haben.

**Happy Streaming! 🎮🔴**
