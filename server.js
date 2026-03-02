// Production-Ready Server mit ALLEN Features
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const FILTERS_FILE_PATH = 'filters.json'; 
const CHANNEL_LIST_PATH = 'channel_list.txt';
const TARGET_GAME_NAME = 'Grand Theft Auto V';

// ====================================================================
// NEU: MINECRAFT DATA STORAGE
// Render hat kein persistentes Filesystem, daher In-Memory + JSON-Datei
// ====================================================================
const MINECRAFT_DATA_PATH = path.join(__dirname, 'minecraft_players.json');
let minecraftData = { players: [] };

// Beim Start: Versuche gespeicherte Daten zu laden
async function loadMinecraftData() {
    try {
        if (fs.existsSync(MINECRAFT_DATA_PATH)) {
            const raw = await fs.promises.readFile(MINECRAFT_DATA_PATH, 'utf8');
            minecraftData = JSON.parse(raw);
            console.log(`✅ Minecraft-Daten geladen: ${minecraftData.players.length} Spieler`);
        }
    } catch (error) {
        console.error("⚠️ Konnte Minecraft-Daten nicht laden, starte leer:", error.message);
        minecraftData = { players: [] };
    }
}

async function saveMinecraftData() {
    try {
        await fs.promises.writeFile(MINECRAFT_DATA_PATH, JSON.stringify(minecraftData, null, 2));
    } catch (error) {
        console.error("⚠️ Konnte Minecraft-Daten nicht speichern:", error.message);
    }
}

let gtaVGameId = null;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("FEHLER: TWITCH_CLIENT_ID oder TWITCH_CLIENT_SECRET fehlen.");
    process.exit(1); 
}

let accessToken = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        hasToken: !!accessToken
    });
});

// ====================================================================
// TWITCH API HELPER FUNCTIONS
// ====================================================================

async function getAccessToken() {
    try {
        console.log("Rufe neues Twitch Access Token ab...");
        const response = await fetch(
            `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
            { method: 'POST' }
        );
        if (!response.ok) throw new Error(`Twitch Token API Fehler: ${response.statusText}`);
        const data = await response.json();
        accessToken = data.access_token;
        console.log("✅ Access Token erfolgreich abgerufen.");
        return accessToken;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen des Access Tokens:", error.message);
        accessToken = null;
        return null;
    }
}

async function getGameId() {
    if (gtaVGameId) return gtaVGameId;
    if (!accessToken) {
        await getAccessToken();
        if (!accessToken) return null;
    }
    try {
        const url = `https://api.twitch.tv/helix/games?name=${encodeURIComponent(TARGET_GAME_NAME)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Twitch Game API Fehler: ${response.statusText}`);
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            gtaVGameId = data.data[0].id;
            return gtaVGameId;
        }
        return null;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Game ID:", error.message);
        return null;
    }
}

async function getChannelsFromFile() {
    try {
        const data = await fs.promises.readFile(CHANNEL_LIST_PATH, 'utf8');
        return data.split('\n').map(line => line.trim().toLowerCase()).filter(line => line.length > 0);
    } catch (error) {
        console.error("❌ Fehler beim Lesen der Kanalliste:", error);
        return [];
    }
}

async function getKeywordsFromFilters() {
    try {
        const data = await fs.promises.readFile(FILTERS_FILE_PATH, 'utf8');
        const filters = JSON.parse(data);
        if (filters && Array.isArray(filters.keywords)) {
            return filters.keywords.map(k => String(k).trim().toLowerCase()).filter(k => k.length > 0);
        }
        return [];
    } catch (error) {
        console.error("❌ Fehler beim Lesen der Filter:", error);
        return [];
    }
}

// ====================================================================
// STREAM API
// ====================================================================

async function getStreamsByChannels(channels) {
    if (!accessToken) await getAccessToken();
    if (!accessToken) return [];
    if (channels.length === 0) return [];
    try {
        const channelBatches = [];
        for (let i = 0; i < channels.length; i += 100) channelBatches.push(channels.slice(i, i + 100));
        let allStreams = [];
        for (const batch of channelBatches) {
            const params = batch.map(ch => `user_login=${encodeURIComponent(ch)}`).join('&');
            const response = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
                method: 'GET',
                headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.status === 401) { accessToken = null; return []; }
            if (!response.ok) throw new Error(`Twitch API Fehler: ${response.statusText}`);
            const data = await response.json();
            allStreams = allStreams.concat(data.data || []);
        }
        return allStreams;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Streams:", error.message);
        return [];
    }
}

