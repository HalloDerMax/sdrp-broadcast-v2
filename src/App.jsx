Du hast gesagt
Das ist mein Projekt: // Production-Ready Server mit ALLEN Features

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



        if (!response.ok) {

            throw new Error(`Twitch Token API Fehler: ${response.statusText}`);

        }



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

            headers: {

                'Client-ID': CLIENT_ID,

                'Authorization': `Bearer ${accessToken}`

            }

        });



        if (!response.ok) {

            throw new Error(`Twitch Game API Fehler: ${response.statusText}`);

        }



        const data = await response.json();

        if (data.data && data.data.length > 0) {

            gtaVGameId = data.data[0].id;

            console.log(`✅ Game ID für ${TARGET_GAME_NAME}: ${gtaVGameId}`);

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

        const channels = data

            .split('\n')

            .map(line => line.trim().toLowerCase())

            .filter(line => line.length > 0);

        

        return channels;

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

            const keywords = filters.keywords

                .map(keyword => String(keyword).trim().toLowerCase())

                .filter(keyword => keyword.length > 0);

            

            return keywords;

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

        for (let i = 0; i < channels.length; i += 100) {

            channelBatches.push(channels.slice(i, i + 100));

        }



        let allStreams = [];



        for (const batch of channelBatches) {

            const params = batch.map(ch => `user_login=${encodeURIComponent(ch)}`).join('&');

            const url = `https://api.twitch.tv/helix/streams?${params}`;



            const response = await fetch(url, {

                method: 'GET',

                headers: {

                    'Client-ID': CLIENT_ID,

                    'Authorization': `Bearer ${accessToken}`

                }

            });



            if (response.status === 401) {

                accessToken = null;

                return [];

            }

            

            if (!response.ok) {

                throw new Error(`Twitch API Fehler: ${response.statusText}`);

            }



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

        const channelStreams = await getStreamsByChannels(channels);

        filteredStreams = filteredStreams.concat(channelStreams);

    }



    if (keywords.length > 0) {

        if (!gtaVGameId) await getGameId();

        if (gtaVGameId) {

            const MAX_STREAMS = 100;

            const url = `https://api.twitch.tv/helix/streams?game_id=${gtaVGameId}&first=${MAX_STREAMS}`;



            try {

                const response = await fetch(url, {

                    method: 'GET',

                    headers: {

                        'Client-ID': CLIENT_ID,

                        'Authorization': `Bearer ${accessToken}`

                    }

                });



                if (response.ok) {

                    const data = await response.json();

                    let allStreams = data.data || [];

                    

                    const keywordStreams = allStreams.filter(stream => {

                        const streamTitle = stream.title.toLowerCase();

                        const streamerName = stream.user_name.toLowerCase();

                        

                        return keywords.some(keyword => 

                            streamTitle.includes(keyword) || streamerName.includes(keyword)

                        );

                    });

                    

                    filteredStreams = filteredStreams.concat(keywordStreams);

                }

            } catch (error) {

                console.error("❌ Keyword-Search Fehler:", error);

            }

        }

    }



    const uniqueStreams = Array.from(

        new Map(filteredStreams.map(stream => [stream.id, stream])).values()

    );



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

        const userUrl = `https://api.twitch.tv/helix/users?${userLogins}`;

        

        const userResponse = await fetch(userUrl, {

            headers: {

                'Client-ID': CLIENT_ID,

                'Authorization': `Bearer ${accessToken}`

            }

        });

        

        if (!userResponse.ok) return { streamers: [] };

        

        const userData = await userResponse.json();

        const users = userData.data || [];

        

        const streamersWithData = await Promise.all(users.map(async (user) => {

            try {

                const followerUrl = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`;

                const followerResponse = await fetch(followerUrl, {

                    headers: {

                        'Client-ID': CLIENT_ID,

                        'Authorization': `Bearer ${accessToken}`

                    }

                });

                

                let followerCount = 0;

                if (followerResponse.ok) {

                    const followerData = await followerResponse.json();

                    followerCount = followerData.total || 0;

                }

                

                const clipsUrl = `https://api.twitch.tv/helix/clips?broadcaster_id=${user.id}&first=1`;

                const clipsResponse = await fetch(clipsUrl, {

                    headers: {

                        'Client-ID': CLIENT_ID,

                        'Authorization': `Bearer ${accessToken}`

                    }

                });

                

                let topClip = null;

                if (clipsResponse.ok) {

                    const clipsData = await clipsResponse.json();

                    if (clipsData.data && clipsData.data.length > 0) {

                        topClip = clipsData.data[0];

                    }

                }

                

                const streamUrl = `https://api.twitch.tv/helix/streams?user_id=${user.id}`;

                const streamResponse = await fetch(streamUrl, {

                    headers: {

                        'Client-ID': CLIENT_ID,

                        'Authorization': `Bearer ${accessToken}`

                    }

                });

                

                let isLive = false;

                let lastStream = null;

                if (streamResponse.ok) {

                    const streamData = await streamResponse.json();

                    isLive = streamData.data && streamData.data.length > 0;

                    if (isLive) {

                        lastStream = streamData.data[0];

                    }

                }

                

                return {

                    id: user.id,

                    login: user.login,

                    display_name: user.display_name,

                    description: user.description,

                    profile_image_url: user.profile_image_url,

                    view_count: user.view_count,

                    follower_count: followerCount,

                    top_clip: topClip,

                    is_live: isLive,

                    last_stream: lastStream

                };

            } catch (error) {

                console.error(`❌ Fehler beim Laden der Daten für ${user.login}:`, error);

                return {

                    id: user.id,

                    login: user.login,

                    display_name: user.display_name,

                    description: user.description,

                    profile_image_url: user.profile_image_url,

                    view_count: user.view_count,

                    follower_count: 0,

                    is_live: false

                };

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

        const userUrl = `https://api.twitch.tv/helix/users?login=${channelLogin}`;

        const userResponse = await fetch(userUrl, {

            headers: {

                'Client-ID': CLIENT_ID,

                'Authorization': `Bearer ${accessToken}`

            }

        });

        

        if (!userResponse.ok) return { clips: [] };

        

        const userData = await userResponse.json();

        if (!userData.data || userData.data.length === 0) return { clips: [] };

        

        const userId = userData.data[0].id;

        

        const clipsUrl = `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=10`;

        const clipsResponse = await fetch(clipsUrl, {

            headers: {

                'Client-ID': CLIENT_ID,

                'Authorization': `Bearer ${accessToken}`

            }

        });

        

        if (!clipsResponse.ok) return { clips: [] };

        

        const clipsData = await clipsResponse.json();

        return { clips: clipsData.data || [] };

        

    } catch (error) {

        console.error("❌ Fehler beim Abrufen der Clips:", error);

        return { clips: [] };

    }

}



// ====================================================================

// API ENDPOINTS

// ====================================================================



app.get('/api/twitch/streams', async (req, res) => {

    try {

        const data = await getTwitchStreams();

        

        if (data.error) {

            return res.status(503).json({ 

                error: "Fehler beim Abrufen der Streams", 

                details: data.error 

            });

        }

        

        res.json(data);

    } catch (error) {

        console.error("❌ Unerwarteter Fehler:", error);

        res.status(500).json({ 

            error: "Interner Server-Fehler",

            message: error.message 

        });

    }

});



app.get('/api/twitch/streamer-data', async (req, res) => {

    try {

        const data = await getStreamerData();

        res.json(data);

    } catch (error) {

        console.error("❌ Fehler beim Abrufen der Streamer-Daten:", error);

        res.status(500).json({ 

            error: "Fehler beim Abrufen der Streamer-Daten",

            message: error.message 

        });

    }

});



app.get('/api/twitch/clips', async (req, res) => {

    try {

        const channel = req.query.channel;

        if (!channel) {

            return res.status(400).json({ error: 'Channel parameter required' });

        }

        

        const data = await getClipsForChannel(channel);

        res.json(data);

    } catch (error) {

        console.error("❌ Fehler beim Abrufen der Clips:", error);

        res.status(500).json({ 

            error: "Fehler beim Abrufen der Clips",

            message: error.message 

        });

    }

});



// ====================================================================

// DEATH BROADCAST API

// ====================================================================



// In-Memory Death Messages Storage

let deathMessages = [];

const MAX_DEATH_MESSAGES = 100;



// POST: Neue Todesnachricht empfangen

app.post('/api/deathbroadcast', (req, res) => {

    const { message, player, killer, weapon, location, timestamp } = req.body;

    

    if (!message) {

        return res.status(400).json({ 

            success: false, 

            error: 'Nachricht fehlt' 

        });

    }



    const deathEvent = {

        id: Date.now(),

        message,

        player: player || 'Unbekannt',

        killer: killer || 'Unbekannt',

        weapon: weapon || 'Unbekannt',

        location: location || null,

        timestamp: timestamp || new Date().toISOString(),

        receivedAt: new Date().toISOString()

    };



    deathMessages.unshift(deathEvent);

    

    if (deathMessages.length > MAX_DEATH_MESSAGES) {

        deathMessages = deathMessages.slice(0, MAX_DEATH_MESSAGES);

    }



    console.log(`💀 Death: ${deathEvent.player} von ${deathEvent.killer} mit ${deathEvent.weapon}`);



    res.status(200).json({ 

        success: true,

        id: deathEvent.id,

        message: 'Todesnachricht erfolgreich empfangen'

    });

});



// GET: Alle Todesnachrichten abrufen

app.get('/api/deathbroadcast', (req, res) => {

    const { limit = 20, offset = 0 } = req.query;

    

    const paginatedMessages = deathMessages.slice(

        parseInt(offset), 

        parseInt(offset) + parseInt(limit)

    );



    res.json({

        total: deathMessages.length,

        limit: parseInt(limit),

        offset: parseInt(offset),

        messages: paginatedMessages

    });

});



// GET: Einzelne Todesnachricht abrufen

app.get('/api/deathbroadcast/:id', (req, res) => {

    const { id } = req.params;

    const message = deathMessages.find(m => m.id === parseInt(id));

    

    if (!message) {

        return res.status(404).json({ 

            success: false, 

            error: 'Nachricht nicht gefunden' 

        });

    }



    res.json(message);

});



// DELETE: Alle Todesnachrichten löschen

app.delete('/api/deathbroadcast', (req, res) => {

    const count = deathMessages.length;

    deathMessages = [];

    

    console.log(`🗑️  ${count} Todesnachrichten gelöscht`);

    

    res.json({ 

        success: true, 

        deletedCount: count,

        message: 'Alle Todesnachrichten gelöscht'

    });

});



// GET: Death Broadcast Statistiken

app.get('/api/deathbroadcast/stats', (req, res) => {

    const killers = {};

    const weapons = {};

    

    deathMessages.forEach(msg => {

        if (msg.killer && msg.killer !== 'Unbekannt') {

            killers[msg.killer] = (killers[msg.killer] || 0) + 1;

        }

        if (msg.weapon && msg.weapon !== 'Unbekannt') {

            weapons[msg.weapon] = (weapons[msg.weapon] || 0) + 1;

        }

    });

    

    const topKillers = Object.entries(killers)

        .sort(([, a], [, b]) => b - a)

        .slice(0, 10)

        .map(([name, kills]) => ({ name, kills }));

        

    const topWeapons = Object.entries(weapons)

        .sort(([, a], [, b]) => b - a)

        .slice(0, 10)

        .map(([name, uses]) => ({ name, uses }));



    res.json({

        totalMessages: deathMessages.length,

        lastMessage: deathMessages[0] || null,

        oldestMessage: deathMessages[deathMessages.length - 1] || null,

        topKillers,

        topWeapons

    });

});



// ====================================================================

// MINECRAFT PLAYERS API

// ====================================================================



// In-Memory Player Storage - LEER! Wird nur durch POST /update gefüllt

let minecraftPlayers = [];



// GET: Alle Minecraft Spieler abrufen

app.get('/api/minecraft/players', async (req, res) => {

    try {

        console.log('🎮 Fetching Minecraft players...');

        const players = minecraftPlayers;

        console.log(`✅ Loaded ${players.length} Minecraft players`);

        

        res.setHeader('Cache-Control', 'public, max-age=5');

        res.json({ 

            players: players,

            timestamp: new Date().toISOString(),

            count: players.length

        });

    } catch (error) {

        console.error("❌ Fehler beim Abrufen der Minecraft Players:", error.message);

        res.status(500).json({

            error: "Fehler beim Abrufen der Spieler-Daten",

            message: error.message,

            players: []

        });

    }

});



// POST: Minecraft Spieler updaten

app.post('/api/minecraft/players/update', (req, res) => {

    try {

        const { username, lives, kills, deaths, playTime, status, lastDeath } = req.body;

        

        if (!username) {

            return res.status(400).json({ error: 'Username required' });

        }

        

        let playerIndex = minecraftPlayers.findIndex(p => p.username === username);

        

        if (playerIndex >= 0) {

            minecraftPlayers[playerIndex] = {

                ...minecraftPlayers[playerIndex],

                lives: lives !== undefined ? lives : minecraftPlayers[playerIndex].lives,

                kills: kills !== undefined ? kills : minecraftPlayers[playerIndex].kills,

                deaths: deaths !== undefined ? deaths : minecraftPlayers[playerIndex].deaths,

                playTime: playTime || minecraftPlayers[playerIndex].playTime,

                status: status || minecraftPlayers[playerIndex].status,

                lastDeath: lastDeath !== undefined ? lastDeath : minecraftPlayers[playerIndex].lastDeath

            };

            console.log(`✅ Updated player: ${username}`);

            res.json({ success: true, player: minecraftPlayers[playerIndex] });

        } else {

            const newPlayer = {

                id: minecraftPlayers.length + 1,

                username,

                lives: lives || 3,

                kills: kills || 0,

                deaths: deaths || 0,

                playTime: playTime || '0h',

                status: status || 'offline',

                lastDeath: lastDeath || null

            };

            minecraftPlayers.push(newPlayer);

            console.log(`✅ Created new player: ${username}`);

            res.json({ success: true, player: newPlayer });

        }

    } catch (error) {

        console.error("❌ Fehler beim Update:", error);

        res.status(500).json({ error: error.message });

    }

});



// GET: Statistiken

app.get('/api/minecraft/stats', (req, res) => {

    try {

        const stats = {

            total: minecraftPlayers.length,

            alive: minecraftPlayers.filter(p => p.lives > 0).length,

            eliminated: minecraftPlayers.filter(p => p.lives === 0).length,

            threeHearts: minecraftPlayers.filter(p => p.lives === 3).length,

            twoHearts: minecraftPlayers.filter(p => p.lives === 2).length,

            oneHeart: minecraftPlayers.filter(p => p.lives === 1).length,

        };

        res.json(stats);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

});



app.get('/api/fivem/status', async (req, res) => {

    try {

        const serverCode = 'g984bz';

        const apiUrl = `https://servers-frontend.fivem.net/api/servers/single/${serverCode}`;

        

        console.log('🎮 Fetching FiveM server status...');

        

        const response = await fetch(apiUrl, {

            headers: {

                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

            }

        });

        

        if (!response.ok) {

            throw new Error(`FiveM API error: ${response.status}`);

        }

        

        const data = await response.json();

        let serverData = data.Data || data.data || data;

        

        let playerCount = serverData.clients || serverData.players || serverData.playersCount || 0;

        let maxPlayers = serverData.sv_maxclients || serverData.maxPlayers || serverData.svMaxclients || 128;

        const serverName = serverData.hostname || serverData.name || 'SD-RP Server';

        const online = playerCount !== undefined && maxPlayers !== undefined;

        

        const result = {

            online: online,

            players: parseInt(playerCount) || 0,

            maxPlayers: parseInt(maxPlayers) || 128,

            serverName: serverName,

            uptime: serverData.uptime || null,

            connectEndpoint: serverData.connectEndPoint || serverData.connectEndpoint || null

        };

        

        console.log(`✅ FiveM Status: ${result.players}/${result.maxPlayers} Spieler`);

        

        res.setHeader('Cache-Control', 'public, max-age=10');

        res.json(result);

        

    } catch (error) {

        console.error("❌ Fehler beim Abrufen des FiveM Status:", error.message);

        

        res.status(200).json({

            online: false,

            players: 0,

            maxPlayers: 128,

            serverName: 'SD-RP Server',

            error: error.message

        });

    }

});



// ====================================================================

// SERVE FRONTEND (React App) - SPA Fallback

// ====================================================================



// Serve React app for all non-API routes (SPA fallback)

app.use((req, res, next) => {

    // Skip API routes - let them pass through to 404 handler

    if (req.path.startsWith('/api/') || req.path === '/health') {

        return next();

    }

    

    // Check if dist/index.html exists

    const indexPath = path.join(__dirname, 'dist', 'index.html');

    

    // Try to serve index.html

    res.sendFile(indexPath, (err) => {

        if (err) {

            console.error('❌ Error serving index.html:', err.message);

            console.error('   Path:', indexPath);

            console.error('   __dirname:', __dirname);

            

            // Fallback: Send simple HTML page

            res.status(200).send(`

                <!DOCTYPE html>

                <html>

                <head>

                    <title>SD-RP Broadcast</title>

                    <style>

                        body { 

                            font-family: Arial, sans-serif; 

                            display: flex; 

                            justify-content: center; 

                            align-items: center; 

                            height: 100vh; 

                            margin: 0;

                            background: #1a1a1a;

                            color: white;

                        }

                        .container {

                            text-align: center;

                            padding: 40px;

                        }

                        h1 { color: #48bb78; }

                        .status { 

                            background: #2d2d2d; 

                            padding: 20px; 

                            border-radius: 8px; 

                            margin-top: 20px;

                        }

                        a { color: #48bb78; text-decoration: none; }

                        a:hover { text-decoration: underline; }

                    </style>

                </head>

                <body>

                    <div class="container">

                        <h1>🎮 SD-RP Broadcast API</h1>

                        <p>Frontend build not available yet.</p>

                        <div class="status">

                            <h3>✅ API Endpoints Available:</h3>

                            <p><a href="/api/minecraft/players">📊 Minecraft Players</a></p>

                            <p><a href="/api/twitch/streams">🎥 Twitch Streams</a></p>

                            <p><a href="/api/deathbroadcast">💀 Death Broadcast</a></p>

                            <p><a href="/api/fivem/status">🎮 FiveM Status</a></p>

                            <p><a href="/health">❤️ Health Check</a></p>

                        </div>

                        <p style="margin-top: 20px; color: #888;">

                            Run <code>npm run build</code> to generate frontend.

                        </p>

                    </div>

                </body>

                </html>

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

    res.status(500).json({ 

        error: 'Interner Server-Fehler',

        message: process.env.NODE_ENV === 'development' ? err.message : 'Ein Fehler ist aufgetreten'

    });

});



app.listen(PORT, async () => {

    console.log(`🚀 Server läuft auf Port ${PORT}`);

    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

    await getAccessToken();

    await getGameId();

    console.log('✅ Server bereit mit ALLEN Features!');

    console.log('📡 Endpoints:');

    console.log('   - /api/twitch/streams');

    console.log('   - /api/twitch/streamer-data');

    console.log('   - /api/twitch/clips?channel=USERNAME');

    console.log('   - /api/fivem/status');

    console.log('💀 Death Broadcast:');

    console.log('   - POST /api/deathbroadcast');

    console.log('   - GET  /api/deathbroadcast');

    console.log('   - GET  /api/deathbroadcast/stats');

    console.log('🎮 Minecraft Players:');

    console.log('   - GET  /api/minecraft/players');

    console.log('   - POST /api/minecraft/players/update');

    console.log('   - GET  /api/minecraft/stats');

});
