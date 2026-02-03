import { useState, useEffect, useCallback } from 'react';
import { 
  MantineProvider, AppShell, Container, Title, Group, Badge, Card, SimpleGrid, 
  Text, Button, Stack, Avatar, Image, Modal, ActionIcon, Paper, Box, 
  createTheme, rem, ThemeIcon, ScrollArea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconSkull, IconDeviceTv, IconChartBar, IconBrandDiscord, IconPlayerPlay, 
  IconBell, IconTrash, IconCircleFilled, IconHome, IconStars, IconCheck, 
  IconHammer, IconX, IconEye
} from '@tabler/icons-react';
import axios from 'axios';

import '@mantine/core/styles.css';

const API_BASE = 'https://sdrp-broadcast.onrender.com';

const theme = createTheme({
  primaryColor: 'orange',
  fontFamily: 'Inter, sans-serif',
});

function App() {
  const [streams, setStreams] = useState([]);
  const [deathHistory, setDeathHistory] = useState([]);
  const [streamerData, setStreamerData] = useState([]);
  const [serverStatus, setServerStatus] = useState({ players: 0, maxPlayers: 0, status: 'Offline' });
  
  const [deathModalOpened, { open: openDeaths, close: closeDeaths }] = useDisclosure(false);
  const [selectedStream, setSelectedStream] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, dRes, mRes, stRes] = await Promise.all([
        axios.get(`${API_BASE}/api/twitch/streams`).catch(() => ({ data: { streams: [] } })),
        axios.get(`${API_BASE}/api/minecraft/death-history`).catch(() => ({ data: { deaths: [] } })),
        axios.get(`${API_BASE}/api/twitch/streamer-data`).catch(() => ({ data: { streamers: [] } })),
        axios.get(`${API_BASE}/api/fivem/status`).catch(() => ({ data: { status: 'Offline' } }))
      ]);
      
      const liveStreams = sRes.data.streams || [];
      
      // LOGIK-FIX: Wir gleichen die Streamer-Liste mit den ECHT-Live Daten ab
      const enriched = (mRes.data.streamers || []).map(s => {
        const liveInfo = liveStreams.find(ls => ls.user_login.toLowerCase() === s.login.toLowerCase());
        return {
          ...s,
          is_actually_live: !!liveInfo,
          current_viewers: liveInfo ? liveInfo.viewer_count : 0,
          current_title: liveInfo ? liveInfo.title : ''
        };
      });

      setStreams(liveStreams);
      setDeathHistory(dRes.data.deaths || []);
      setStreamerData(enriched);
      setServerStatus(stRes.data);
    } catch (e) {
      console.error("Datenabfrage fehlgeschlagen", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getTwitchParent = () => window.location.hostname;

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <style dangerouslySetInnerHTML={{ __html: `
        body { background-color: #0b0e14 !important; color: #e6edf3; margin: 0; font-family: 'Inter', sans-serif; }
        .mantine-AppShell-main { background: radial-gradient(circle at top, #161b22 0%, #0b0e14 100%) !important; }
        .pulse { animation: pulse-red 2s infinite; }
        @keyframes pulse-red { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}} />

      <AppShell padding="md">
        <Container size="xl" pt="xl">
          
          {/* --- HEADER --- */}
          <Group justify="space-between" mb={40}>
            <Stack gap={0}>
              <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>
                SD-RP <Text span c="orange">Broadcast</Text>
              </Title>
              <Text size="xs" c="dimmed">Deine Community Live & In Action</Text>
            </Stack>

            <Group gap="md">
              <Paper p="xs" px="md" bg="#161b22" withBorder>
                <Group gap="xs">
                  <IconCircleFilled size={10} color={streams.length > 0 ? "red" : "gray"} className={streams.length > 0 ? "pulse" : ""} />
                  <Stack gap={0}><Text size="10px" c="dimmed" fw={700}>LIVE STREAMS</Text><Text fw={900} size="sm">{streams.length}</Text></Stack>
                </Group>
              </Paper>
              <Paper p="xs" px="md" bg="#161b22" withBorder>
                <Group gap="xs">
                  <IconCircleFilled size={10} color="#3b82f6" />
                  <Stack gap={0}><Text size="10px" c="dimmed" fw={700}>ZUSCHAUER</Text><Text fw={900} size="sm">{streams.reduce((a,b) => a + b.viewer_count, 0)}</Text></Stack>
                </Group>
              </Paper>
              
              <Group ml="md">
                <Button variant="filled" color="blue" leftSection={<IconChartBar size={16}/>}>Stats</Button>
                <Button variant="filled" color="orange" leftSection={<IconDeviceTv size={16}/>} onClick={() => streams[0] && setSelectedStream(streams[0])}>Theater Mode</Button>
                <Button variant="filled" color="red" leftSection={<IconSkull size={16}/>} onClick={openDeaths}>Deaths 💀</Button>
                <Button variant="filled" color="indigo" leftSection={<IconBrandDiscord size={16}/>} component="a" href="https://discord.gg/sdrp" target="_blank">Community</Button>
              </Group>
            </Group>
          </Group>

          {/* --- DEATH FEED --- */}
          <Paper p="xl" mb={40} bg="#161b22" style={{ border: '1px solid #30363d' }}>
            <Group justify="space-between" mb="xl">
               <Group><IconSkull color="orange" /><Title order={4}>Death Feed •</Title></Group>
               <Group>
                 <Badge color="red" variant="light" className="pulse">Live</Badge>
                 <Button size="xs" color="orange" variant="light" onClick={() => fetchData()}>Refresh</Button>
               </Group>
            </Group>
            <Stack gap="xs">
              {deathHistory.length > 0 ? deathHistory.slice(0, 3).map((d, i) => (
                <Paper key={i} p="sm" bg="rgba(255,69,0,0.05)" style={{ borderLeft: '3px solid #ff4500' }}>
                  <Group justify="space-between">
                    <Text size="sm"><b>{d.player}</b> wurde getötet von <Text span c="orange" fw={700}>{d.cause}</Text></Text>
                    <Text size="xs" c="dimmed">vor kurzem</Text>
                  </Group>
                </Paper>
              )) : <Text c="dimmed" ta="center" size="sm">Warte auf Daten...</Text>}
            </Stack>
          </Paper>

          {/* --- AKTUELL LIVE (GRID) --- */}
          <Title order={3} mb="lg" style={{ borderLeft: '3px solid orange', paddingLeft: '10px' }}>Aktuelle Live-Streams</Title>
          {streams.length > 0 ? (
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mb={50}>
              {streams.map(ls => (
                <Card key={ls.id} p={0} bg="#161b22" withBorder style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelectedStream(ls)}>
                  <Box pos="relative">
                    <Image src={ls.thumbnail_url.replace('{width}x{height}', '440x248')} alt={ls.user_name} />
                    <Badge pos="absolute" top={10} left={10} color="red">LIVE</Badge>
                  </Box>
                  <Box p="md">
                    <Text fw={700} size="sm" lineClamp={1}>{ls.title}</Text>
                    <Group justify="space-between" mt="xs">
                      <Group gap="xs">
                        <Avatar size="xs" color="orange">{ls.user_name[0]}</Avatar>
                        <Text size="xs" c="dimmed">{ls.user_name}</Text>
                      </Group>
                      <Badge variant="dot" color="blue" size="sm">{ls.viewer_count} Zuschauer</Badge>
                    </Group>
                  </Box>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <Paper p={60} mb={50} bg="transparent" style={{ border: '1px dashed #30363d', textAlign: 'center' }}>
              <Stack align="center" gap="xs">
                <IconDeviceTv size={48} style={{ opacity: 0.2 }} />
                <Text size="lg" fw={700}>Keine Streams gefunden</Text>
                <Text size="sm" c="dimmed">Zurzeit sind keine Streams der festgelegten Kanäle aktiv.</Text>
              </Stack>
            </Paper>
          )}

          {/* --- UNSERE STREAMER (CARDS) --- */}
          <Title order={3} mb="lg" style={{ borderLeft: '3px solid orange', paddingLeft: '10px' }}>Unsere Streamer</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb={50}>
            {streamerData.map((s, i) => (
              <Card key={i} bg="#161b22" withBorder shadow="md">
                <Group mb="md" justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <Avatar src={s.profile_image_url} radius="md" size="lg" style={{ border: s.is_actually_live ? '2px solid #ff4500' : '1px solid #30363d' }} />
                    <Stack gap={0} style={{ overflow: 'hidden' }}>
                      <Text fw={800} size="sm" truncate>{s.display_name}</Text>
                      <Text size="xs" c={s.is_actually_live ? "red" : "dimmed"} fw={s.is_actually_live ? 700 : 400}>
                        {s.is_actually_live ? "ONLINE" : "Offline"}
                      </Text>
                    </Stack>
                  </Group>
                  <ActionIcon variant="light" color={s.is_actually_live ? "red" : "green"} radius="md"><IconBell size={18}/></ActionIcon>
                </Group>
                
                <Group grow gap="xs" mb="md">
                   <Box bg="#0b0e14" p="xs" style={{ borderRadius: '6px', textAlign: 'center', border: '1px solid #1c2128' }}>
                      <Text size="10px" c="dimmed" fw={700} tt="uppercase">Follower</Text>
                      <Text size="xs" fw={900} c="blue">{s.follower_count?.toLocaleString() || '0'}</Text>
                   </Box>
                   <Box bg="#0b0e14" p="xs" style={{ borderRadius: '6px', textAlign: 'center', border: '1px solid #1c2128' }}>
                      <Text size="10px" c="dimmed" fw={700} tt="uppercase">Status</Text>
                      <Text size="xs" fw={900} c={s.is_actually_live ? "green" : "dimmed"}>
                        {s.is_actually_live ? "LIVE" : "OFFLINE"}
                      </Text>
                   </Box>
                </Group>
                
                <Button 
                  fullWidth 
                  variant="filled" 
                  color="violet" 
                  leftSection={<IconPlayerPlay size={14} />}
                  component="a" 
                  href={`https://twitch.tv/${s.login}`} 
                  target="_blank"
                >
                  Twitch
                </Button>
              </Card>
            ))}
          </SimpleGrid>

        </Container>

        {/* --- TWITCH PLAYER MODAL --- */}
        <Modal 
          opened={!!selectedStream} 
          onClose={() => setSelectedStream(null)} 
          size="85%" 
          centered 
          padding={0} 
          withCloseButton={false}
          styles={{ content: { backgroundColor: 'black', overflow: 'hidden' }}}
        >
          {selectedStream && (
            <Box style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <ActionIcon 
                onClick={() => setSelectedStream(null)} 
                style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000 }} 
                color="red" 
                variant="filled" 
                size="lg"
              >
                <IconX size={20} />
              </ActionIcon>
              <iframe 
                src={`https://player.twitch.tv/?channel=${selectedStream.user_login}&parent=${getTwitchParent()}&autoplay=true`} 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                frameBorder="0" 
                allowFullScreen 
              />
            </Box>
          )}
        </Modal>

        {/* --- DEATH LIST MODAL --- */}
        <Modal opened={deathModalOpened} onClose={closeDeaths} title="Vollständiges Killboard" size="md">
          <ScrollArea h={400}>
            <Stack gap="xs">
              {deathHistory.map((d, i) => (
                <Paper key={i} p="sm" withBorder bg="#161b22"><Text size="sm"><b>{d.player}</b>: {d.message}</Text></Paper>
              ))}
            </Stack>
          </ScrollArea>
        </Modal>

      </AppShell>
    </MantineProvider>
  );
}

export default App;