async function getTwitchStreams() {
    if (!accessToken) await getAccessToken();
    if (!accessToken) return { streams: [], error: "NO_ACCESS_TOKEN" };
    const keywords = await getKeywordsFromFilters();
    const channels = await getChannelsFromFile();
    let filteredStreams = [];
    if (channels.length > 0) {
        filteredStreams = filteredStreams.concat(await getStreamsByChannels(channels));
    }
    if (keywords.length > 0) {
        if (!gtaVGameId) await getGameId();
        if (gtaVGameId) {
            try {
                const response = await fetch(`https://api.twitch.tv/helix/streams?game_id=${gtaVGameId}&first=100`, {
                    method: 'GET',
                    headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const keywordStreams = (data.data || []).filter(stream =>
                        keywords.some(kw => stream.title.toLowerCase().includes(kw) || stream.user_name.toLowerCase().includes(kw))
                    );
                    filteredStreams = filteredStreams.concat(keywordStreams);
                }
            } catch (error) {
                console.error("❌ Keyword-Search Fehler:", error);
            }
        }
    }
    const uniqueStreams = Array.from(new Map(filteredStreams.map(s => [s.id, s])).values());
    uniqueStreams.sort((a, b) => b.viewer_count - a.viewer_count);
    return { streams: uniqueStreams };
}

async function getStreamerData() {
    if (!accessToken) await getAccessToken();
    if (!accessToken) return { streamers: [] };
    const channels = await getChannelsFromFile();
    if (channels.length === 0) return { streamers: [] };
    try {
        const userLogins = channels.map(ch => `login=${encodeURIComponent(ch)}`).join('&');
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?${userLogins}`, {
            headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        });
        if (!userResponse.ok) return { streamers: [] };
        const userData = await userResponse.json();
        const users = userData.data || [];
        const streamersWithData = await Promise.all(users.map(async (user) => {
            try {
                const [followerRes, clipsRes, streamRes] = await Promise.all([
                    fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`, { headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } }),
                    fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${user.id}&first=1`, { headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } }),
                    fetch(`https://api.twitch.tv/helix/streams?user_id=${user.id}`, { headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } })
                ]);
                const followerCount = followerRes.ok ? ((await followerRes.json()).total || 0) : 0;
                const clipsData = clipsRes.ok ? await clipsRes.json() : { data: [] };
                const topClip = clipsData.data?.[0] || null;
                const streamData = streamRes.ok ? await streamRes.json() : { data: [] };
                const isLive = streamData.data?.length > 0;
                return {
                    id: user.id, login: user.login, display_name: user.display_name,
                    description: user.description, profile_image_url: user.profile_image_url,
                    view_count: user.view_count, follower_count: followerCount,
                    top_clip: topClip, is_live: isLive,
                    last_stream: isLive ? streamData.data[0] : null
                };
            } catch (error) {
                return { id: user.id, login: user.login, display_name: user.display_name, description: user.description, profile_image_url: user.profile_image_url, view_count: user.view_count, follower_count: 0, is_live: false };
            }
        }));
        return { streamers: streamersWithData };
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Streamer-Daten:", error);
        return { streamers: [] };
    }
}

async function getClipsForChannel(channelLogin) {
    if (!accessToken) await getAccessToken();
    if (!accessToken) return { clips: [] };
    try {
        const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${channelLogin}`, { headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } });
        if (!userResponse.ok) return { clips: [] };
        const userData = await userResponse.json();
        if (!userData.data?.length) return { clips: [] };
        const userId = userData.data[0].id;
        const clipsResponse = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=10`, { headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } });
        if (!clipsResponse.ok) return { clips: [] };
        const clipsData = await clipsResponse.json();
        return { clips: clipsData.data || [] };
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Clips:", error);
        return { clips: [] };
    }
}

// ====================================================================
// API ENDPOINTS - TWITCH
// ====================================================================

app.get('/api/twitch/streams', async (req, res) => {
    try {
        const data = await getTwitchStreams();
        if (data.error) return res.status(503).json({ error: "Fehler beim Abrufen der Streams", details: data.error });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Interner Server-Fehler", message: error.message });
    }
});

