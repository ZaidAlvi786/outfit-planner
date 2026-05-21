'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Button,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import ManIcon from '@mui/icons-material/Man';
import WomanIcon from '@mui/icons-material/Woman';
import BoyIcon from '@mui/icons-material/Boy';
import GirlIcon from '@mui/icons-material/Girl';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { supabase } from '@/services/supabase';
import HairStyleDetailModal, { HairStyle as HairStyleType } from '@/components/HairStyleDetailModal';
import UploadFacePhotoModal from '@/components/UploadFacePhotoModal';

type Gender = 'Men' | 'Women' | 'Boys' | 'Girls';

type HairStyle = HairStyleType & { gender: Gender };

const GENDERS: { key: Gender; label: string; icon: React.ReactNode; image: string; tint: string }[] = [
  {
    key: 'Men',
    label: 'Men',
    icon: <ManIcon sx={{ fontSize: 48 }} />,
    image: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1200&q=80',
    tint: 'linear-gradient(135deg, rgba(79,70,229,0.5), rgba(0,242,254,0.3))',
  },
  {
    key: 'Women',
    label: 'Women',
    icon: <WomanIcon sx={{ fontSize: 48 }} />,
    image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=1200&q=80',
    tint: 'linear-gradient(135deg, rgba(244,114,182,0.5), rgba(192,132,252,0.3))',
  },
  {
    key: 'Boys',
    label: 'Boys',
    icon: <BoyIcon sx={{ fontSize: 48 }} />,
    image: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=1200&q=80',
    tint: 'linear-gradient(135deg, rgba(56,189,248,0.5), rgba(79,70,229,0.3))',
  },
  {
    key: 'Girls',
    label: 'Girls',
    icon: <GirlIcon sx={{ fontSize: 48 }} />,
    image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=1200&q=80',
    tint: 'linear-gradient(135deg, rgba(251,191,36,0.5), rgba(244,114,182,0.3))',
  },
];

