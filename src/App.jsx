import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MantineProvider, AppShell, Container, Title, Group, Badge, Card, SimpleGrid, 
  Text, Button, Stack, Avatar, Image, Modal, ActionIcon, Paper, Box, 
  createTheme, ScrollArea, TextInput, PasswordInput, ThemeIcon, Divider, Progress, Select
} from '@mantine/core';
import { 
  IconBrandDiscord, IconUsers, IconBroadcast, IconCircleFilled, IconCar, IconAlertTriangle, 
  IconPaw, IconClock, IconSkull, IconHeart, IconHeartBroken, IconSearch, IconFilter, 
  IconSword, IconShield, IconTrophy
} from '@tabler/icons-react';
import axios from 'axios';
import { notifications, Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const API_BASE = 'https://sdrp-broadcast.onrender.com';
const PROJECT_START = new Date('2026-02-06T18:00:00');

const theme = createTheme({
  primaryColor: 'green',
  fontFamily: '"Press Start 2P", cursive',
  defaultRadius: 0,
});

// ============================================
// PLAYERS PAGE COMPONENT
// ============================================
function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLives, setFilterLives] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPlayers();
    // Auto-Refresh alle 30 Sekunden
    const interval = setInterval(() => {
      fetchPlayers();
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlayers = async () => {
    try {
      setIsRefreshing(true);
      // ECHTE API ABFRAGE - Minecraft Players
      const response = await axios.get(`${API_BASE}/api/minecraft/players`);
      const apiData = response.data;
      
      // Direktes Mapping der API-Daten (keine Platzhalter mehr!)
      const playersData = apiData.players || [];
      
      if (playersData.length === 0) {
        console.warn('⚠️ No players found in API response');
        setPlayers([]);
        setIsRefreshing(false);
        return;
      }
      
      // Normalisiere nur die Struktur, aber nutze echte Daten
      const processedPlayers = playersData.map((player) => ({
        id: player.id,
        username: player.username,
        lives: player.lives, // Echte Leben-Daten von API
        kills: player.kills,
        deaths: player.deaths,
        playTime: player.playTime,
        status: player.status,
        lastDeath: player.lastDeath
      }));
      
      setPlayers(processedPlayers);
      setIsRefreshing(false);
      console.log('✅ Players loaded from API:', processedPlayers.length);
      console.log('📊 Stats:', {
        total: processedPlayers.length,
        alive: processedPlayers.filter(p => p.lives > 0).length,
        eliminated: processedPlayers.filter(p => p.lives === 0).length
      });
    } catch (error) {
      setIsRefreshing(false);
      console.error('❌ Error fetching players:', error);
      console.error('   API Base:', API_BASE);
      console.error('   Endpoint:', `${API_BASE}/api/minecraft/players`);
      
      // Bei Fehler: Leere Liste (keine Fallback-Daten)
      setPlayers([]);
      
      // Notification nur bei Fehler zeigen
      notifications.show({
        title: 'API Fehler',
        message: 'Konnte Spieler-Daten nicht laden. Bitte Server prüfen.',
        color: 'red',
        autoClose: 5000,
      });
    }
  };

  const filteredPlayers = players
    .filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => {
      if (filterLives === 'all') return true;
      if (filterLives === 'alive') return p.lives > 0;
      if (filterLives === 'eliminated') return p.lives === 0;
      return p.lives === parseInt(filterLives);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.username.localeCompare(b.username);
      if (sortBy === 'lives') return b.lives - a.lives;
      if (sortBy === 'kills') return b.kills - a.kills;
      if (sortBy === 'deaths') return a.deaths - b.deaths;
      return 0;
    });

  const renderHearts = (lives) => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      if (i < lives) {
        hearts.push(
          <IconHeart 
            key={i} 
            size={32} 
            fill="#ef4444" 
            color="#ef4444"
            style={{ 
              filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))',
              animation: lives === 1 ? 'heartbeat 1.5s infinite' : 'none'
            }}
          />
        );
      } else {
        hearts.push(
          <IconHeartBroken 
            key={i} 
            size={32} 
            color="#3f3f46"
            style={{ opacity: 0.3 }}
          />
        );
      }
    }
    return hearts;
  };

  const getPlayerColor = (lives) => {
    if (lives === 3) return '#22c55e';
    if (lives === 2) return '#eab308';
    if (lives === 1) return '#ef4444';
    return '#71717a';
  };

  const stats = {
    total: players.length,
    alive: players.filter(p => p.lives > 0).length,
    eliminated: players.filter(p => p.lives === 0).length,
    threeHearts: players.filter(p => p.lives === 3).length,
    twoHearts: players.filter(p => p.lives === 2).length,
    oneHeart: players.filter(p => p.lives === 1).length,
  };

  return (
    <Container size="xl" py="xl">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .player-card-hover {
          transition: all 0.3s ease;
        }
        .player-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
      `}} />

      {/* HEADER */}
      <Group mb="xl" justify="space-between">
        <Group>
          <IconHeart size={32} color="#ef4444" />
          <Title className="mc-font" style={{ fontSize: '18px', textShadow: '2px 2px #000' }}>
            SPIELER LEBEN
          </Title>
        </Group>
        <Paper className="mc-panel" p="xs" px="md">
          <Group gap="xs">
            <IconClock 
              size={14} 
              color={isRefreshing ? "#eab308" : "#48bb78"} 
              style={{ 
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none' 
              }}
            />
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>
              {isRefreshing ? 'LÄDT...' : `UPDATE: ${lastUpdate.toLocaleTimeString('de-DE')}`}
            </Text>
          </Group>
        </Paper>
      </Group>

      {/* STATS */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md" mb="xl">
        <Paper className="mc-panel" p="md">
          <Stack gap={5} align="center">
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>TOTAL</Text>
            <Text className="mc-font" size="xl" c="blue">{stats.total}</Text>
          </Stack>
        </Paper>
        <Paper className="mc-panel live-glow" p="md">
          <Stack gap={5} align="center">
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>AM LEBEN</Text>
            <Text className="mc-font" size="xl" c="green">{stats.alive}</Text>
          </Stack>
        </Paper>
        <Paper className="mc-panel" p="md" style={{border: '4px solid #ef4444'}}>
          <Stack gap={5} align="center">
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>ELIMINIERT</Text>
            <Text className="mc-font" size="xl" c="red">{stats.eliminated}</Text>
          </Stack>
        </Paper>
        <Paper className="mc-panel" p="md">
          <Stack gap={5} align="center">
            <Group gap={3}>
              <IconHeart size={12} fill="#22c55e" color="#22c55e" />
              <IconHeart size={12} fill="#22c55e" color="#22c55e" />
              <IconHeart size={12} fill="#22c55e" color="#22c55e" />
            </Group>
            <Text className="mc-font" size="xl" c="green">{stats.threeHearts}</Text>
          </Stack>
        </Paper>
        <Paper className="mc-panel" p="md">
          <Stack gap={5} align="center">
            <Group gap={3}>
              <IconHeart size={12} fill="#eab308" color="#eab308" />
              <IconHeart size={12} fill="#eab308" color="#eab308" />
              <IconHeartBroken size={12} color="#3f3f46" style={{opacity: 0.3}} />
            </Group>
            <Text className="mc-font" size="xl" c="yellow">{stats.twoHearts}</Text>
          </Stack>
        </Paper>
        <Paper className="mc-panel" p="md">
          <Stack gap={5} align="center">
            <Group gap={3}>
              <IconHeart size={12} fill="#ef4444" color="#ef4444" />
              <IconHeartBroken size={12} color="#3f3f46" style={{opacity: 0.3}} />
              <IconHeartBroken size={12} color="#3f3f46" style={{opacity: 0.3}} />
            </Group>
            <Text className="mc-font" size="xl" c="red">{stats.oneHeart}</Text>
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* FILTERS */}
      <Paper className="mc-panel" p="md" mb="xl">
        <Group>
          <TextInput
            placeholder="Spieler suchen..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
            styles={{input: {background: 'rgba(0,0,0,0.5)', border: '2px solid #333'}}}
          />
          <Select
            placeholder="Filter"
            leftSection={<IconFilter size={16} />}
            data={[
              { value: 'all', label: 'Alle' },
              { value: 'alive', label: 'Am Leben' },
              { value: '3', label: '3 ❤️' },
              { value: '2', label: '2 ❤️' },
              { value: '1', label: '1 ❤️' },
              { value: 'eliminated', label: 'Eliminiert' },
            ]}
            value={filterLives}
            onChange={(value) => setFilterLives(value)}
            style={{ width: 150 }}
            styles={{input: {background: 'rgba(0,0,0,0.5)', border: '2px solid #333'}}}
          />
          <Select
            placeholder="Sort"
            data={[
              { value: 'name', label: 'Name' },
              { value: 'lives', label: 'Leben' },
              { value: 'kills', label: 'Kills' },
              { value: 'deaths', label: 'Deaths' },
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            style={{ width: 120 }}
            styles={{input: {background: 'rgba(0,0,0,0.5)', border: '2px solid #333'}}}
          />
        </Group>
      </Paper>

      {/* PLAYERS GRID */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
        {filteredPlayers.map((player) => (
          <Card 
            key={player.id}
            className="mc-panel player-card-hover"
            padding="lg"
            style={{ 
              borderColor: getPlayerColor(player.lives),
              borderWidth: '4px',
              opacity: player.lives === 0 ? 0.6 : 1
            }}
          >
            {player.status === 'online' && player.lives > 0 && (
              <Badge 
                color="green" 
                size="xs"
                radius={0}
                className="mc-font"
                style={{ position: 'absolute', top: 10, right: 10, fontSize: '6px' }}
              >
                ONLINE
              </Badge>
            )}
            {player.status === 'eliminated' && (
              <Badge 
                color="red" 
                size="xs"
                radius={0}
                className="mc-font"
                style={{ position: 'absolute', top: 10, right: 10, fontSize: '6px' }}
              >
                ☠ OUT
              </Badge>
            )}

            <Stack gap="md" align="center">
              <Avatar
                src={`https://minotar.net/avatar/${player.username}/100`}
                size={100}
                radius={0}
                className="pixel-border"
                style={{
                  border: `4px solid ${getPlayerColor(player.lives)}`,
                  filter: player.lives === 0 ? 'grayscale(100%)' : 'none',
                  boxShadow: player.lives === 0 ? 'none' : `0 0 15px ${getPlayerColor(player.lives)}80`
                }}
              />

              <Text 
                className="mc-font"
                style={{ 
                  fontSize: '10px',
                  color: getPlayerColor(player.lives),
                  textAlign: 'center',
                  wordBreak: 'break-all'
                }}
              >
                {player.username}
              </Text>

              <Divider style={{ width: '100%' }} />

              <Box style={{ width: '100%' }}>
                <Text className="mc-font" size="xs" ta="center" c="dimmed" style={{fontSize: '7px'}}>
                  LEBEN: {player.lives}/3
                </Text>
                <Group gap="xs" justify="center" mt="xs" style={{ width: '100%' }}>
                  {renderHearts(player.lives)}
                </Group>
              </Box>

              <Divider style={{ width: '100%' }} />

              <SimpleGrid cols={3} spacing="xs" style={{ width: '100%' }}>
                <Stack gap={2} align="center">
                  <IconSword size={14} color="#22c55e" />
                  <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '6px'}}>KILLS</Text>
                  <Text className="mc-font" c="green">{player.kills}</Text>
                </Stack>
                <Stack gap={2} align="center">
                  <IconSkull size={14} color="#ef4444" />
                  <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '6px'}}>DEATHS</Text>
                  <Text className="mc-font" c="red">{player.deaths}</Text>
                </Stack>
                <Stack gap={2} align="center">
                  <IconClock size={14} color="#3b82f6" />
                  <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '6px'}}>TIME</Text>
                  <Text className="mc-font" size="xs" c="blue">{player.playTime}</Text>
                </Stack>
              </SimpleGrid>

              {player.lastDeath && (
                <Paper p="xs" style={{ background: 'rgba(239, 68, 68, 0.1)', width: '100%' }}>
                  <Text className="standard-font" size="xs" c="red" ta="center">
                    💀 {player.lastDeath}
                  </Text>
                </Paper>
              )}

              <Progress 
                value={(player.lives / 3) * 100} 
                color={player.lives === 3 ? 'green' : player.lives === 2 ? 'yellow' : player.lives === 1 ? 'red' : 'gray'}
                size="sm"
                radius={0}
                striped={player.lives === 1}
                animated={player.lives === 1}
                style={{ width: '100%' }}
              />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  const [streams, setStreams] = useState([]);
  const [allStreamerData, setAllStreamerData] = useState([]);
  const [deathHistory, setDeathHistory] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [timeLabel, setTimeLabel] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [currentPage, setCurrentPage] = useState('home'); // 'home' or 'dashboard'
  const [joinModalOpened, setJoinModalOpened] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = PROJECT_START - now;
      const isPast = diff < 0;
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((absDiff / 1000 / 60) % 60);
      const secs = Math.floor((absDiff / 1000) % 60);
      setTimeLabel(isPast ? 'PROJEKT_LAUFZEIT' : 'START_IN');
      setTimeValue(`${days}d ${hours}h ${mins}m ${secs}s`);
    };
    const timer = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, mRes, dRes] = await Promise.all([
        axios.get(`${API_BASE}/api/twitch/streams`).catch(() => ({ data: { streams: [] } })),
        axios.get(`${API_BASE}/api/twitch/streamer-data`).catch(() => ({ data: { streamers: [] } })),
        axios.get(`${API_BASE}/api/deathbroadcast`).catch(() => ({ data: { messages: [] } }))
      ]);
      
      const liveStreams = sRes.data.streams || [];
      setStreams(liveStreams);
      setAllStreamerData(mRes.data.streamers || []);
      const deaths = dRes.data.messages || [];
      setDeathHistory(deaths);
      
      if (liveStreams.length > 0 && !selectedStream) setSelectedStream(liveStreams[0]);
    } catch (e) { console.error("API Fetch Error:", e); }
  }, [selectedStream]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const liveLogins = useMemo(() => streams.map(s => s.user_login.toLowerCase()), [streams]);
  const offlineStreamers = useMemo(() => 
    allStreamerData.filter(s => !liveLogins.includes(s.login.toLowerCase())), 
  [allStreamerData, liveLogins]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" />
      
      {/* JOIN SERVER MODAL */}
      <Modal
        opened={joinModalOpened}
        onClose={() => setJoinModalOpened(false)}
        title={
          <Group gap="xs">
            <IconCar size={24} color="#22c55e" />
            <Text className="mc-font" style={{ fontSize: '14px', color: '#22c55e' }}>
              SERVER_BEITRETEN
            </Text>
          </Group>
        }
        size="lg"
        centered
        styles={{
          header: {
            background: 'rgba(49, 49, 49, 0.95)',
            borderBottom: '4px solid #000',
            padding: '20px',
          },
          body: {
            background: 'rgba(34, 34, 34, 0.95)',
            padding: '30px',
          },
          content: {
            border: '6px solid #000',
            boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)',
          },
          title: {
            width: '100%',
          },
        }}
      >
        <Stack gap="xl">
          {/* SERVER IP BOX */}
          <Paper 
            className="mc-panel" 
            p="xl" 
            style={{ 
              background: 'rgba(34, 197, 94, 0.15)',
              border: '4px solid #22c55e',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset -4px -4px #1a1a1a, inset 4px 4px #555',
            }}
          >
            <Stack gap="md" align="center">
              <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '8px' }}>
                📋 SERVER-IP
              </Text>
              <Text 
                className="mc-font" 
                style={{ 
                  fontSize: '20px', 
                  color: '#22c55e',
                  textShadow: '2px 2px #000',
                  userSelect: 'all',
                  letterSpacing: '2px'
                }}
              >
                mc.sd-rp.de
              </Text>
              <Badge 
                color="green" 
                size="lg" 
                radius={0} 
                className="mc-font"
                style={{ fontSize: '8px' }}
              >
                ✅ IN_ZWISCHENABLAGE_KOPIERT
              </Badge>
            </Stack>
          </Paper>

          {/* ANLEITUNG */}
          <Stack gap="md">
            <Group gap="xs">
              <Text className="mc-font" size="sm" c="green" style={{ fontSize: '12px' }}>
                📌 ANLEITUNG:
              </Text>
            </Group>
            
            <Paper className="mc-panel" p="md">
              <Stack gap="sm">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Text className="mc-font" c="green" style={{ fontSize: '14px' }}>1.</Text>
                  <Text className="standard-font" size="sm">
                    Öffne <strong>Minecraft Java Edition</strong>
                  </Text>
                </Group>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Text className="mc-font" c="green" style={{ fontSize: '14px' }}>2.</Text>
                  <Text className="standard-font" size="sm">
                    Klicke auf <strong>"Multiplayer"</strong>
                  </Text>
                </Group>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Text className="mc-font" c="green" style={{ fontSize: '14px' }}>3.</Text>
                  <Text className="standard-font" size="sm">
                    Klicke auf <strong>"Direkte Verbindung"</strong>
                  </Text>
                </Group>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Text className="mc-font" c="green" style={{ fontSize: '14px' }}>4.</Text>
                  <Text className="standard-font" size="sm">
                    Füge die Server-IP ein <strong>(STRG+V)</strong>
                  </Text>
                </Group>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <Text className="mc-font" c="green" style={{ fontSize: '14px' }}>5.</Text>
                  <Text className="standard-font" size="sm">
                    Klicke auf <strong>"Server beitreten"</strong>
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </Stack>

          {/* WICHTIGE INFOS */}
          <Paper 
            className="mc-panel" 
            p="lg"
            style={{ 
              background: 'rgba(239, 68, 68, 0.15)',
              border: '4px solid #ef4444',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.3), inset -4px -4px #1a1a1a, inset 4px 4px #555',
            }}
          >
            <Stack gap="sm">
              <Group gap="xs">
                <IconAlertTriangle size={20} color="#ef4444" />
                <Text className="mc-font" size="sm" c="red" style={{ fontSize: '11px' }}>
                  WICHTIG:
                </Text>
              </Group>
              <Stack gap="xs">
                <Group gap="xs">
                  <Text className="mc-font" c="red" style={{ fontSize: '10px' }}>•</Text>
                  <Text className="standard-font" size="xs" c="dimmed">
                    <strong>Minecraft Version:</strong> 1.21+ erforderlich
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text className="mc-font" c="red" style={{ fontSize: '10px' }}>•</Text>
                  <Text className="standard-font" size="xs" c="dimmed">
                    <strong>Java Edition</strong> wird benötigt (nicht Bedrock!)
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text className="mc-font" c="red" style={{ fontSize: '10px' }}>•</Text>
                  <Text className="standard-font" size="xs" c="dimmed">
                    <strong>Whitelist aktiv:</strong> Tritt Discord bei für Freischaltung
                  </Text>
                </Group>
              </Stack>
            </Stack>
          </Paper>

          {/* VOICE PLUGIN */}
          <Paper 
            className="mc-panel" 
            p="lg"
            style={{ 
              background: 'rgba(59, 130, 246, 0.15)',
              border: '4px solid #3b82f6',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), inset -4px -4px #1a1a1a, inset 4px 4px #555',
            }}
          >
            <Stack gap="md">
              <Group gap="xs">
                <IconPaw size={20} color="#3b82f6" />
                <Text className="mc-font" size="sm" c="blue" style={{ fontSize: '11px' }}>
                  VOICE_PLUGIN:
                </Text>
              </Group>
              
              <Text className="standard-font" size="sm" c="dimmed">
                Lade dir noch das <strong>Ingame Voice Plugin</strong> runter!
              </Text>
              
              <Stack gap="xs">
                <Group gap="xs">
                  <Text className="mc-font" c="blue" style={{ fontSize: '10px' }}>1.</Text>
                  <Text className="standard-font" size="xs" c="dimmed">
                    Öffne <strong>CurseForge</strong>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text className="mc-font" c="blue" style={{ fontSize: '10px' }}>2.</Text>
                  <Text className="standard-font" size="xs" c="dimmed">
                    Klicke auf <strong>"Import"</strong>
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text className="mc-font" c="blue" style={{ fontSize: '10px' }}>3.</Text>
                  <Text className="standard-font" size="xs" c="dimmed">
                    Gib folgenden Code ein:
                  </Text>
                </Group>
              </Stack>

              {/* CODE CTA BOX */}
              <Paper
                p="md"
                style={{
                  background: 'rgba(234, 179, 8, 0.2)',
                  border: '4px solid #eab308',
                  boxShadow: '0 0 20px rgba(234, 179, 8, 0.4), inset -4px -4px #1a1a1a, inset 4px 4px #555',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  navigator.clipboard.writeText('1fVzzMey');
                  notifications.show({
                    title: 'Code kopiert!',
                    message: '1fVzzMey wurde kopiert',
                    color: 'yellow',
                    autoClose: 2000,
                  });
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(234, 179, 8, 0.6), inset -4px -4px #1a1a1a, inset 4px 4px #555';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(234, 179, 8, 0.4), inset -4px -4px #1a1a1a, inset 4px 4px #555';
                }}
              >
                <Stack gap="xs" align="center">
                  <Text className="mc-font" size="xs" c="yellow" style={{ fontSize: '8px' }}>
                    📋 KLICK ZUM KOPIEREN
                  </Text>
                  <Text 
                    className="mc-font"
                    style={{ 
                      fontSize: '24px',
                      color: '#eab308',
                      textShadow: '2px 2px #000',
                      letterSpacing: '4px',
                      userSelect: 'all'
                    }}
                  >
                    1fVzzMey
                  </Text>
                  <Badge 
                    color="yellow" 
                    size="sm" 
                    radius={0}
                    className="mc-font"
                    style={{ fontSize: '7px' }}
                  >
                    CURSEFORGE_CODE
                  </Badge>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          {/* BUTTONS */}
          <Group justify="center" gap="md">
            <Button 
              className="mc-nav-btn mc-font mc-nav-btn-server"
              leftSection={<IconCar size={18}/>}
              onClick={() => {
                navigator.clipboard.writeText('mc.sd-rp.de');
                notifications.show({
                  title: 'Erneut kopiert!',
                  message: 'mc.sd-rp.de in Zwischenablage',
                  color: 'green',
                  autoClose: 2000,
                });
              }}
            >
              ERNEUT KOPIEREN
            </Button>
            
            <Button 
              className="mc-nav-btn mc-font mc-nav-btn-discord"
              leftSection={<IconBrandDiscord size={18}/>}
              component="a"
              href="https://discord.gg/PaPe5WA3kz"
              target="_blank"
            >
              DISCORD
            </Button>
          </Group>
        </Stack>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;700&display=swap');
        
        html, body {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          background-image: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.5)), 
                            url('https://images4.alphacoders.com/137/thumb-1920-1377210.jpg') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-repeat: no-repeat !important;
          background-color: #000 !important;
        }

        #root, .mantine-AppShell-root, .mantine-AppShell-main {
          background: transparent !important;
        }

        .mantine-AppShell-header {
          background: rgba(34, 34, 34, 0.85) !important;
          border-bottom: 6px solid #000 !important;
          backdrop-filter: blur(10px);
        }

        .mc-font { font-family: 'Press Start 2P', cursive !important; }
        .standard-font { font-family: 'Inter', sans-serif !important; }

        .mc-nav-btn {
          image-rendering: pixelated;
          background: #7c7c7c;
          border: 4px solid #000 !important;
          box-shadow: inset -4px -4px #5a5a5a, inset 4px 4px #b8b8b8 !important;
          color: white !important;
          text-shadow: 2px 2px #3f3f3f;
          height: 50px !important;
          padding: 0 20px !important;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mc-nav-btn:hover {
          transform: translateY(-2px);
        }

        .mc-nav-btn.active {
          background: #388E3C !important;
          box-shadow: inset -4px -4px #1b5e20, inset 4px 4px #66bb6a !important;
        }

        .mc-nav-btn-discord { background: #5865F2; box-shadow: inset -4px -4px #3d46a8, inset 4px 4px #8a94ff !important; }
        
        .mc-nav-btn-server { background: #22c55e; box-shadow: inset -4px -4px #16a34a, inset 4px 4px #4ade80 !important; }
        
        .timer-block { background: rgba(0,0,0,0.8); border: 3px solid #555; box-shadow: inset -2px -2px #222, inset 2px 2px #888; padding: 8px 12px; min-width: 220px; }
        
        .mc-panel { 
          background: rgba(49, 49, 49, 0.9); 
          border: 4px solid #000; 
          box-shadow: inset -4px -4px #1a1a1a, inset 4px 4px #555; 
          backdrop-filter: blur(5px); 
        }

        .live-glow { 
          border: 4px solid #388E3C !important; 
          box-shadow: 0 0 15px rgba(56, 142, 60, 0.5), inset -4px -4px #1a1a1a, inset 4px 4px #555 !important; 
        }

        .pixel-border { border: 2px solid #000; image-rendering: pixelated; }
        .sd-card { background: rgba(22, 27, 34, 0.9); border: 1px solid #30363d; border-radius: 8px; }
        .sd-footer-box { background: linear-gradient(180deg, rgba(61, 43, 43, 0.9) 0%, rgba(43, 26, 26, 0.9) 100%); border: 1px solid #6e3636; border-radius: 10px; }
      `}} />

      <AppShell header={{ height: 100 }} padding="md">
        <AppShell.Header withBorder={false}>
          <Container size="xl" h="100%">
            <Group justify="space-between" h="100%" wrap="nowrap" align="center">
              <Group gap="xl" align="center">
                <Title order={3} className="mc-font" style={{ fontSize: '14px', color: '#48bb78', textShadow: '2px 2px #000' }}>
                  Second Dimension<br/>
                  <Text span c="white" inherit style={{ fontSize: '10px' }}>MINECRAFT HARDCORE</Text>
                </Title>
                <Box className="timer-block">
                   <Group gap="xs" wrap="nowrap">
                      <IconClock size={16} color="#f1e05a" />
                      <Stack gap={0}>
                        <Text className="mc-font" style={{ fontSize: '7px' }} c="dimmed">{timeLabel}</Text>
                        <Text className="mc-font" style={{ fontSize: '10px', color: '#f1e05a' }}>{timeValue}</Text>
                      </Stack>
                   </Group>
                </Box>
              </Group>

              <Group gap="md">
                <Button 
                  className={`mc-nav-btn mc-font ${currentPage === 'home' ? 'active' : ''}`}
                  leftSection={<IconBroadcast size={18}/>}
                  onClick={() => setCurrentPage('home')}
                >
                  LIVE
                </Button>
                <Button 
                  className={`mc-nav-btn mc-font ${currentPage === 'dashboard' ? 'active' : ''}`}
                  leftSection={<IconHeart size={18}/>}
                  onClick={() => setCurrentPage('dashboard')}
                >
                  DASHBOARD
                </Button>
                <Button 
                  className="mc-nav-btn mc-font mc-nav-btn-server"
                  leftSection={<IconCar size={18}/>}
                  onClick={() => {
                    navigator.clipboard.writeText('mc.sd-rp.de');
                    setJoinModalOpened(true);
                  }}
                >
                  JOIN SERVER
                </Button>
                <Button 
                  className="mc-nav-btn mc-font mc-nav-btn-discord"
                  leftSection={<IconBrandDiscord size={18}/>}
                  component="a" 
                  href="https://discord.gg/PaPe5WA3kz" 
                  target="_blank"
                >
                  DISCORD
                </Button>
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          {currentPage === 'dashboard' ? (
            <PlayersPage />
          ) : (
            <Container size="xl">
              <Box mb={30} mt={10}>
                <Group mb="xs">
                  <IconSkull size={18} color="red" />
                  <Text className="mc-font" style={{ fontSize: '10px', color: '#ff4d4d', textShadow: '1px 1px #000' }}>Death_LOG (RECENT_DEATHS)</Text>
                </Group>
                <Paper className="mc-panel" p="xs">
                  <ScrollArea h={250} offsetScrollbars>
                    <Stack gap={5}>
                      {deathHistory.length > 0 ? deathHistory.map((d, i) => (
                        <Box key={d.id || i} px="md" py={8} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap="sm" wrap="nowrap">
                              <Avatar src={`https://minotar.net/avatar/${d.player || 'Steve'}/24`} radius={0} className="pixel-border" size="sm" />
                              <Stack gap={2}>
                                <Text className="mc-font" style={{ fontSize: '8px' }} c="white">
                                  {d.message}
                                </Text>
                                <Text style={{ fontSize: '7px', color: '#aaa', fontFamily: 'Inter' }}>
                                  🗡️ Killer: {d.killer || 'Umwelt'} {d.weapon && d.weapon !== "Unbekannt" ? `(${d.weapon})` : ''} – 🕒 {new Date(d.timestamp).toLocaleTimeString()}
                                </Text>
                              </Stack>
                            </Group>
                            <Badge 
                              color={d.message?.includes("3/3") ? "red" : "green"} 
                              radius={0} 
                              size="xs" 
                              className="mc-font" 
                              style={{fontSize: '7px'}}
                            >
                              {d.message?.includes("3/3") ? "☠ FINAL" : "❤️ ALIVE"}
                            </Badge>
                          </Group>
                        </Box>
                      )) : (
                        <Text className="mc-font" size="xs" c="dimmed" p="sm" ta="center" style={{fontSize: '8px'}}>SYSTEM_READY: NO_RECENT_DEATHS_DETECTED</Text>
                      )}
                    </Stack>
                  </ScrollArea>
                </Paper>
              </Box>

              {selectedStream && (
                <Box mb={50} id="live-section">
                  <Box style={{ display: 'flex', gap: '15px', height: '60vh', alignItems: 'stretch' }}>
                    <Box className="mc-panel live-glow" style={{ flex: 1, background: '#000', padding: '4px' }}>
                      <iframe src={`https://player.twitch.tv/?channel=${selectedStream.user_login}&parent=${window.location.hostname}&autoplay=true&muted=true`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                    </Box>
                    <Box className="mc-panel" visibleFrom="lg" style={{ width: '340px', background: '#18181b', padding: '4px' }}>
                      <iframe src={`https://www.twitch.tv/embed/${selectedStream.user_login}/chat?parent=${window.location.hostname}&darkpopout`} style={{ width: '100%', height: '100%', border: 'none' }} />
                    </Box>
                  </Box>
                  <Paper className="mc-panel" p="md" mt="xs">
                    <Group justify="space-between">
                      <Group>
                        <Avatar src={`https://minotar.net/avatar/${selectedStream.user_name}/48`} radius={0} className="pixel-border" />
                        <Stack gap={0}><Text fw={900} className="mc-font" size="sm" c="green">{selectedStream.user_name}</Text><Text size="xs" c="dimmed" style={{fontFamily: 'Inter'}}>{selectedStream.title}</Text></Stack>
                      </Group>
                      <Badge color="red" size="lg" radius={0} className="mc-font">LIVE_NOW</Badge>
                    </Group>
                  </Paper>
                </Box>
              )}

              <Group mb="md" id="streamer-section">
                  <IconBroadcast size={20} color="red" />
                  <Title order={4} className="mc-font" style={{ fontSize: '14px', textShadow: '2px 2px #000' }}>CURRENTLY_LIVE</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb={50}>
                {streams.map((ls) => (
                  <Card key={ls.id} className="mc-panel live-glow" p={0} onClick={() => setSelectedStream(ls)} style={{ cursor: 'pointer' }}>
                    <Box style={{ position: 'relative' }}>
                      <Image src={ls.thumbnail_url?.replace('{width}x{height}', '440x250')} />
                      <Badge pos="absolute" bottom={5} right={5} color="red" radius={0}>{ls.viewer_count} 👀</Badge>
                    </Box>
                    <Box p="sm">
                      <Text className="mc-font" style={{ fontSize: '9px' }} truncate>{ls.user_name}</Text>
                      <Text size="8px" c="green" mt={5}>ONLINE_SIGNAL_ACTIVE</Text>
                    </Box>
                  </Card>
                ))}
              </SimpleGrid>

              <Divider my="xl" label="OFFLINE_DATABASE" labelPosition="center" styles={{ label: { className: 'mc-font', fontSize: '10px', background: 'transparent' }}} />

              <SimpleGrid cols={{ base: 2, sm: 4, md: 6 }} mb={60}>
                {offlineStreamers.map((os) => (
                  <Card key={os.id} className="mc-panel" p="xs" style={{opacity: 0.8}}>
                    <Stack align="center" gap="xs">
                      <Avatar src={os.profile_image_url || `https://minotar.net/avatar/${os.login}/48`} size="xl" radius={0} className="pixel-border" />
                      <Text className="mc-font" style={{ fontSize: '7px' }} align="center" truncate w="100%">{os.display_name}</Text>
                      <Badge variant="outline" color="gray" size="xs" radius={0} style={{fontSize: '7px'}}>OFFLINE</Badge>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>

              <Box mt={100} mb={50}>
                <Group mb="xl">
                  <IconAlertTriangle color="orange" size={24} />
                  <Title order={2} className="mc-font" style={{ fontSize: '18px', textShadow: '2px 2px #000' }}>Event Infos</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
                  <Card className="sd-card" p="xl">
                    <Group mb="md"><ThemeIcon color="orange" variant="light" size="lg"><IconBroadcast size={20}/></ThemeIcon><Text className="mc-font" style={{fontSize: '12px'}}>Infos</Text></Group>
                    <Text size="xs" className="standard-font" c="#8b949e"></p>🟩 Minecraft Hardcore Event – Regeln & Infos</p>

<p></p>🔒 Zutritt nur über Whitelist
Das Projekt kann ausschließlich über die Whitelist betreten werden.</p>

<p></p>❤️ Leben-System
Jeder Spieler startet mit 3 Leben.
Verliert ein Spieler sein drittes Leben, scheidet er aus dem aktiven Spiel aus und ist nur noch Zuschauer.</p>

<p>⚔️ PvP-Regelung
Das absichtliche Töten von Mitspielern ohne triftigen Grund ist nicht erlaubt.
(Regelverstöße können zu Strafen oder Ausschluss führen.)</p>

<p>🎥 Streaming-Hinweis
Wenn du das Event streamst, melde dich bitte im Discord, damit dein Stream auf der Projektseite angezeigt werden kann.</Text> </p>
                  </Card>
                  <Card className="sd-card" p="xl">
                    <Group mb="md"><ThemeIcon color="blue" variant="light" size="lg"><IconUsers size={20}/></ThemeIcon><Text className="mc-font" style={{fontSize: '12px'}}>Highlights</Text></Group>
                    <Text size="xs" className="standard-font" c="#c9d1d9">Custom Scripts, faires Team und eine wachsende Welt erwarten dich.</Text>
                  </Card>
                </SimpleGrid>

                <Paper className="sd-footer-box" p={40}>
                  <Stack align="center" gap="md">
                    <Title className="mc-font" order={2} style={{ fontSize: '18px', textShadow: '2px 2px #000', textAlign: 'center' }}>Bereit für Second Dimension?</Title>
                    <Group mt="lg">
                      <Button size="lg" className="mc-nav-btn mc-font mc-nav-btn-discord" component="a" href="https://discord.gg/PaPe5WA3kz" target="_blank">DISCORD</Button>
                      <Button 
  size="lg" 
  className="mc-nav-btn mc-font mc-nav-btn-server"
  leftSection={<IconCar size={18}/>}
  onClick={() => {
    navigator.clipboard.writeText('mc.sd-rp.de');
    setJoinModalOpened(true);
  }}
>
  JOIN SERVER
</Button>
                    </Group>
                  </Stack>
                </Paper>
              </Box>
            </Container>
          )}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