app.get('/api/twitch/streamer-data', async (req, res) => {
    try {
        const data = await getStreamerData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen der Streamer-Daten", message: error.message });
    }
});

app.get('/api/twitch/clips', async (req, res) => {
    try {
        const channel = req.query.channel;
        if (!channel) return res.status(400).json({ error: 'Channel parameter required' });
        const data = await getClipsForChannel(channel);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Fehler beim Abrufen der Clips", message: error.message });
    }
});

// ====================================================================
// API ENDPOINTS - FIVEM
// ====================================================================

app.get('/api/fivem/status', async (req, res) => {
    try {
        const serverCode = 'g984bz';
        const response = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${serverCode}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!response.ok) throw new Error(`FiveM API error: ${response.status}`);
        const data = await response.json();
        const serverData = data.Data || data.data || data;
        const result = {
            online: true,
            players: parseInt(serverData.clients || serverData.players || 0),
            maxPlayers: parseInt(serverData.sv_maxclients || serverData.maxPlayers || 128),
            serverName: serverData.hostname || serverData.name || 'SD-RP Server',
            uptime: serverData.uptime || null,
            connectEndpoint: serverData.connectEndPoint || serverData.connectEndpoint || null
        };
        res.setHeader('Cache-Control', 'public, max-age=10');
        res.json(result);
    } catch (error) {
        console.error("❌ Fehler beim Abrufen des FiveM Status:", error.message);
        res.status(200).json({ online: false, players: 0, maxPlayers: 128, serverName: 'SD-RP Server', error: error.message });
    }
});

// ====================================================================
// DEATH BROADCAST API
// ====================================================================

let deathMessages = [];
const MAX_DEATH_MESSAGES = 100;

app.post('/api/deathbroadcast', (req, res) => {
    const { message, player, killer, weapon, location, timestamp } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Nachricht fehlt' });
    const deathEvent = {
        id: Date.now(), message,
        player: player || 'Unbekannt', killer: killer || 'Unbekannt',
        weapon: weapon || 'Unbekannt', location: location || null,
        timestamp: timestamp || new Date().toISOString(),
        receivedAt: new Date().toISOString()
    };
    deathMessages.unshift(deathEvent);
    if (deathMessages.length > MAX_DEATH_MESSAGES) deathMessages = deathMessages.slice(0, MAX_DEATH_MESSAGES);
    console.log(`💀 Death: ${deathEvent.player} von ${deathEvent.killer} mit ${deathEvent.weapon}`);
    res.status(200).json({ success: true, id: deathEvent.id, message: 'Todesnachricht erfolgreich empfangen' });
});

app.get('/api/deathbroadcast', (req, res) => {
    const { limit = 20, offset = 0 } = req.query;
    res.json({
        total: deathMessages.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        messages: deathMessages.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
    });
});

app.get('/api/deathbroadcast/:id', (req, res) => {
    const message = deathMessages.find(m => m.id === parseInt(req.params.id));
    if (!message) return res.status(404).json({ success: false, error: 'Nachricht nicht gefunden' });
    res.json(message);
});

app.delete('/api/deathbroadcast', (req, res) => {
    const count = deathMessages.length;
    deathMessages = [];
    res.json({ success: true, deletedCount: count, message: 'Alle Todesnachrichten gelöscht' });
});

app.get('/api/deathbroadcast/stats', (req, res) => {
    const killers = {};
    const weapons = {};
    deathMessages.forEach(msg => {
        if (msg.killer && msg.killer !== 'Unbekannt') killers[msg.killer] = (killers[msg.killer] || 0) + 1;
        if (msg.weapon && msg.weapon !== 'Unbekannt') weapons[msg.weapon] = (weapons[msg.weapon] || 0) + 1;
    });
    res.json({
        totalMessages: deathMessages.length,
        lastMessage: deathMessages[0] || null,
        oldestMessage: deathMessages[deathMessages.length - 1] || null,
        topKillers: Object.entries(killers).sort(([,a],[,b])=>b-a).slice(0,10).map(([name,kills])=>({name,kills})),
        topWeapons: Object.entries(weapons).sort(([,a],[,b])=>b-a).slice(0,10).map(([name,uses])=>({name,uses}))
    });
});

