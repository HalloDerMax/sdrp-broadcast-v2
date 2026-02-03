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

// Serve React app for all other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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
});