export default function HairStylesPage() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [styles, setStyles] = useState<HairStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairStyle | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [faceModalOpen, setFaceModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      try {
        const res = await fetch(`http://localhost:8000/api/v1/user/profile/${session.user.id}`);
        if (res.ok) {
          const profile = await res.json();
          if (profile?.face_photo_url) setFaceUrl(profile.face_photo_url);
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (!gender) return;
    let active = true;
    setLoading(true);
    setError(null);
    setActiveTag(null);

    fetch(`http://localhost:8000/api/v1/hair-styles/?gender=${encodeURIComponent(gender)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed to load styles');
        return res.json();
      })
      .then((data: HairStyle[]) => {
        if (!active) return;
        setStyles(data);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || 'Could not load hair styles');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gender]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    styles.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [styles]);

  const filtered = useMemo(() => {
    if (!activeTag) return styles;
    return styles.filter((s) => s.tags?.includes(activeTag));
  }, [styles, activeTag]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#050505',
        color: 'white',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(244, 114, 182, 0.12), transparent 55%)',
        pt: 8,
        pb: 10,
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            mb: 1,
            background: 'linear-gradient(45deg, #fff, #a5a5a5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
          }}
        >
          Hair Style Lookbook
        </Typography>
        <Typography variant="h6" sx={{ color: '#888', mb: 6, textAlign: 'center', fontWeight: 300 }}>
          {gender ? `Curated ${gender.toLowerCase()}'s styles` : 'Pick who you are styling for'}
        </Typography>

        {!gender && (
          <Grid container spacing={4} justifyContent="center">
            {GENDERS.map((g) => (
              <Grid item xs={12} sm={6} md={4} key={g.key}>
                <Card
                  onClick={() => setGender(g.key)}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: 4,
                    overflow: 'hidden',
                    height: 360,
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 25px 50px -15px rgba(0,0,0,0.8)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    image={g.image}
                    alt={g.label}
                    sx={{ height: '100%', objectFit: 'cover' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: g.tint,
                      mixBlendMode: 'overlay',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(5,5,5,0.95) 10%, rgba(5,5,5,0) 60%)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 24,
                      left: 24,
                      right: 24,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {g.icon}
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 900 }}>
                        {g.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Explore styles
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {gender && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Button
                onClick={() => {
                  setGender(null);
                  setStyles([]);
                }}
                startIcon={<ArrowBackIcon />}
                sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none', '&:hover': { color: 'white' } }}
              >
                Change
              </Button>
              <Stack direction="row" spacing={2} alignItems="center">
                {userId && !faceUrl && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    onClick={() => setFaceModalOpen(true)}
                    sx={{
                      color: '#f472b6',
                      borderColor: 'rgba(244,114,182,0.3)',
                      textTransform: 'none',
                      '&:hover': { borderColor: '#f472b6', bgcolor: 'rgba(244,114,182,0.05)' },
                    }}
                  >
                    Upload headshot to try styles on
                  </Button>
                )}
                {faceUrl && (
                  <Box
                    onClick={() => setFaceModalOpen(true)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                    title="Change headshot"
                  >
                    <Box
                      component="img"
                      src={faceUrl}
                      sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(244,114,182,0.4)' }}
                    />
                    <Typography variant="caption" sx={{ color: '#888' }}>Ready to try on</Typography>
                  </Box>
                )}
                <Typography variant="overline" sx={{ color: '#888', letterSpacing: 2 }}>
                  {filtered.length} style{filtered.length === 1 ? '' : 's'}
                </Typography>
              </Stack>
            </Box>

            {allTags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
                <Chip
                  label="All"
                  onClick={() => setActiveTag(null)}
                  sx={{
                    bgcolor: !activeTag ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.04)',
                    color: !activeTag ? '#00f2fe' : 'rgba(255,255,255,0.7)',
                    border: `1px solid ${!activeTag ? 'rgba(0,242,254,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    '&:hover': { bgcolor: 'rgba(0,242,254,0.1)' },
                  }}
                />
                {allTags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                    sx={{
                      bgcolor: activeTag === t ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.04)',
                      color: activeTag === t ? '#00f2fe' : 'rgba(255,255,255,0.7)',
                      border: `1px solid ${activeTag === t ? 'rgba(0,242,254,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      '&:hover': { bgcolor: 'rgba(0,242,254,0.1)' },
                    }}
                  />
                ))}
              </Stack>
            )}

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress sx={{ color: '#00f2fe' }} />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(244,67,54,0.08)', color: '#ffb4ab', border: '1px solid rgba(244,67,54,0.3)' }}>
                {error}
              </Alert>
            )}

            {!loading && !error && (
              <Grid container spacing={3}>
                {filtered.map((s) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={s.id || s.name}>
                    <Card
                      onClick={() => setSelectedStyle(s)}
                      sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, border 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          border: '1px solid rgba(244,114,182,0.3)',
                          boxShadow: '0 20px 40px -20px rgba(244,114,182,0.4)',
                        },
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          image={s.thumb_url || s.image_url}
                          alt={s.name}
                          sx={{ height: 260, objectFit: 'cover' }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            px: 1.2,
                            py: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <AutoFixHighIcon sx={{ fontSize: 14, color: '#f472b6' }} />
                          <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                            Try on me
                          </Typography>
                        </Box>
                      </Box>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white', mb: 0.5 }}>
                          {s.name}
                        </Typography>
                        {s.description && (
                          <Typography variant="body2" sx={{ color: '#888', mb: 1.5 }}>
                            {s.description}
                          </Typography>
                        )}
                        {s.tags && s.tags.length > 0 && (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {s.tags.map((t) => (
                              <Chip
                                key={t}
                                label={t}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  bgcolor: 'rgba(0,242,254,0.08)',
                                  color: '#00f2fe',
                                  border: '1px solid rgba(0,242,254,0.15)',
                                }}
                              />
                            ))}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {!loading && !error && filtered.length === 0 && (
              <Typography sx={{ color: '#888', textAlign: 'center', py: 8 }}>
                No styles match that filter.
              </Typography>
            )}
          </>
        )}
      </Container>

      <HairStyleDetailModal
        open={!!selectedStyle}
        onClose={() => setSelectedStyle(null)}
        style={selectedStyle}
        faceUrl={faceUrl}
        onRequestFaceUpload={() => {
          setSelectedStyle(null);
          setFaceModalOpen(true);
        }}
      />

      {userId && (
        <UploadFacePhotoModal
          open={faceModalOpen}
          onClose={(success, newUrl) => {
            setFaceModalOpen(false);
            if (success && newUrl) setFaceUrl(newUrl);
          }}
          userId={userId}
        />
      )}
    </Box>
  );
}
