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
  let totalMinutes = 0;
  const hourMatch = playtime.match(/(\d+\.?\d*)h/);
  const minMatch = playtime.match(/(\d+)m/);
  if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;
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
      if (bMinutes !== aMinutes) return bMinutes - aMinutes;
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
              style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
            />
            <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>
              {isRefreshing ? 'LÄDT...' : `UPDATE: ${lastUpdate.toLocaleTimeString('de-DE')}`}
            </Text>
          </Group>
        </Paper>
      </Group>

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

      {rankedPlayers.length >= 3 && (
        <Box mb="xl">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" style={{ alignItems: 'end' }}>
            {/* 2nd Place */}
            <Card className={`mc-panel leaderboard-card-hover rank-2`} padding="lg" style={{ order: { base: 2, sm: 1 } }}>
              <Stack gap="md" align="center">
                <Box style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }}>
                  {getMedalIcon(2)}
                </Box>
                <Badge color={getRankBadgeColor(2)} size="lg" radius={0} className="mc-font" style={{ fontSize: '10px' }}>
                  #2 PLATZ
                </Badge>
                <Avatar
                  src={`https://minotar.net/avatar/${rankedPlayers[1].username}/100`}
                  size={100} radius={0} className="pixel-border"
                  style={{ border: `4px solid ${getRankColor(2)}`, boxShadow: `0 0 15px ${getRankColor(2)}80` }}
                />
                <Text className="mc-font" style={{ fontSize: '12px', color: getRankColor(2), textAlign: 'center', wordBreak: 'break-all' }}>
                  {rankedPlayers[1].username}
                </Text>
                <Divider style={{ width: '100%' }} />
                <SimpleGrid cols={2} spacing="xs" style={{ width: '100%' }}>
                  <Stack gap={2} align="center">
                    <IconHeart size={16} color="#22c55e" fill="#22c55e" />
                    <Text className="mc-font" size="xs" c="green">{rankedPlayers[1].lives}/3</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <IconClock size={16} color="#3b82f6" />
                    <Text className="mc-font" size="xs" c="blue">{rankedPlayers[1].playTime}</Text>
                  </Stack>
                </SimpleGrid>
                <Text className="mc-font" size="xs" c="yellow" ta="center" style={{fontSize: '8px'}}>
                  ⭐ SPIELZEIT: {rankedPlayers[1].playTimeMinutes} MIN
                </Text>
              </Stack>
            </Card>

            {/* 1st Place */}
            <Card className={`mc-panel leaderboard-card-hover rank-1`} padding="lg" style={{ order: { base: 1, sm: 2 } }}>
              <Stack gap="md" align="center">
                <Box style={{ animation: 'float 3s ease-in-out infinite' }}>
                  {getMedalIcon(1)}
                </Box>
                <Badge className="gold-shine" size="xl" radius={0} style={{ fontSize: '12px', fontFamily: '"Press Start 2P", cursive', color: '#000', border: '2px solid #000' }}>
                  👑 CHAMPION
                </Badge>
                <Avatar
                  src={`https://minotar.net/avatar/${rankedPlayers[0].username}/120`}
                  size={120} radius={0} className="pixel-border"
                  style={{ border: `6px solid ${getRankColor(1)}`, boxShadow: `0 0 30px ${getRankColor(1)}`, animation: 'float 3s ease-in-out infinite' }}
                />
                <Text className="mc-font" style={{ fontSize: '14px', color: getRankColor(1), textAlign: 'center', wordBreak: 'break-all', textShadow: '2px 2px #000' }}>
                  {rankedPlayers[0].username}
                </Text>
                <Divider style={{ width: '100%' }} />
                <SimpleGrid cols={2} spacing="md" style={{ width: '100%' }}>
                  <Stack gap={2} align="center">
                    <IconHeart size={20} color="#22c55e" fill="#22c55e" />
                    <Text className="mc-font" c="green" style={{fontSize: '12px'}}>{rankedPlayers[0].lives}/3</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <IconClock size={20} color="#3b82f6" />
                    <Text className="mc-font" c="blue" style={{fontSize: '12px'}}>{rankedPlayers[0].playTime}</Text>
                  </Stack>
                </SimpleGrid>
                <SimpleGrid cols={2} spacing="xs" style={{ width: '100%' }}>
                  <Stack gap={2} align="center">
                    <IconSword size={14} color="#ef4444" />
                    <Text className="mc-font" size="xs" c="red">{rankedPlayers[0].kills} K</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <IconSkull size={14} color="#71717a" />
                    <Text className="mc-font" size="xs" c="gray">{rankedPlayers[0].deaths} D</Text>
                  </Stack>
                </SimpleGrid>
                <Paper p="xs" style={{ background: 'rgba(255, 215, 0, 0.2)', width: '100%', border: '2px solid #ffd700' }}>
                  <Text className="mc-font" size="xs" c="yellow" ta="center" style={{fontSize: '8px'}}>
                    ⭐ SPIELZEIT: {rankedPlayers[0].playTimeMinutes} MIN
                  </Text>
                </Paper>
              </Stack>
            </Card>

            {/* 3rd Place */}
            <Card className={`mc-panel leaderboard-card-hover rank-3`} padding="lg" style={{ order: 3 }}>
              <Stack gap="md" align="center">
                <Box style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '1s' }}>
                  {getMedalIcon(3)}
                </Box>
                <Badge color={getRankBadgeColor(3)} size="lg" radius={0} className="mc-font" style={{ fontSize: '10px' }}>
                  #3 PLATZ
                </Badge>
                <Avatar
                  src={`https://minotar.net/avatar/${rankedPlayers[2].username}/100`}
                  size={100} radius={0} className="pixel-border"
                  style={{ border: `4px solid ${getRankColor(3)}`, boxShadow: `0 0 15px ${getRankColor(3)}80` }}
                />
                <Text className="mc-font" style={{ fontSize: '12px', color: getRankColor(3), textAlign: 'center', wordBreak: 'break-all' }}>
                  {rankedPlayers[2].username}
                </Text>
                <Divider style={{ width: '100%' }} />
                <SimpleGrid cols={2} spacing="xs" style={{ width: '100%' }}>
                  <Stack gap={2} align="center">
                    <IconHeart size={16} color="#22c55e" fill="#22c55e" />
                    <Text className="mc-font" size="xs" c="green">{rankedPlayers[2].lives}/3</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <IconClock size={16} color="#3b82f6" />
                    <Text className="mc-font" size="xs" c="blue">{rankedPlayers[2].playTime}</Text>
                  </Stack>
                </SimpleGrid>
                <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>
                  SPIELZEIT: {rankedPlayers[2].playTimeMinutes} MIN
                </Text>
              </Stack>
            </Card>
          </SimpleGrid>
        </Box>
      )}

      <Paper className="mc-panel" p="md" mb="md">
        <Group mb="md">
          <IconFlame size={20} color="#ef4444" />
          <Text className="mc-font" style={{ fontSize: '12px' }}>VOLLSTÄNDIGES RANKING</Text>
        </Group>
        <Text className="standard-font" size="xs" c="dimmed" mb="md">
          Bewertung: Alle Spieler Sortiert nach Spielzeit → dann Leben
        </Text>
      </Paper>

      <Stack gap="sm">
        {rankedPlayers.map((player, index) => {
          const rank = index + 1;
          const isTopThree = rank <= 3;
          return (
            <Card
              key={player.id}
              className={`mc-panel leaderboard-card-hover ${isTopThree ? `rank-${rank}` : ''}`}
              padding="md"
              style={{ opacity: player.lives === 0 ? 0.5 : 1 }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                  <Box style={{ width: 50, textAlign: 'center' }}>
                    {isTopThree ? getMedalIcon(rank) : (
                      <Text className="mc-font" size="xl" c="dimmed" style={{ fontSize: '20px' }}>#{rank}</Text>
                    )}
                  </Box>
                  <Avatar
                    src={`https://minotar.net/avatar/${player.username}/60`}
                    size={60} radius={0} className="pixel-border"
                    style={{
                      border: `3px solid ${isTopThree ? getRankColor(rank) : '#333'}`,
                      filter: player.lives === 0 ? 'grayscale(100%)' : 'none',
                      boxShadow: isTopThree ? `0 0 10px ${getRankColor(rank)}80` : 'none'
                    }}
                  />
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text className="mc-font" style={{ fontSize: '10px', color: isTopThree ? getRankColor(rank) : '#fff' }}>
                        {player.username}
                      </Text>
                      {player.lives === 0 && (
                        <Badge color="red" size="xs" radius={0} className="mc-font" style={{fontSize: '6px'}}>☠ OUT</Badge>
                      )}
                      {player.status === 'online' && player.lives > 0 && (
                        <Badge color="green" size="xs" radius={0} className="mc-font" style={{fontSize: '6px'}}>🟢 LIVE</Badge>
                      )}
                    </Group>
                    <Group gap="lg" wrap="nowrap">
                      <Group gap={4}>
                        <IconHeart size={12} color="#22c55e" fill={player.lives > 0 ? "#22c55e" : "none"} />
                        <Text className="standard-font" size="xs" c="dimmed">{player.lives}/3</Text>
                      </Group>
                      <Group gap={4}>
                        <IconClock size={12} color="#3b82f6" />
                        <Text className="standard-font" size="xs" c="dimmed">{player.playTime}</Text>
                      </Group>
                      <Group gap={4}>
                        <IconSword size={12} color="#ef4444" />
                        <Text className="standard-font" size="xs" c="dimmed">{player.kills}K</Text>
                      </Group>
                      <Group gap={4}>
                        <IconSkull size={12} color="#71717a" />
                        <Text className="standard-font" size="xs" c="dimmed">{player.deaths}D</Text>
                      </Group>
                    </Group>
                  </Stack>
                </Group>
                <Paper
                  p="sm"
                  style={{
                    background: isTopThree
                      ? `rgba(${rank === 1 ? '255, 215, 0' : rank === 2 ? '192, 192, 192' : '205, 127, 50'}, 0.2)`
                      : 'rgba(0, 0, 0, 0.3)',
                    border: isTopThree ? `2px solid ${getRankColor(rank)}` : '2px solid #333',
                    minWidth: 120
                  }}
                >
                  <Stack gap={2} align="center">
                    <Text className="mc-font" size="xs" c="dimmed" style={{fontSize: '7px'}}>SPIELZEIT</Text>
                    <Text className="mc-font" style={{ fontSize: '10px', color: isTopThree ? (rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32') : 'white' }}>
                      {player.playTime}
                    </Text>
                  </Stack>
                </Paper>
              </Group>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}

// ============================================
// PLAYERS PAGE COMPONENT (DASHBOARD - NEU)
// API: GET ${API_BASE}/api/minecraft/stats
// ⚠️ Passe STATS_ENDPOINT an deinen echten Endpoint an!
// ============================================
function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('kills');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ⬇️ HIER den Endpoint anpassen falls nötig
  const STATS_ENDPOINT = `${API_BASE}/api/minecraft/stats`;

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
      const response = await axios.get(STATS_ENDPOINT);
      const data = response.data;
      setPlayers(data.players || []);
      setIsRefreshing(false);
    } catch (error) {
      setIsRefreshing(false);
      console.error('❌ Error fetching stats:', error);
      notifications.show({
        title: 'API Fehler',
        message: 'Konnte Stats-Daten nicht laden.',
        color: 'red',
        autoClose: 5000,
      });
    }
  };

  const sumObj = (obj) => obj ? Object.values(obj).reduce((a, b) => a + b, 0) : 0;

  const filteredPlayers = players
    .filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'kills')    return b.playerKills - a.playerKills;
      if (sortBy === 'deaths')   return b.deaths - a.deaths;
      if (sortBy === 'mined')    return sumObj(b.mined) - sumObj(a.mined);
      if (sortBy === 'mobkills') return sumObj(b.killed) - sumObj(a.killed);
      if (sortBy === 'alive') {
        return parsePlaytimeToMinutes(b.aliveSince || '0h') - parsePlaytimeToMinutes(a.aliveSince || '0h');
      }
      return a.username.localeCompare(b.username);
    });

  const topKiller    = [...players].sort((a, b) => b.playerKills - a.playerKills)[0];
  const topMiner     = [...players].sort((a, b) => sumObj(b.mined) - sumObj(a.mined))[0];
  const topSurvivor  = [...players].sort((a, b) => parsePlaytimeToMinutes(b.aliveSince || '0h') - parsePlaytimeToMinutes(a.aliveSince || '0h'))[0];
  const topMobSlayer = [...players].sort((a, b) => sumObj(b.killed) - sumObj(a.killed))[0];

  const mobEmoji = {
    enderman: '👾', creeper: '💥', zombie: '🧟', skeleton: '💀',
    spider: '🕷️', cave_spider: '🕸️', zombified_piglin: '🐷', piglin: '🐽',
  };
  const oreEmoji = {
    diamond_ore: '💎', iron_ore: '⚙️', stone: '🪨', dirt: '🟫', sand: '🏖️',
  };

  return (
    <Container size="xl" py="xl">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card-hover {
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .stat-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.4) !important;
        }
        .mob-bar {
          height: 10px;
          background: rgba(239,68,68,0.2);
          border: 2px solid #ef4444;
          overflow: hidden;
        }
        .mob-bar-fill {
          height: 100%;
          background: #ef4444;
          transition: width 0.8s ease;
        }
        .ore-bar {
          height: 10px;
          background: rgba(59,130,246,0.2);
          border: 2px solid #3b82f6;
          overflow: hidden;
        }
        .ore-bar-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.8s ease;
        }
      `}} />

      {/* HEADER */}
      <Group mb="xl" justify="space-between">
        <Group>
          <IconShield size={32} color="#48bb78" />
          <Title className="mc-font" style={{ fontSize: '18px', textShadow: '2px 2px #000' }}>
            SPIELER STATS
          </Title>
        </Group>
        <Paper className="mc-panel" p="xs" px="md">
          <Group gap="xs">
            <IconClock
              size={14}
              color={isRefreshing ? "#eab308" : "#48bb78"}
              style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
            />
            <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '7px' }}>
              {isRefreshing ? 'LÄDT...' : `UPDATE: ${lastUpdate.toLocaleTimeString('de-DE')}`}
            </Text>
          </Group>
        </Paper>
      </Group>

      {/* TOP 4 HIGHLIGHT BOXES */}
      <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing="md" mb="xl">
        <Paper className="mc-panel" p="md" style={{ border: '4px solid #ef4444' }}>
          <Stack gap={5} align="center">
            <IconSword size={20} color="#ef4444" />
            <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '7px' }}>TOP KILLER</Text>
            <Text className="mc-font" size="sm" c="red" ta="center" style={{ fontSize: '9px' }}>{topKiller?.username || 'N/A'}</Text>
            <Badge color="red" size="xs" radius={0} className="mc-font" style={{ fontSize: '6px' }}>
              {topKiller?.playerKills || 0} PKills
            </Badge>
          </Stack>
        </Paper>

        <Paper className="mc-panel" p="md" style={{ border: '4px solid #3b82f6' }}>
          <Stack gap={5} align="center">
            <IconSkull size={20} color="#3b82f6" />
            <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '7px' }}>TOP MINER</Text>
            <Text className="mc-font" size="sm" c="blue" ta="center" style={{ fontSize: '9px' }}>{topMiner?.username || 'N/A'}</Text>
            <Badge color="blue" size="xs" radius={0} className="mc-font" style={{ fontSize: '6px' }}>
              {sumObj(topMiner?.mined)} Blöcke
            </Badge>
          </Stack>
        </Paper>

        <Paper className="mc-panel" p="md" style={{ border: '4px solid #22c55e' }}>
          <Stack gap={5} align="center">
            <IconClock size={20} color="#22c55e" />
            <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '7px' }}>LÄNGSTES LEBEN</Text>
            <Text className="mc-font" size="sm" c="green" ta="center" style={{ fontSize: '9px' }}>{topSurvivor?.username || 'N/A'}</Text>
            <Badge color="green" size="xs" radius={0} className="mc-font" style={{ fontSize: '6px' }}>
              {topSurvivor?.aliveSince || '0h'}
            </Badge>
          </Stack>
        </Paper>

        <Paper className="mc-panel" p="md" style={{ border: '4px solid #eab308' }}>
          <Stack gap={5} align="center">
            <IconFlame size={20} color="#eab308" />
            <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '7px' }}>MOB SLAYER</Text>
            <Text className="mc-font" size="sm" c="yellow" ta="center" style={{ fontSize: '9px' }}>{topMobSlayer?.username || 'N/A'}</Text>
            <Badge color="yellow" size="xs" radius={0} className="mc-font" style={{ fontSize: '6px' }}>
              {sumObj(topMobSlayer?.killed)} Mobs
            </Badge>
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* FILTER BAR */}
      <Paper className="mc-panel" p="md" mb="xl">
        <Group style={{ flexWrap: 'wrap' }}>
          <TextInput
            placeholder="Spieler suchen..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
            styles={{ input: { background: 'rgba(0,0,0,0.5)', border: '2px solid #333' } }}
          />
          <Select
            placeholder="Sortieren"
            leftSection={<IconFilter size={16} />}
            data={[
              { value: 'kills',    label: '⚔️ Player Kills' },
              { value: 'deaths',   label: '💀 Deaths' },
              { value: 'mined',    label: '⛏️ Blöcke abgebaut' },
              { value: 'mobkills', label: '🗡️ Mob Kills' },
              { value: 'alive',    label: '⏱️ Alive Since' },
              { value: 'name',     label: '🔤 Name' },
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            style={{ width: 200 }}
            styles={{ input: { background: 'rgba(0,0,0,0.5)', border: '2px solid #333' } }}
          />
        </Group>
      </Paper>

      {/* PLAYER CARDS */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {filteredPlayers.map((player) => {
          const totalMined = sumObj(player.mined);
          const totalMobs  = sumObj(player.killed);

          const topMobs = Object.entries(player.killed || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          const maxMob = topMobs[0]?.[1] || 1;

          const topOres = Object.entries(player.mined || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          const maxOre = topOres[0]?.[1] || 1;

          return (
            <Card
              key={player.uuid || player.username}
              className="mc-panel stat-card-hover"
              padding="lg"
              style={{ animation: 'fadeIn 0.3s ease' }}
            >
              <Stack gap="md">
                {/* Avatar + Name */}
                <Group>
                  <Avatar
                    src={`https://minotar.net/avatar/${player.username}/64`}
                    size={64} radius={0} className="pixel-border"
                    style={{ border: '3px solid #48bb78', boxShadow: '0 0 10px rgba(72,187,120,0.3)' }}
                  />
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Text className="mc-font" style={{ fontSize: '11px', color: '#48bb78' }}>
                      {player.username}
                    </Text>
                    <Group gap="xs" style={{ flexWrap: 'wrap' }}>
                      <Badge color="green" size="xs" radius={0} className="mc-font" style={{ fontSize: '6px' }}>
                        ⏱ ALIVE: {player.aliveSince}
                      </Badge>
                      <Badge color="blue" size="xs" radius={0} className="mc-font" style={{ fontSize: '6px' }}>
                        👁 AWAKE: {player.awakeSince}
                      </Badge>
                    </Group>
                  </Stack>
                </Group>

                <Divider />

                {/* Kern-Stats */}
                <SimpleGrid cols={3} spacing="xs">
                  <Stack gap={2} align="center">
                    <IconSword size={16} color="#ef4444" />
                    <Text className="mc-font" c="red" style={{ fontSize: '14px' }}>{player.playerKills}</Text>
                    <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '6px' }}>P.KILLS</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <IconSkull size={16} color="#71717a" />
                    <Text className="mc-font" c="gray" style={{ fontSize: '14px' }}>{player.deaths}</Text>
                    <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '6px' }}>DEATHS</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <IconFlame size={16} color="#eab308" />
                    <Text className="mc-font" c="yellow" style={{ fontSize: '14px' }}>{totalMobs}</Text>
                    <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '6px' }}>MOB KILLS</Text>
                  </Stack>
                </SimpleGrid>

                <Divider />

                {/* Mob Kill Bars */}
                <Box>
                  <Text className="mc-font" size="xs" c="dimmed" mb="xs" style={{ fontSize: '7px' }}>
                    ⚔️ MOB KILLS ({totalMobs} TOTAL)
                  </Text>
                  <Stack gap={6}>
                    {topMobs.map(([mob, count]) => (
                      <Box key={mob}>
                        <Group justify="space-between" mb={2}>
                          <Text className="standard-font" size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                            {mobEmoji[mob] || '🎮'} {mob.replace(/_/g, ' ')}
                          </Text>
                          <Text className="mc-font" size="xs" c="red" style={{ fontSize: '8px' }}>{count}</Text>
                        </Group>
                        <div className="mob-bar">
                          <div className="mob-bar-fill" style={{ width: `${(count / maxMob) * 100}%` }} />
                        </div>
                      </Box>
                    ))}
                    {topMobs.length === 0 && (
                      <Text className="standard-font" size="xs" c="dimmed" style={{ fontSize: '10px' }}>Keine Mob-Kills</Text>
                    )}
                  </Stack>
                </Box>

                <Divider />

                {/* Mined Bars */}
                <Box>
                  <Text className="mc-font" size="xs" c="dimmed" mb="xs" style={{ fontSize: '7px' }}>
                    ⛏️ ABGEBAUT ({totalMined} TOTAL)
                  </Text>
                  <Stack gap={6}>
                    {topOres.map(([ore, count]) => (
                      <Box key={ore}>
                        <Group justify="space-between" mb={2}>
                          <Text className="standard-font" size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                            {oreEmoji[ore] || '🪨'} {ore.replace(/_/g, ' ')}
                          </Text>
                          <Text className="mc-font" size="xs" c="blue" style={{ fontSize: '8px' }}>{count}</Text>
                        </Group>
                        <div className="ore-bar">
                          <div className="ore-bar-fill" style={{ width: `${(count / maxOre) * 100}%` }} />
                        </div>
                      </Box>
                    ))}
                    {topOres.length === 0 && (
                      <Text className="standard-font" size="xs" c="dimmed" style={{ fontSize: '10px' }}>Keine Blöcke abgebaut</Text>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      {filteredPlayers.length === 0 && (
        <Paper className="mc-panel" p="xl" mt="xl">
          <Text className="mc-font" ta="center" c="dimmed" style={{ fontSize: '10px' }}>
            KEINE_SPIELER_GEFUNDEN
          </Text>
        </Paper>
      )}
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
  const [currentPage, setCurrentPage] = useState('home');
  const [joinModalOpened, setJoinModalOpened] = useState(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

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
      
      {/* MOBILE DRAWER MENU */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={
          <Text className="mc-font" style={{ fontSize: '12px', color: '#48bb78' }}>MENU</Text>
        }
        padding="xl"
        size="80%"
        styles={{
          header: { background: 'rgba(34, 34, 34, 0.95)', borderBottom: '4px solid #000' },
          body: { background: 'rgba(34, 34, 34, 0.95)' },
          content: { border: '4px solid #000' },
        }}
      >
        <Stack gap="md">
          <Button fullWidth className={`mc-nav-btn mc-font ${currentPage === 'home' ? 'active' : ''}`}
            leftSection={<IconBroadcast size={18}/>}
            onClick={() => { setCurrentPage('home'); closeDrawer(); }}>
            LIVE
          </Button>
          <Button fullWidth className={`mc-nav-btn mc-font ${currentPage === 'dashboard' ? 'active' : ''}`}
            leftSection={<IconShield size={18}/>}
            onClick={() => { setCurrentPage('dashboard'); closeDrawer(); }}>
            STATS
          </Button>
          <Button fullWidth className={`mc-nav-btn mc-font ${currentPage === 'leaderboard' ? 'active' : ''}`}
            leftSection={<IconSkull size={18}/>}
            onClick={() => { setCurrentPage('leaderboard'); closeDrawer(); }}>
            BESTENLISTE
          </Button>
          <Button fullWidth className="mc-nav-btn mc-font mc-nav-btn-server"
            leftSection={<IconCar size={18}/>}
            onClick={() => { copyToClipboard('mc.sd-rp.de').then(() => { setJoinModalOpened(true); closeDrawer(); }); }}>
            JOIN SERVER
          </Button>
          <Button fullWidth className="mc-nav-btn mc-font mc-nav-btn-discord"
            leftSection={<IconBrandDiscord size={18}/>}
            component="a" href="https://discord.gg/PaPe5WA3kz" target="_blank"
            onClick={closeDrawer}>
            DISCORD
          </Button>
        </Stack>
      </Drawer>

      <Modal
        opened={joinModalOpened}
        onClose={() => setJoinModalOpened(false)}
        title={
          <Group gap="xs">
            <IconCar size={24} color="#22c55e" />
            <Text className="mc-font" style={{ fontSize: '14px', color: '#22c55e' }}>SERVER_BEITRETEN</Text>
          </Group>
        }
        size="lg" centered
        styles={{
          header: { background: 'rgba(49, 49, 49, 0.95)', borderBottom: '4px solid #000', padding: '20px' },
          body: { background: 'rgba(34, 34, 34, 0.95)', padding: '30px' },
          content: { border: '6px solid #000', boxShadow: '0 0 30px rgba(0, 0, 0, 0.8)' },
          title: { width: '100%' },
        }}
      >
        <Stack gap="xl">
          <Paper className="mc-panel" p="xl" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '4px solid #22c55e', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset -4px -4px #1a1a1a, inset 4px 4px #555' }}>
            <Stack gap="md" align="center">
              <Text className="mc-font" size="xs" c="dimmed" style={{ fontSize: '8px' }}>📋 SERVER-IP</Text>
              <Text className="mc-font" style={{ fontSize: '20px', color: '#22c55e', textShadow: '2px 2px #000', userSelect: 'all', letterSpacing: '2px' }}>
                mc.sd-rp.de
              </Text>
              <Badge color="green" size="lg" radius={0} className="mc-font" style={{ fontSize: '8px' }}>
                ✅ IN_ZWISCHENABLAGE_KOPIERT
              </Badge>
            </Stack>
          </Paper>

          <Stack gap="md">
            <Text className="mc-font" size="sm" c="green" style={{ fontSize: '12px' }}>📌 ANLEITUNG:</Text>
            <Paper className="mc-panel" p="md">
              <Stack gap="sm">
                {[
                  ['Öffne Minecraft Java Edition', '1.'],
                  ['Klicke auf "Multiplayer"', '2.'],
                  ['Klicke auf "Direkte Verbindung"', '3.'],
                  ['Füge die Server-IP ein (STRG+V)', '4.'],
                  ['Klicke auf "Server beitreten"', '5.'],
                ].map(([text, num]) => (
                  <Group key={num} gap="sm" wrap="nowrap" align="flex-start">
                    <Text className="mc-font" c="green" style={{ fontSize: '14px' }}>{num}</Text>
                    <Text className="standard-font" size="sm" dangerouslySetInnerHTML={{ __html: text }} />
                  </Group>
                ))}
              </Stack>
            </Paper>
          </Stack>

          <Paper className="mc-panel" p="lg" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '4px solid #ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3), inset -4px -4px #1a1a1a, inset 4px 4px #555' }}>
            <Stack gap="sm">
              <Group gap="xs">
                <IconAlertTriangle size={20} color="#ef4444" />
                <Text className="mc-font" size="sm" c="red" style={{ fontSize: '11px' }}>WICHTIG:</Text>
              </Group>
              <Stack gap="xs">
                {[
                  ['Minecraft Version:', '1.21+ erforderlich'],
                  ['Java Edition', 'wird benötigt (nicht Bedrock!)'],
                  ['Whitelist aktiv:', 'Tritt Discord bei für Freischaltung'],
                ].map(([bold, rest]) => (
                  <Group key={bold} gap="xs">
                    <Text className="mc-font" c="red" style={{ fontSize: '10px' }}>•</Text>
                    <Text className="standard-font" size="xs" c="dimmed"><strong>{bold}</strong> {rest}</Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper className="mc-panel" p="lg" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '4px solid #3b82f6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), inset -4px -4px #1a1a1a, inset 4px 4px #555' }}>
            <Stack gap="md">
              <Group gap="xs">
                <IconPaw size={20} color="#3b82f6" />
                <Text className="mc-font" size="sm" c="blue" style={{ fontSize: '11px' }}>VOICE_PLUGIN:</Text>
              </Group>
              <Text className="standard-font" size="sm" c="dimmed">
                Lade dir noch das <strong>Ingame Voice Plugin</strong> runter!
              </Text>
              <Stack gap="xs">
                {['Öffne CurseForge', 'Klicke auf "Import"', 'Gib folgenden Code ein:'].map((step, i) => (
                  <Group key={i} gap="xs">
                    <Text className="mc-font" c="blue" style={{ fontSize: '10px' }}>{i + 1}.</Text>
                    <Text className="standard-font" size="xs" c="dimmed" dangerouslySetInnerHTML={{ __html: step }} />
                  </Group>
                ))}
              </Stack>
              <Paper p="md" style={{ background: 'rgba(234, 179, 8, 0.2)', border: '4px solid #eab308', boxShadow: '0 0 20px rgba(234, 179, 8, 0.4), inset -4px -4px #1a1a1a, inset 4px 4px #555', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => { copyToClipboard('1fVzzMey').then(() => { notifications.show({ title: 'Code kopiert!', message: '1fVzzMey wurde kopiert', color: 'yellow', autoClose: 2000 }); }); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Stack gap="xs" align="center">
                  <Text className="mc-font" size="xs" c="yellow" style={{ fontSize: '8px' }}>📋 KLICK ZUM KOPIEREN</Text>
                  <Text className="mc-font" style={{ fontSize: '24px', color: '#eab308', textShadow: '2px 2px #000', letterSpacing: '4px', userSelect: 'all' }}>
                    1fVzzMey
                  </Text>
                  <Badge color="yellow" size="sm" radius={0} className="mc-font" style={{ fontSize: '7px' }}>CURSEFORGE_CODE</Badge>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          <Group justify="center" gap="md" style={{ flexWrap: 'wrap' }}>
            <Button className="mc-nav-btn mc-font mc-nav-btn-server" leftSection={<IconCar size={18}/>}
              onClick={() => { copyToClipboard('mc.sd-rp.de').then(() => { notifications.show({ title: 'Erneut kopiert!', message: 'mc.sd-rp.de in Zwischenablage', color: 'green', autoClose: 2000 }); }); }}>
              ERNEUT KOPIEREN
            </Button>
            <Button className="mc-nav-btn mc-font mc-nav-btn-discord" leftSection={<IconBrandDiscord size={18}/>}
              component="a" href="https://discord.gg/PaPe5WA3kz" target="_blank">
              DISCORD
            </Button>
          </Group>
        </Stack>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;700&display=swap');
        
        html, body {
          margin: 0; padding: 0; min-height: 100vh;
          background-image: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5)), 
                            url('https://img1.wallspic.com/crops/6/7/2/8/2/128276/128276-black-creeper-darkness-animation-green-3840x2160.jpg') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-repeat: no-repeat !important;
          background-color: #000 !important;
        }
        #root, .mantine-AppShell-root, .mantine-AppShell-main { background: transparent !important; }
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
          display: flex; align-items: center;
          cursor: pointer; transition: all 0.2s;
        }
        .mc-nav-btn:hover { transform: translateY(-2px); }
        .mc-nav-btn.active { background: #388E3C !important; box-shadow: inset -4px -4px #1b5e20, inset 4px 4px #66bb6a !important; }
        .mc-nav-btn-discord { background: #5865F2; box-shadow: inset -4px -4px #3d46a8, inset 4px 4px #8a94ff !important; }
        .mc-nav-btn-server  { background: #22c55e; box-shadow: inset -4px -4px #16a34a, inset 4px 4px #4ade80 !important; }
        .timer-block { background: rgba(0,0,0,0.8); border: 3px solid #555; box-shadow: inset -2px -2px #222, inset 2px 2px #888; padding: 8px 12px; }
        .mc-panel { background: rgba(49, 49, 49, 0.9); border: 4px solid #000; box-shadow: inset -4px -4px #1a1a1a, inset 4px 4px #555; backdrop-filter: blur(5px); }
        .live-glow { border: 4px solid #388E3C !important; box-shadow: 0 0 15px rgba(56,142,60,0.5), inset -4px -4px #1a1a1a, inset 4px 4px #555 !important; }
        .pixel-border { border: 2px solid #000; image-rendering: pixelated; }
        .sd-card { background: rgba(22, 27, 34, 0.9); border: 1px solid #30363d; border-radius: 8px; }
        .sd-footer-box { background: linear-gradient(180deg, rgba(61,43,43,0.9) 0%, rgba(43,26,26,0.9) 100%); border: 1px solid #6e3636; border-radius: 10px; }
        .mantine-Burger-root { border: 4px solid #000 !important; background: #7c7c7c !important; box-shadow: inset -4px -4px #5a5a5a, inset 4px 4px #b8b8b8 !important; }
        @media (min-width: 992px) { .desktop-nav { display: flex !important; } .mobile-burger { display: none !important; } }
        @media (max-width: 991px) { .desktop-nav { display: none !important; } .mobile-burger { display: block !important; } .timer-block { font-size: 10px; padding: 6px 10px; } }
        @media (max-width: 768px) { .mantine-AppShell-header { height: auto !important; padding: 12px 0 !important; } }
      `}} />

      <AppShell header={{ height: { base: 80, md: 100 } }} padding="md"
        styles={{ main: { minHeight: '100vh', display: 'flex', flexDirection: 'column' } }}>
        <AppShell.Header withBorder={false}>
          <Container size="xl" h="100%">
            <Group h="100%" justify="space-between" wrap="nowrap" align="center">
              <Group gap="md" align="center" style={{ flex: 1 }}>
                <Stack gap="xs">
                  <Title order={3} className="mc-font" style={{ fontSize: '14px', color: '#48bb78', textShadow: '2px 2px #000', lineHeight: 1.3 }}>
                    Second Dimension<br/>
                    <Text span c="white" inherit style={{ fontSize: '9px' }}>MINECRAFT HARDCORE</Text>
                  </Title>
                </Stack>
                <Box className="timer-block" style={{ width: '200px' }}>
                  <Group gap="xs" wrap="nowrap">
                    <IconClock size={12} color="#f1e05a" />
                    <Stack gap={0}>
                      <Text className="mc-font" style={{ fontSize: '8px' }} c="dimmed">{timeLabel}</Text>
                      <Text className="mc-font" style={{ fontSize: '10px', color: '#f1e05a' }}>{timeValue}</Text>
                    </Stack>
                  </Group>
                </Box>
              </Group>

              {/* DESKTOP NAV */}
              <Group className="desktop-nav" gap="sm">
                <Button className={`mc-nav-btn mc-font ${currentPage === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('leaderboard')}
                  style={{ fontSize: '12px', height: '45px', padding: '0 12px', minWidth: '45px' }}
                  title="Bestenliste">
                  <IconSkull size={20}/>
                </Button>
                <Button className={`mc-nav-btn mc-font ${currentPage === 'home' ? 'active' : ''}`}
                  leftSection={<IconBroadcast size={16}/>}
                  onClick={() => setCurrentPage('home')}
                  style={{ fontSize: '12px', height: '45px', padding: '0 16px' }}>
                  LIVE
                </Button>
                <Button className={`mc-nav-btn mc-font ${currentPage === 'dashboard' ? 'active' : ''}`}
                  leftSection={<IconShield size={16}/>}
                  onClick={() => setCurrentPage('dashboard')}
                  style={{ fontSize: '12px', height: '45px', padding: '0 16px' }}>
                  STATS
                </Button>
                <Button className="mc-nav-btn mc-font mc-nav-btn-server"
                  leftSection={<IconCar size={16}/>}
                  onClick={() => { copyToClipboard('mc.sd-rp.de').then(() => setJoinModalOpened(true)); }}
                  style={{ fontSize: '12px', height: '45px', padding: '0 16px' }}>
                  JOIN SERVER
                </Button>
                <Button className="mc-nav-btn mc-font mc-nav-btn-discord"
                  leftSection={<IconBrandDiscord size={16}/>}
                  component="a" href="https://discord.gg/PaPe5WA3kz" target="_blank"
                  style={{ fontSize: '15px', height: '45px', padding: '0 16px' }}>
                  DISCORD
                </Button>
              </Group>

              <Burger className="mobile-burger" opened={drawerOpened} onClick={openDrawer} size="md" color="#fff" />
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {currentPage === 'leaderboard' ? (
            <LeaderboardPage />
          ) : currentPage === 'dashboard' ? (
            <PlayersPage />
          ) : (
            <Container size="xl" style={{ flex: 1 }}>
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
                                <Text className="mc-font" style={{ fontSize: '8px' }} c="white">{d.message}</Text>
                                <Text style={{ fontSize: '7px', color: '#aaa', fontFamily: 'Inter' }}>
                                  🗡️ Killer: {d.killer || 'Umwelt'} {d.weapon && d.weapon !== "Unbekannt" ? `(${d.weapon})` : ''} – 🕒 {new Date(d.timestamp).toLocaleTimeString()}
                                </Text>
                              </Stack>
                            </Group>
                            <Badge color={d.message?.includes("3/3") ? "red" : "green"} radius={0} size="xs" className="mc-font" style={{fontSize: '7px'}}>
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
                  <Box style={{ display: 'flex', gap: '15px', height: '60vh', alignItems: 'stretch', flexDirection: window.innerWidth < 992 ? 'column' : 'row' }}>
                    <Box className="mc-panel live-glow" style={{ flex: 1, background: '#000', padding: '4px' }}>
                      <iframe src={`https://player.twitch.tv/?channel=${selectedStream.user_login}&parent=${window.location.hostname}&autoplay=true&muted=true`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                    </Box>
                    <Box className="mc-panel" visibleFrom="lg" style={{ width: '340px', background: '#18181b', padding: '4px' }}>
                      <iframe src={`https://www.twitch.tv/embed/${selectedStream.user_login}/chat?parent=${window.location.hostname}&darkpopout`} style={{ width: '100%', height: '100%', border: 'none' }} />
                    </Box>
                  </Box>
                  <Paper className="mc-panel" p="md" mt="xs">
                    <Group justify="space-between" style={{ flexWrap: 'wrap' }}>
                      <Group>
                        <Avatar src={`https://minotar.net/avatar/${selectedStream.user_name}/48`} radius={0} className="pixel-border" />
                        <Stack gap={0}>
                          <Text fw={900} className="mc-font" size="sm" c="green">{selectedStream.user_name}</Text>
                          <Text size="xs" c="dimmed" style={{fontFamily: 'Inter'}}>{selectedStream.title}</Text>
                        </Stack>
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
                    <Group mb="md">
                      <ThemeIcon color="orange" variant="light" size="lg"><IconBroadcast size={20}/></ThemeIcon>
                      <Text className="mc-font" style={{fontSize: '12px'}}>Infos</Text>
                    </Group>
                    <Text size="xs" className="standard-font" c="#8b949e" component="div">
                      <div style={{ marginBottom: '10px' }}><strong>🟩 Minecraft Hardcore Event – Regeln & Infos</strong></div>
                      <div style={{ marginBottom: '10px' }}><strong>🔒 Zutritt nur über Whitelist</strong><br />Das Projekt kann ausschließlich über die Whitelist betreten werden.</div>
                      <div style={{ marginBottom: '10px' }}><strong>❤️ Leben-System</strong><br />Jeder Spieler startet mit 3 Leben.<br />Verliert ein Spieler sein drittes Leben, scheidet er aus dem aktiven Spiel aus und ist nur noch Zuschauer.</div>
                      <div style={{ marginBottom: '10px' }}><strong>⚔️ PvP-Regelung</strong><br />Das absichtliche Töten von Mitspielern ohne triftigen Grund ist nicht erlaubt.<br />(Regelverstöße können zu Strafen oder Ausschluss führen.)</div>
                      <div><strong>🎥 Streaming-Hinweis</strong><br />Wenn du das Event streamst, melde dich bitte im Discord, damit dein Stream auf der Projektseite angezeigt werden kann.</div>
                    </Text>
                  </Card>
                  <Card className="sd-card" p="xl">
                    <Group mb="md">
                      <ThemeIcon color="blue" variant="light" size="lg"><IconUsers size={20}/></ThemeIcon>
                      <Text className="mc-font" style={{fontSize: '12px'}}>Update</Text>
                    </Group>
                    <Text size="xs" className="standard-font" c="#8b949e" component="div">
                      <div style={{ marginBottom: '10px' }}><strong>🆙 Neue Updates & Änderungen</strong></div>
                      <div style={{ marginBottom: '10px' }}><strong>🏷️ [Hardcore] Name Tag</strong><br />Jeder Spieler mit mindestens einem Leben trägt jetzt den [Hardcore] Tag im Spiel. Dieser verschwindet dauerhaft nach dem ersten Permadeath.</div>
                      <div style={{ marginBottom: '10px' }}><strong>🔥 Die Hölle (Respawnsystem)</strong><br />Nach einem Permadeath wirst du in eine weit entfernte Hölle verbannt (20k+ Blöcke). Dort musst du Blöcke abbauen, um am Weltspawn wiederbelebt zu werden.<br /><em>Hinweis: Nach der Befreiung spielst du ohne Hardcore-Status und ohne Items normal weiter.</em></div>
                      <div style={{ marginBottom: '10px' }}><strong>📜 Log-Anpassungen</strong><br />Tode werden in den Logs nur noch dann als "Permadeath" angekündigt, wenn der Spieler tatsächlich seinen Hardcore-Status verliert. Reguläre Tode danach erscheinen normal.</div>
                      <div style={{ marginBottom: '10px' }}><strong>✨ Geplante Features</strong><br />• Spieler-Shops<br />• Erweiterte Bestenlisten & Statistiken auf der Webseite<br />• Dynmap-Integration (bei Bedarf)</div>
                    </Text>
                  </Card>
                </SimpleGrid>

                <Paper className="sd-footer-box" p={40}>
                  <Stack align="center" gap="md">
                    <Title className="mc-font" order={2} style={{ fontSize: '18px', textShadow: '2px 2px #000', textAlign: 'center' }}>
                      Bereit für Second Dimension?
                    </Title>
                    <Group mt="lg" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Button size="lg" className="mc-nav-btn mc-font mc-nav-btn-discord" component="a" href="https://discord.gg/PaPe5WA3kz" target="_blank">DISCORD</Button>
                      <Button size="lg" className="mc-nav-btn mc-font mc-nav-btn-server" leftSection={<IconCar size={18}/>}
                        onClick={() => { copyToClipboard('mc.sd-rp.de').then(() => setJoinModalOpened(true)); }}>
                        JOIN SERVER
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              </Box>
            </Container>
          )}
          
          {/* FOOTER */}
          <Box component="footer" style={{ marginTop: 'auto', borderTop: '4px solid #000', background: 'rgba(34, 34, 34, 0.95)', padding: '40px 0 20px 0' }}>
            <Container size="xl">
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" mb="xl">
                <Stack gap="sm">
                  <Text className="mc-font" style={{ fontSize: '10px', color: '#48bb78' }}>PROJEKT</Text>
                  <Stack gap="xs">
                    <Text className="standard-font" size="sm" c="dimmed">Second Dimension</Text>
                    <Text className="standard-font" size="xs" c="dimmed">Minecraft Hardcore Event</Text>
                  </Stack>
                </Stack>
                <Stack gap="sm">
                  <Text className="mc-font" style={{ fontSize: '10px', color: '#48bb78' }}>LINKS</Text>
                  <Stack gap="xs">
                    {[['https://discord.gg/PaPe5WA3kz', 'Discord Server'], ['https://twitch.tv', 'Twitch']].map(([href, label]) => (
                      <Text key={href} component="a" href={href} target="_blank" className="standard-font" size="sm" c="dimmed"
                        style={{ textDecoration: 'none', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.target.style.color = '#48bb78'}
                        onMouseLeave={(e) => e.target.style.color = ''}>{label}</Text>
                    ))}
                  </Stack>
                </Stack>
                <Stack gap="sm">
                  <Text className="mc-font" style={{ fontSize: '10px', color: '#48bb78' }}>SERVER</Text>
                  <Stack gap="xs">
                    <Text className="standard-font" size="sm" c="dimmed">IP: mc.sd-rp.de</Text>
                    <Text className="standard-font" size="xs" c="dimmed">Version: 1.21+</Text>
                  </Stack>
                </Stack>
                <Stack gap="sm">
                  <Text className="mc-font" style={{ fontSize: '10px', color: '#48bb78' }}>RECHTLICHES</Text>
                  <Stack gap="xs">
                    <Text component="a" href="https://second-dimension.de/impressum/" target="_blank" className="standard-font" size="sm" c="dimmed"
                      style={{ textDecoration: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.target.style.color = '#48bb78'}
                      onMouseLeave={(e) => e.target.style.color = ''}>Impressum</Text>
                  </Stack>
                </Stack>
              </SimpleGrid>
              <Divider my="xl" />
              <Group justify="space-between" align="center" style={{ flexWrap: 'wrap' }}>
                <Text className="standard-font" size="xs" c="dimmed">© {new Date().getFullYear()} Second Dimension. Alle Rechte vorbehalten.</Text>
                <Text className="standard-font" size="xs" c="dimmed">Minecraft ist eine Marke von Mojang AB.</Text>
              </Group>
            </Container>
          </Box>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
