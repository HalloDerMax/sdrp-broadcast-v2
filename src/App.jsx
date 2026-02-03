import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MantineProvider, AppShell, Container, Title, Group, Badge, Card, SimpleGrid, 
  Text, Button, Stack, Avatar, Image, Modal, ActionIcon, Paper, Box, 
  createTheme, ScrollArea, TextInput, PasswordInput, ThemeIcon, Divider
} from '@mantine/core';
import { 
  IconBrandDiscord, IconUsers, IconBroadcast, IconCircleFilled, IconCar, IconAlertTriangle, IconPaw, IconClock, IconSkull
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

function App() {
  const [streams, setStreams] = useState([]);
  const [allStreamerData, setAllStreamerData] = useState([]);
  const [deathHistory, setDeathHistory] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [timeLabel, setTimeLabel] = useState('');
  const [timeValue, setTimeValue] = useState('');

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
        axios.get(`${API_BASE}/api/deathbroadcast/stats`).catch(() => ({ data: [] })) // Korrigierter Pfad
      ]);

      const liveStreams = sRes.data.streams || [];
      setStreams(liveStreams);
      setAllStreamerData(mRes.data.streamers || []);
      
      // Flexibles Mapping für die Todes-Daten
      const deaths = Array.isArray(dRes.data) ? dRes.data : (dRes.data.deaths || []);
      setDeathHistory(deaths);

      if (liveStreams.length > 0 && !selectedStream) setSelectedStream(liveStreams[0]);
    } catch (e) { 
        console.error("API Fehler:", e); 
    }
  }, [selectedStream]);

  useEffect(() => {
    fetchData();
    // Intervall auf 30 Sekunden erhöht, um Twitch "Too Many Requests" zu vermeiden
    const interval = setInterval(fetchData, 30000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  const liveLogins = useMemo(() => streams.map(s => s.user_login.toLowerCase()), [streams]);
  const offlineStreamers = useMemo(() => 
    allStreamerData.filter(s => !liveLogins.includes(s.login.toLowerCase())), 
  [allStreamerData, liveLogins]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" />
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;700&display=swap');
        
        html, body {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          background-image: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), 
                            url('https://image-5.uhdpaper.com/wallpaper/minecraft-movie-creeper-4k-wallpaper-uhdpaper.com-231@5@e.jpg') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-repeat: no-repeat !important;
          background-color: #000 !important;
        }

        #root, .mantine-AppShell-root, .mantine-AppShell-main { background: transparent !important; }
        .mantine-AppShell-header { background: rgba(34, 34, 34, 0.85) !important; border-bottom: 6px solid #000 !important; backdrop-filter: blur(10px); }
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
        }

        .mc-nav-btn-discord { background: #5865F2; box-shadow: inset -4px -4px #3d46a8, inset 4px 4px #8a94ff !important; }
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
            <Group justify="space-between" h="100%" wrap="nowrap">
              <Group gap="xl">
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

              <Group gap="lg">
                <Button className="mc-nav-btn mc-font" leftSection={<IconBroadcast size={18}/>} component="a" href="#live-section">LIVE</Button>
                <Button className="mc-nav-btn mc-font" leftSection={<IconUsers size={18}/>} component="a" href="#streamer-section">STREAMER</Button>
                <ActionIcon className="mc-nav-btn mc-nav-btn-discord" size="xl" component="a" href="https://discord.gg/sdrp" target="_blank"><IconBrandDiscord size={24}/></ActionIcon>
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Container size="xl">
            <Box mb={30} mt={10}>
              <Group mb="xs">
                <IconSkull size={18} color="red" />
                <Text className="mc-font" style={{ fontSize: '10px', color: '#ff4d4d', textShadow: '1px 1px #000' }}>Death_LOG (RECENT_DEATHS)</Text>
              </Group>
              <Paper className="mc-panel" p="xs">
                <ScrollArea h={100} offsetScrollbars>
                  <Stack gap={5}>
                    {deathHistory.length > 0 ? deathHistory.map((d, i) => (
                      <Group key={i} justify="space-between" px="md" py={4} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Group gap="sm">
                          <Avatar src={`https://minotar.net/avatar/${d.player || d.username || 'Steve'}/24`} radius={0} className="pixel-border" size="sm" />
                          <Text className="mc-font" style={{ fontSize: '8px' }} c="white">{d.player || d.username}</Text>
                        </Group>
                        <Text className="standard-font" size="xs" c="orange" italic>{d.cause || d.reason || 'Unbekannte Ursache'}</Text>
                      </Group>
                    )) : (
                      <Text className="mc-font" size="xs" c="dimmed" p="sm" ta="center" style={{fontSize: '8px'}}>NO_RECENT_DEATHS_DETECTED</Text>
                    )}
                  </Stack>
                </ScrollArea>
              </Paper>
            </Box>

            {selectedStream && (
              <Box mb={50} id="live-section">
                <Box style={{ display: 'flex', gap: '15px', height: '60vh', alignItems: 'stretch' }}>
                  <Box className="mc-panel live-glow" style={{ flex: 1, background: '#000', padding: '4px' }}>
                    {/* muted=true hinzugefügt für besseren Autoplay-Support */}
                    <iframe 
                      src={`https://player.twitch.tv/?channel=${selectedStream.user_login}&parent=${window.location.hostname}&autoplay=true&muted=true`} 
                      style={{ width: '100%', height: '100%', border: 'none' }} 
                      allowFullScreen 
                    />
                  </Box>
                  <Box className="mc-panel" visibleFrom="lg" style={{ width: '340px', background: '#18181b', padding: '4px' }}>
                    <iframe src={`https://www.twitch.tv/embed/${selectedStream.user_login}/chat?parent=${window.location.hostname}&darkpopout`} style={{ width: '100%', height: '100%', border: 'none' }} />
                  </Box>
                </Box>
                <Paper className="mc-panel" p="md" mt="xs">
                  <Group justify="space-between">
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

            {/* Restlicher Content (Live Streamers, Offline Database, Event Infos) bleibt gleich */}
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
                    <Text className="mc-font" style={{ fontSize: '7px' }} ta="center" truncate w="100%">{os.display_name}</Text>
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
                  <Group mb="md"><ThemeIcon color="orange" variant="light" size="lg"><IconBroadcast size={20}/></ThemeIcon><Text className="mc-font" style={{fontSize: '12px'}}>Hardcore</Text></Group>
                  <Text size="xs" className="standard-font" c="#8b949e">Jeder Spieler hat 3 Leben! Verliert ein Spieler sein drittes Leben, wird er aus dem Spiel entfernt.</Text>
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
                    <Button size="lg" className="mc-nav-btn mc-font mc-nav-btn-discord" component="a" href="https://discord.gg/sdrp" target="_blank">DISCORD</Button>
                    <Button size="lg" className="mc-nav-btn mc-font" style={{background: '#388E3C'}}>BEITRETEN</Button>
                  </Group>
                </Stack>
              </Paper>
            </Box>
          </Container>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
