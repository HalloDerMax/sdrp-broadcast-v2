import { useState, useEffect, useCallback } from 'react';
import { 
  MantineProvider, AppShell, Container, Title, Group, Badge, Card, SimpleGrid, 
  Text, Button, Stack, Avatar, Modal, Box, 
  createTheme, Paper, Divider, Burger
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconBrandDiscord, IconUsers, IconTrophy, IconClock, IconHeart, 
  IconHeartBroken, IconSword, IconSkull, IconMedal, IconCrown, IconFlame
} from '@tabler/icons-react';
import axios from 'axios';
import { notifications, Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// ============================================
// CONFIG & THEME
// ============================================
const API_BASE = 'https://sdrp-broadcast.onrender.com';

const theme = createTheme({
  primaryColor: 'green',
  fontFamily: '"Press Start 2P", cursive',
  defaultRadius: 0,
});

// ============================================
// HELPERS
// ============================================
const parsePlaytimeToMinutes = (playtime) => {
  if (!playtime) return 0;
  let totalMinutes = 0;
  const hourMatch = playtime.match(/(\d+)h/);
  const minMatch = playtime.match(/(\d+)m/);
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1]);
  return totalMinutes;
};

const getRankColor = (rank) => {
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  return '#71717a';
};

// ============================================
// LEADERBOARD PAGE
// ============================================
function LeaderboardPage({ players, isRefreshing, lastUpdate }) {
  const rankedPlayers = [...players].sort((a, b) => {
    const aMins = parsePlaytimeToMinutes(a.playTime);
    const bMins = parsePlaytimeToMinutes(b.playTime);
    if (bMins !== aMins) return bMins - aMins;
    return b.lives - a.lives;
  });

  const stats = {
    topPlayer: rankedPlayers[0]?.username || 'N/A',
    mostKills: [...players].sort((a, b) => b.kills - a.kills)[0],
    avgLives: players.length > 0 ? (players.reduce((sum, p) => sum + p.lives, 0) / players.length).toFixed(1) : 0,
  };

  return (
    <Container size="xl" py="xl">
      <Group mb="xl" justify="space-between">
        <Group>
          <IconTrophy size={32} color="#ffd700" />
          <Title className="mc-font" style={{ fontSize: '18px' }}>BESTENLISTE</Title>
        </Group>
        <Paper className="mc-panel" p="xs" px="md">
          <Text className="mc-font" size="xs" style={{fontSize: '7px'}}>
            {isRefreshing ? 'LÄDT...' : `UPDATE: ${lastUpdate.toLocaleTimeString()}`}
          </Text>
        </Paper>
      </Group>

      {/* Podium & Liste */}
      <Stack gap="sm">
        {rankedPlayers.map((player, index) => (
          <Card key={player.id} className="mc-panel" padding="md" style={{ opacity: player.lives === 0 ? 0.6 : 1 }}>
            <Group justify="space-between">
              <Group gap="md">
                <Text className="mc-font" style={{ width: 40 }}>#{index + 1}</Text>
                <Avatar src={`https://minotar.net/avatar/${player.username}/60`} radius={0} className="pixel-border" />
                <Stack gap={2}>
                  <Text className="mc-font" style={{ fontSize: '12px' }}>{player.username}</Text>
                  <Group gap="xs">
                    <IconHeart size={12} color="red" fill="red" />
                    <Text size="xs">{player.lives}/3 Leben</Text>
                  </Group>
                </Stack>
              </Group>
              <Paper p="xs" className="mc-panel" style={{ background: 'rgba(0,0,0,0.2)', minWidth: 100 }}>
                <Stack gap={0} align="center">
                  <Text className="mc-font" style={{ fontSize: '8px' }}>SPIELZEIT</Text>
                  <Text className="mc-font" style={{ fontSize: '10px' }}>{player.playTime}</Text>
                </Stack>
              </Paper>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}

// ============================================
// PLAYERS PAGE (WITH MODAL)
// ============================================
function PlayersPage({ players, isRefreshing }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    open();
  };

  return (
    <Container size="xl" py="xl">
      <Title className="mc-font" order={3} mb="xl">SPIELER STATUS</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {players.map((player) => (
          <Card 
            key={player.id} 
            className="mc-panel" 
            p="lg" 
            onClick={() => handlePlayerClick(player)}
            style={{ cursor: 'pointer' }}
          >
            <Stack align="center">
              <Avatar src={`https://minotar.net/avatar/${player.username}/100`} size={100} radius={0} className="pixel-border" />
              <Text className="mc-font" style={{ fontSize: '12px' }}>{player.username}</Text>
              <Group gap={5}>
                {[...Array(3)].map((_, i) => (
                  <IconHeart key={i} size={20} fill={i < player.lives ? "red" : "none"} color={i < player.lives ? "red" : "#444"} />
                ))}
              </Group>
              <Badge color={player.status === 'online' ? 'green' : 'gray'}>{player.status.toUpperCase()}</Badge>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      {/* Detail Modal */}
      <Modal opened={opened} onClose={close} title="SPIELER DETAILS" centered className="mc-font">
        {selectedPlayer && (
          <Stack align="center" p="md">
            <Avatar src={`https://minotar.net/avatar/${selectedPlayer.username}/120`} size={120} radius={0} className="pixel-border" />
            <Title order={3}>{selectedPlayer.username}</Title>
            <Divider w="100%" />
            <SimpleGrid cols={2} w="100%">
              <Box>
                <Text size="xs" c="dimmed">KILLS</Text>
                <Text className="mc-font" c="red">{selectedPlayer.kills}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">TODE</Text>
                <Text className="mc-font">{selectedPlayer.deaths}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">SPIELZEIT</Text>
                <Text className="mc-font" c="blue">{selectedPlayer.playTime}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">LEBEN</Text>
                <Text className="mc-font" c="green">{selectedPlayer.lives}/3</Text>
              </Box>
            </SimpleGrid>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [players, setPlayers] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [opened, { toggle }] = useDisclosure();

  const fetchPlayers = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_BASE}/api/minecraft/players`);
      setPlayers(response.data.players || []);
      setLastUpdate(new Date());
    } catch (error) {
      notifications.show({ title: 'Fehler', message: 'Backend nicht erreichbar', color: 'red' });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 30000);
    return () => clearInterval(interval);
  }, [fetchPlayers]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .mc-font { font-family: 'Press Start 2P', cursive !important; }
        .mc-panel { 
          background: #2c2c2c !important; 
          border: 4px solid !important;
          border-color: #555 #1a1a1a #1a1a1a #555 !important;
          image-rendering: pixelated;
        }
        .pixel-border { border: 4px solid #000; image-rendering: pixelated; }
      `}</style>

      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header p="md" className="mc-panel">
          <Group justify="space-between">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text className="mc-font" style={{ fontSize: '12px' }}>SDRP NETWORK</Text>
            <Badge color="green" variant="dot">LIVE</Badge>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md" className="mc-panel">
          <Stack>
            <Button 
              variant={activeTab === 'leaderboard' ? 'filled' : 'subtle'} 
              onClick={() => { setActiveTab('leaderboard'); if(opened) toggle(); }}
              leftSection={<IconTrophy size={18} />}
              className="mc-font" style={{ fontSize: '8px' }} color="green"
            >
              LEADERBOARD
            </Button>
            <Button 
              variant={activeTab === 'players' ? 'filled' : 'subtle'} 
              onClick={() => { setActiveTab('players'); if(opened) toggle(); }}
              leftSection={<IconUsers size={18} />}
              className="mc-font" style={{ fontSize: '8px' }} color="green"
            >
              SPIELER
            </Button>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main style={{ background: '#121212' }}>
          {activeTab === 'leaderboard' ? (
            <LeaderboardPage players={players} isRefreshing={isRefreshing} lastUpdate={lastUpdate} />
          ) : (
            <PlayersPage players={players} isRefreshing={isRefreshing} />
          )}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
