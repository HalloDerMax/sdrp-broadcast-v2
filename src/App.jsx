import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MantineProvider, AppShell, Container, Title, Group, Badge, Card, SimpleGrid, 
  Text, Button, Stack, Avatar, Image, Modal, ActionIcon, Paper, Box, 
  createTheme, ScrollArea, TextInput, PasswordInput, ThemeIcon, Divider, Progress, Select,
  Burger, Drawer, RingProgress, Center
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconBrandDiscord, IconUsers, IconBroadcast, IconCircleFilled, IconCar, IconAlertTriangle, 
  IconPaw, IconClock, IconSkull, IconHeart, IconHeartBroken, IconSearch, IconFilter, 
  IconSword, IconShield, IconTrophy, IconMenu2, IconMedal, IconCrown, IconFlame
} from '@tabler/icons-react';
import axios from 'axios';
import { notifications, Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const API_BASE = 'https://sdrp-broadcast.onrender.com';
const PROJECT_START = new Date('2026-02-07T18:00:00');

const theme = createTheme({
  primaryColor: 'green',
  fontFamily: '"Press Start 2P", cursive',
  defaultRadius: 0,
});

// ============================================
// CLIPBOARD HELPER FUNCTION (HTTPS + HTTP)
// ============================================
const copyToClipboard = (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
    return Promise.resolve();
  }
};

// ============================================
// HELPER FUNCTION: Parse Playtime to Minutes
// ============================================
const parsePlaytimeToMinutes = (playtime) => {
  if (!playtime) return 0;
  
  // Format: "Xh Ym" or "Xh" or "Ym"
  let totalMinutes = 0;
  
  const hourMatch = playtime.match(/(\d+)h/);
  const minMatch = playtime.match(/(\d+)m/);
  
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1]);
  
  return totalMinutes;
};

