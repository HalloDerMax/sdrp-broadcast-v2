# 🎮 SD-RP Broadcast Dashboard

Ein modernes React + Mantine Dashboard für SD-RP (Second Dimension Roleplay) Twitch Streams und FiveM Server-Status.

## ✨ Features

- 🔴 **Live Stream Übersicht** - Alle SD-RP Twitch Streams auf einen Blick
- 📊 **Echtzeit-Statistiken** - Live-Viewer, Stream-Count und Server-Status
- 🎬 **Multi-View Mode** - Bis zu 4 Streams gleichzeitig ansehen
- 🎥 **Clips Viewer** - Beste Clips von jedem Streamer
- 🔔 **Benachrichtigungen** - Werde informiert, wenn dein Lieblingsstreamer live geht
- 🎮 **FiveM Server Status** - Aktuelle Spielerzahl auf dem SD-RP Server
- 🎨 **Modernes UI** - Gebaut mit Mantine UI Framework
- ⚡ **Schnell & Responsive** - Vite + React für beste Performance

## 🚀 Installation & Start

### Voraussetzungen
- Node.js 18+ installiert
- Twitch API Credentials (Client ID & Secret)

### Schnellstart

1. **Dependencies installieren:**
```bash
npm install
```

2. **Development Mode starten:**
```bash
# Terminal 1 - Frontend (Vite Dev Server)
npm run dev

# Terminal 2 - Backend (Express Server)
npm run server
```

Frontend läuft auf: http://localhost:5173  
Backend läuft auf: http://localhost:3000

3. **Production Build:**
```bash
npm run build
npm run server
```

## 📁 Projektstruktur

```
sdrp-broadcast-react/
├── src/
│   ├── App.jsx          # Haupt-React-Komponente
│   └── main.jsx         # React Entry Point
├── server.js            # Express Backend Server
├── .env                 # Umgebungsvariablen (Twitch API)
├── channel_list.txt     # Liste der zu überwachenden Kanäle
├── filters.json         # Keywords für Stream-Suche
├── package.json         # Projekt-Dependencies
└── vite.config.js       # Vite Konfiguration
```

## 🎯 Verwendung

### Streams ansehen
- Klicke auf einen Stream-Card, um den Stream im Modal zu öffnen
- Nutze den "Ansehen" Button für eine größere Ansicht
- "Auf Twitch öffnen" leitet dich direkt zur Twitch-Seite

### Multi-View aktivieren
1. Klicke auf "Multi-View" im Header
2. Wähle bis zu 4 Streams aus
3. Alle Streams werden gleichzeitig angezeigt

### Benachrichtigungen
1. Klicke auf das Glockensymbol bei einem Stream
2. Erlaube Browser-Benachrichtigungen
3. Erhalte Benachrichtigungen wenn der Streamer live geht

## ⚙️ Konfiguration

### Twitch API Credentials
Bearbeite `.env`:
```
TWITCH_CLIENT_ID=deine_client_id
TWITCH_CLIENT_SECRET=dein_client_secret
PORT=3000
```

### Überwachte Kanäle
Bearbeite `channel_list.txt`:
```
HalloDerMax
Butterfly_Lea
thisismarlon_
```

### Suchfilter
Bearbeite `filters.json`:
```json
{
    "keywords": [
        "deutsch",
        "sdrp"
    ]
}
```

## 🔧 API Endpoints

- `GET /api/twitch/streams` - Live Streams
- `GET /api/twitch/streamer-data` - Streamer-Daten
- `GET /api/twitch/clips?channel=USER` - Clips
- `GET /api/fivem/status` - Server Status

## 🛠️ Tech Stack

- React 18 + Vite
- Mantine UI 7.x
- Express.js
- Axios
- Tabler Icons

## 📦 Production Deployment

```bash
npm run build
npm run server
```

Mit PM2:
```bash
npm install -g pm2
pm2 start server.js --name sdrp-broadcast
pm2 save
```

## 👨‍💻 Entwickelt von

HalloDerMax

---

**Viel Spaß mit dem SD-RP Broadcast Dashboard! 🎮🔴**