// ====================================================================
// NEU: MINECRAFT PLAYERS API
// ====================================================================

// GET: Alle Spieler abrufen
app.get('/api/minecraft/players', (req, res) => {
    res.json({
        players: minecraftData.players,
        timestamp: new Date().toISOString(),
        count: minecraftData.players.length
    });
});

// POST: Spieler anlegen oder updaten
// Wird von deinem Minecraft-Plugin/Script aufgerufen
// Body: { username, uuid, deaths, playerKills, aliveSince, awakeSince, mined: {}, killed: {} }
app.post('/api/minecraft/players/update', async (req, res) => {
    try {
        const update = req.body;
        if (!update.username) return res.status(400).json({ error: 'Username required' });

        const idx = minecraftData.players.findIndex(p => p.username === update.username);
        const existing = idx >= 0 ? minecraftData.players[idx] : {};

        const playerData = {
            uuid:        update.uuid        ?? existing.uuid        ?? 'unknown',
            username:    update.username,
            deaths:      update.deaths      ?? existing.deaths      ?? 0,
            playerKills: update.playerKills ?? existing.playerKills ?? 0,
            aliveSince:  update.aliveSince  || existing.aliveSince  || '0h',
            awakeSince:  update.awakeSince  || existing.awakeSince  || '0h',
            mined:       update.mined       || existing.mined       || {},
            killed:      update.killed      || existing.killed      || {},
            lastSeen:    new Date().toISOString()
        };

        if (idx >= 0) {
            minecraftData.players[idx] = playerData;
        } else {
            minecraftData.players.push(playerData);
        }

        await saveMinecraftData();
        console.log(`✅ Minecraft Spieler gespeichert: ${update.username}`);
        res.json({ success: true, player: playerData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Spieler entfernen
app.delete('/api/minecraft/players/:username', async (req, res) => {
    const { username } = req.params;
    const before = minecraftData.players.length;
    minecraftData.players = minecraftData.players.filter(p => p.username !== username);
    await saveMinecraftData();
    res.json({ success: true, deleted: before - minecraftData.players.length });
});

// DELETE: Alle Spieler löschen
app.delete('/api/minecraft/players', async (req, res) => {
    const count = minecraftData.players.length;
    minecraftData.players = [];
    await saveMinecraftData();
    res.json({ success: true, deletedCount: count });
});

// ====================================================================
// SERVE FRONTEND (React App) - SPA Fallback
// ====================================================================

app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send(`
                <!DOCTYPE html><html><head><title>SD-RP Broadcast</title>
                <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a1a;color:white;}
                .container{text-align:center;padding:40px;}h1{color:#48bb78;}.status{background:#2d2d2d;padding:20px;border-radius:8px;margin-top:20px;}
                a{color:#48bb78;text-decoration:none;}a:hover{text-decoration:underline;}</style></head>
                <body><div class="container"><h1>🎮 SD-RP Broadcast API</h1><p>Frontend build not available yet.</p>
                <div class="status"><h3>✅ API Endpoints Available:</h3>
                <p><a href="/api/minecraft/players">📊 Minecraft Players</a></p>
                <p><a href="/api/twitch/streams">🎥 Twitch Streams</a></p>
                <p><a href="/api/deathbroadcast">💀 Death Broadcast</a></p>
                <p><a href="/api/fivem/status">🎮 FiveM Status</a></p>
                <p><a href="/health">❤️ Health Check</a></p></div>
                <p style="margin-top:20px;color:#888;">Run <code>npm run build</code> to generate frontend.</p>
                </div></body></html>
            `);
        }
    });
});

// ====================================================================
// ERROR HANDLERS
// ====================================================================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ error: 'Interner Server-Fehler', message: process.env.NODE_ENV === 'development' ? err.message : 'Ein Fehler ist aufgetreten' });
});

app.listen(PORT, async () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    await loadMinecraftData();
    await getAccessToken();
    await getGameId();
    console.log('✅ Server bereit!');
    console.log('📡 Endpoints:');
    console.log('   GET  /api/minecraft/players');
    console.log('   POST /api/minecraft/players/update');
    console.log('   GET  /api/twitch/streams');
    console.log('   GET  /api/twitch/streamer-data');
    console.log('   POST /api/deathbroadcast');
    console.log('   GET  /api/deathbroadcast');
});