// ============================================
// LEADERBOARD PAGE COMPONENT
// ============================================
function LeaderboardPage() {
  const [players, setPlayers] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(() => {
      fetchPlayers();
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlayers = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_BASE}/api/minecraft/players`);
      const apiData = response.data;
      const playersData = apiData.players || [];
      
      if (playersData.length === 0) {
        console.warn('⚠️ No players found in API response');
        setPlayers([]);
        setIsRefreshing(false);
        return;
      }
      
      const processedPlayers = playersData.map((player) => ({
        id: player.id,
        username: player.username,
        lives: player.lives,
        kills: player.kills,
        deaths: player.deaths,
        playTime: player.playTime,
        playTimeMinutes: parsePlaytimeToMinutes(player.playTime),
        status: player.status,
        lastDeath: player.lastDeath
      }));
      
      setPlayers(processedPlayers);
      setIsRefreshing(false);
    } catch (error) {
      setIsRefreshing(false);
      console.error('❌ Error fetching players:', error);
      setPlayers([]);
      notifications.show({
        title: 'API Fehler',
        message: 'Konnte Spieler-Daten nicht laden.',
        color: 'red',
        autoClose: 5000,
      });
    }
  };

const rankedPlayers = [...players]
  .map(player => ({
    ...player,
    playTimeMinutes: parsePlaytimeToMinutes(player.playTime)
  }))
  .sort((a, b) => {
    const aMinutes = a.playTimeMinutes || parsePlaytimeToMinutes(a.playTime);
    const bMinutes = b.playTimeMinutes || parsePlaytimeToMinutes(b.playTime);
    
    if (bMinutes !== aMinutes) {
      return bMinutes - aMinutes;
    }
    return b.lives - a.lives;
  });

  const getMedalIcon = (rank) => {
    if (rank === 1) return <IconCrown size={32} color="#ffd700" fill="#ffd700" />;
    if (rank === 2) return <IconMedal size={32} color="#c0c0c0" fill="#c0c0c0" />;
    if (rank === 3) return <IconMedal size={32} color="#cd7f32" fill="#cd7f32" />;
    return <IconTrophy size={32} color="#71717a" />;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#ffd700';
    if (rank === 2) return '#c0c0c0';
    if (rank === 3) return '#cd7f32';
    return '#71717a';
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'yellow';
    if (rank === 2) return 'gray';
    if (rank === 3) return 'orange';
    return 'dark';
  };

  const stats = {
    topPlayer: rankedPlayers[0]?.username || 'N/A',
    mostKills: [...players].sort((a, b) => b.kills - a.kills)[0],
    mostPlaytime: [...players].sort((a, b) => b.playTimeMinutes - a.playTimeMinutes)[0],
    avgLives: players.length > 0 ? (players.reduce((sum, p) => sum + p.lives, 0) / players.length).toFixed(1) : 0,
  };

  return (
    <Container size="xl" py="xl">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .leaderboard-card-hover {
          transition: all 0.3s ease;
        }
        .leaderboard-card-hover:hover {
          transform: translateX(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .gold-shine {
          background: linear-gradient(90deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
          background-size: 200% auto;
          animation: shine 3s linear infinite;
        }
        .rank-1 {
          border-color: #ffd700 !important;
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset -4px -4px #1a1a1a, inset 4px 4px #555 !important;
        }
        .rank-2 {
          border-color: #c0c0c0 !important;
          box-shadow: 0 0 20px rgba(192, 192, 192, 0.5), inset -4px -4px #1a1a1a, inset 4px 4px #555 !important;
        }
        .rank-3 {
          border-color: #cd7f32 !important;
          box-shadow: 0 0 20px rgba(205, 127, 50, 0.5), inset -4px -4px #1a1a1a, inset 4px 4px #555 !important;
        }
      `}} />

      <Group mb="xl" justify="space-between">
        <Group>
          <IconTrophy size={32} color="#ffd700" />
          <Title className="mc-font" style={{ fontSize: '18px', textShadow: '2px 2px #000' }}>
            BESTENLISTE
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

      {/* TOP STATS */}
      <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing="md" mb="xl">
        <Paper className="mc-panel rank-1" p="md">
          <Stack gap={5} align="center">
            <IconCrown size={20} color="#ffd700" fill="#ffd700" />
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>TOP SPIELER</Text>
            <Text className="mc-font" size="sm" c="yellow" ta="center" style={{fontSize: '8px'}}>
              {stats.topPlayer}
            </Text>
          </Stack>
        </Paper>

        <Paper className="mc-panel" p="md" style={{border: '4px solid #ef4444'}}>
          <Stack gap={5} align="center">
            <IconSword size={20} color="#ef4444" />
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>MEISTE KILLS</Text>
            <Text className="mc-font" size="sm" c="red" ta="center" style={{fontSize: '8px'}}>
              {stats.mostKills?.username || 'N/A'}
            </Text>
            <Badge color="red" size="xs" radius={0} className="mc-font" style={{fontSize: '6px'}}>
              {stats.mostKills?.kills || 0} KILLS
            </Badge>
          </Stack>
        </Paper>

        <Paper className="mc-panel" p="md" style={{border: '4px solid #3b82f6'}}>
          <Stack gap={5} align="center">
            <IconClock size={20} color="#3b82f6" />
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>LÄNGSTE ZEIT</Text>
            <Text className="mc-font" size="sm" c="blue" ta="center" style={{fontSize: '8px'}}>
              {stats.mostPlaytime?.username || 'N/A'}
            </Text>
            <Badge color="blue" size="xs" radius={0} className="mc-font" style={{fontSize: '6px'}}>
              {stats.mostPlaytime?.playTime || '0h'}
            </Badge>
          </Stack>
        </Paper>

        <Paper className="mc-panel" p="md" style={{border: '4px solid #22c55e'}}>
          <Stack gap={5} align="center">
            <IconHeart size={20} color="#22c55e" fill="#22c55e" />
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>Ø LEBEN</Text>
            <Text className="mc-font" size="xl" c="green">{stats.avgLives}</Text>
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* TOP 3 PODIUM */}
      {rankedPlayers.length >= 3 && (
        <Box mb="xl">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" style={{ alignItems: 'end' }}>
            {/* 2nd Place */}
            <Card className={`mc-panel leaderboard-card-hover rank-2`} padding="lg" style={{ order: { base: 2, sm: 1 } }}>
              <Stack gap="md" align="center">
                <Box style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }}>{getMedalIcon(2)}</Box>
                <Badge color={getRankBadgeColor(2)} size="lg" radius={0} className="mc-font" style={{ fontSize: '10px' }}>#2 PLATZ</Badge>
                <Avatar src={`https://minotar.net/avatar/${rankedPlayers[1].username}/100`} size={100} radius={0} className="pixel-border" style={{ border: `4px solid ${getRankColor(2)}`, boxShadow: `0 0 15px ${getRankColor(2)}80` }} />
                <Text className="mc-font" style={{ fontSize: '12px', color: getRankColor(2), textAlign: 'center', wordBreak: 'break-all' }}>{rankedPlayers[1].username}</Text>
                <Divider style={{ width: '100%' }} />
                <SimpleGrid cols={2} spacing="xs" style={{ width: '100%' }}>
                  <Stack gap={2} align="center"><IconHeart size={16} color="#22c55e" fill="#22c55e" /><Text className="mc-font" size="xs" c="green">{rankedPlayers[1].lives}/3</Text></Stack>
                  <Stack gap={2} align="center"><IconClock size={16} color="#3b82f6" /><Text className="mc-font" size="xs" c="blue">{rankedPlayers[1].playTime}</Text></Stack>
                </SimpleGrid>
              </Stack>
            </Card>

            {/* 1st Place */}
            <Card className={`mc-panel leaderboard-card-hover rank-1`} padding="lg" style={{ order: { base: 1, sm: 2 } }}>
              <Stack gap="md" align="center">
                <Box style={{ animation: 'float 3s ease-in-out infinite' }}>{getMedalIcon(1)}</Box>
                <Badge className="gold-shine" size="xl" radius={0} style={{ fontSize: '12px', color: '#000', border: '2px solid #000' }}>👑 CHAMPION</Badge>
                <Avatar src={`https://minotar.net/avatar/${rankedPlayers[0].username}/120`} size={120} radius={0} className="pixel-border" style={{ border: `6px solid ${getRankColor(1)}`, boxShadow: `0 0 30px ${getRankColor(1)}`, animation: 'float 3s ease-in-out infinite' }} />
                <Text className="mc-font" style={{ fontSize: '14px', color: getRankColor(1), textAlign: 'center', wordBreak: 'break-all', textShadow: '2px 2px #000' }}>{rankedPlayers[0].username}</Text>
                <Divider style={{ width: '100%' }} />
                <SimpleGrid cols={2} spacing="md" style={{ width: '100%' }}>
                  <Stack gap={2} align="center"><IconHeart size={20} color="#22c55e" fill="#22c55e" /><Text className="mc-font" c="green" style={{fontSize: '12px'}}>{rankedPlayers[0].lives}/3</Text></Stack>
                  <Stack gap={2} align="center"><IconClock size={20} color="#3b82f6" /><Text className="mc-font" c="blue" style={{fontSize: '12px'}}>{rankedPlayers[0].playTime}</Text></Stack>
                </SimpleGrid>
              </Stack>
            </Card>

            {/* 3rd Place */}
            <Card className={`mc-panel leaderboard-card-hover rank-3`} padding="lg" style={{ order: 3 }}>
              <Stack gap="md" align="center">
                <Box style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '1s' }}>{getMedalIcon(3)}</Box>
                <Badge color={getRankBadgeColor(3)} size="lg" radius={0} className="mc-font" style={{ fontSize: '10px' }}>#3 PLATZ</Badge>
                <Avatar src={`https://minotar.net/avatar/${rankedPlayers[2].username}/100`} size={100} radius={0} className="pixel-border" style={{ border: `4px solid ${getRankColor(3)}`, boxShadow: `0 0 15px ${getRankColor(3)}80` }} />
                <Text className="mc-font" style={{ fontSize: '12px', color: getRankColor(3), textAlign: 'center', wordBreak: 'break-all' }}>{rankedPlayers[2].username}</Text>
                <Divider style={{ width: '100%' }} />
                <SimpleGrid cols={2} spacing="xs" style={{ width: '100%' }}>
                  <Stack gap={2} align="center"><IconHeart size={16} color="#22c55e" fill="#22c55e" /><Text className="mc-font" size="xs" c="green">{rankedPlayers[2].lives}/3</Text></Stack>
                  <Stack gap={2} align="center"><IconClock size={16} color="#3b82f6" /><Text className="mc-font" size="xs" c="blue">{rankedPlayers[2].playTime}</Text></Stack>
                </SimpleGrid>
              </Stack>
            </Card>
          </SimpleGrid>
        </Box>
      )}

      {/* FULL LIST */}
      <Stack gap="sm">
        {rankedPlayers.map((player, index) => (
          <Card key={player.id} className={`mc-panel leaderboard-card-hover ${index < 3 ? `rank-${index + 1}` : ''}`} padding="md" style={{ opacity: player.lives === 0 ? 0.5 : 1 }}>
            <Group justify="space-between">
              <Group gap="md">
                <Text className="mc-font" style={{ width: 40 }}>#{index + 1}</Text>
                <Avatar src={`https://minotar.net/avatar/${player.username}/60`} radius={0} className="pixel-border" />
                <Text className="mc-font" style={{ fontSize: '10px' }}>{player.username}</Text>
              </Group>
              <Text className="mc-font" style={{ fontSize: '10px' }}>{player.playTime}</Text>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}

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
    const interval = setInterval(() => {
      fetchPlayers();
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlayers = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_BASE}/api/minecraft/players`);
      const apiData = response.data;
      setPlayers(apiData.players || []);
      setIsRefreshing(false);
    } catch (error) {
      setIsRefreshing(false);
      notifications.show({ title: 'API Fehler', message: 'Konnte Daten nicht laden.', color: 'red' });
    }
  };

  const filteredPlayers = players
    .filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Container size="xl" py="xl">
      <Title className="mc-font" order={3} mb="xl">SPIELER LEBEN</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {filteredPlayers.map(player => (
          <Card key={player.id} className="mc-panel" p="lg">
            <Stack align="center">
              <Avatar src={`https://minotar.net/avatar/${player.username}/80`} size={80} radius={0} className="pixel-border" />
              <Text className="mc-font" style={{fontSize: '10px'}}>{player.username}</Text>
              <Group gap={5}>
                {[...Array(3)].map((_, i) => (
                  <IconHeart key={i} size={20} fill={i < player.lives ? "red" : "none"} color={i < player.lives ? "red" : "#444"} />
                ))}
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

// ============================================
// MAIN APP ENTRY
// ============================================
export default function App() {
  const [activePage, setActivePage] = useState('leaderboard');
  const [opened, { toggle }] = useDisclosure();

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header p="md" className="mc-panel">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text className="mc-font" style={{ fontSize: '12px' }}>SDRP</Text>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md" className="mc-panel">
          <Stack>
            <Button variant="subtle" color="green" onClick={() => setActivePage('leaderboard')} className="mc-font" style={{fontSize: '8px'}}>LEADERBOARD</Button>
            <Button variant="subtle" color="green" onClick={() => setActivePage('players')} className="mc-font" style={{fontSize: '8px'}}>SPIELER</Button>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main style={{ background: '#1a1a1a', minHeight: '100vh' }}>
          {activePage === 'leaderboard' ? <LeaderboardPage /> : <PlayersPage />}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
