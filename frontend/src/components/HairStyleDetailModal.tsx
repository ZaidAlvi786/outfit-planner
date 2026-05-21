'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export type HairStyle = {
  id?: string;
  gender: string;
  name: string;
  image_url: string;
  thumb_url?: string;
  tags?: string[];
  description?: string;
};

type Rating = {
  rating: number;
  feedback: string;
  pros?: string[];
  cons?: string[];
  suggestions?: string[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  style: HairStyle | null;
  faceUrl: string | null;
  onRequestFaceUpload: () => void;
}

export default function HairStyleDetailModal({ open, onClose, style, faceUrl, onRequestFaceUpload }: Props) {
  const [tryingOn, setTryingOn] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTryingOn(false);
      setResultUrl(null);
      setRating(null);
      setRatingLoading(false);
      setError(null);
      setSliderPos(50);
    }
  }, [open]);

  if (!style) return null;

  const handleTryOn = async () => {
    if (!faceUrl) return;
    setError(null);
    setTryingOn(true);
    setResultUrl(null);
    setRating(null);

    try {
      const res = await fetch('http://localhost:8000/api/v1/hair-styles/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_face_url: faceUrl,
          hair_style_image_url: style.image_url,
          style_name: style.name,
          style_description: style.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Try-on failed');
      setResultUrl(data.result_url);

      setRatingLoading(true);
      const rateRes = await fetch('http://localhost:8000/api/v1/hair-styles/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_image_url: data.result_url,
          style_name: style.name,
          style_description: style.description,
        }),
      });
      const rateData = await rateRes.json();
      if (!rateRes.ok) throw new Error(rateData.detail || 'Rating failed');
      setRating(rateData);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setTryingOn(false);
      setRatingLoading(false);
    }
  };

  const handleSliderDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ position: 'absolute', right: 16, top: 16, zIndex: 10 }}>
        <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, minHeight: 600 }}>
          {/* LEFT — style reference */}
          <Box sx={{ position: 'relative', bgcolor: 'black', minHeight: 360 }}>
            <Box
              component="img"
              src={style.image_url}
              alt={style.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 360 }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 40%)',
              }}
            />
            <Box sx={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>
                {style.gender}'s Style
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', mb: 1 }}>
                {style.name}
              </Typography>
              {style.description && (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                  {style.description}
                </Typography>
              )}
              {style.tags && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {style.tags.map((t) => (
                    <Chip
                      key={t}
                      label={t}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: 'rgba(0,242,254,0.1)',
                        color: '#00f2fe',
                        border: '1px solid rgba(0,242,254,0.2)',
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          {/* RIGHT — try-on */}
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', color: 'white' }}>
            {!resultUrl && !tryingOn && (
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <AutoFixHighIcon sx={{ fontSize: 56, color: '#f472b6', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                  See how it looks on you
                </Typography>
                <Typography variant="body2" sx={{ color: '#888', mb: 4, maxWidth: 380 }}>
                  AI transfers this hairstyle onto your photo, then an expert stylist rates how well it suits you.
                </Typography>

                {faceUrl ? (
                  <Tooltip title="Click to AI-generate a photo of you with this hairstyle" arrow>
                    <span>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleTryOn}
                        startIcon={<AutoFixHighIcon />}
                        sx={{
                          px: 4,
                          py: 1.5,
                          borderRadius: 3,
                          fontWeight: 'bold',
                          textTransform: 'none',
                          fontSize: '1rem',
                          background: 'linear-gradient(45deg, #f472b6, #c084fc)',
                          boxShadow: '0 10px 30px -10px rgba(244,114,182,0.5)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #ec4899, #a855f7)',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        Try on Me
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Upload a headshot first — we need it to generate your try-on" arrow>
                      <span>
                        <Button
                          variant="contained"
                          size="large"
                          disabled
                          startIcon={<AutoFixHighIcon />}
                          sx={{
                            px: 4,
                            py: 1.5,
                            borderRadius: 3,
                            fontWeight: 'bold',
                            textTransform: 'none',
                            fontSize: '1rem',
                            '&.Mui-disabled': {
                              background: 'rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.3)',
                            },
                          }}
                        >
                          Try on Me
                        </Button>
                      </span>
                    </Tooltip>
                    <Button
                      onClick={onRequestFaceUpload}
                      startIcon={<CloudUploadIcon />}
                      sx={{
                        mt: 3,
                        color: '#f472b6',
                        textTransform: 'none',
                        '&:hover': { bgcolor: 'rgba(244,114,182,0.08)' },
                      }}
                    >
                      Upload your headshot
                    </Button>
                  </>
                )}
              </Box>
            )}

            {tryingOn && (
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <CircularProgress sx={{ color: '#f472b6', mb: 3 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Styling you…
                </Typography>
                <Typography variant="body2" sx={{ color: '#888', mb: 3, maxWidth: 360 }}>
                  AI is transferring <b>{style.name}</b> onto your photo. This usually takes 15–40 seconds.
                </Typography>
                <LinearProgress
                  sx={{
                    width: '70%',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 2,
                    '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #f472b6, #c084fc)' },
                  }}
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(244,67,54,0.08)', color: '#ffb4ab', border: '1px solid rgba(244,67,54,0.3)' }}>
                {error}
              </Alert>
            )}

            {resultUrl && faceUrl && (
              <Box>
                <Typography variant="overline" sx={{ color: '#888', letterSpacing: 2 }}>
                  Before / After — drag slider
                </Typography>
                <Box
                  ref={sliderRef}
                  onMouseMove={(e) => e.buttons === 1 && handleSliderDrag(e)}
                  onClick={handleSliderDrag}
                  onTouchMove={handleSliderDrag}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 360,
                    mt: 1.5,
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'ew-resize',
                    userSelect: 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Box
                    component="img"
                    src={faceUrl}
                    alt="Before"
                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      overflow: 'hidden',
                      width: `${sliderPos}%`,
                    }}
                  >
                    <Box
                      component="img"
                      src={resultUrl}
                      alt="After"
                      sx={{
                        width: sliderRef.current?.clientWidth || '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${sliderPos}%`,
                      width: 2,
                      bgcolor: 'white',
                      boxShadow: '0 0 12px rgba(0,0,0,0.8)',
                      transform: 'translateX(-1px)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: `${sliderPos}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 36,
                      height: 36,
                      bgcolor: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#222',
                      boxShadow: '0 0 14px rgba(0,0,0,0.6)',
                      pointerEvents: 'none',
                    }}
                  >
                    ⇔
                  </Box>
                  <Typography variant="caption" sx={{ position: 'absolute', top: 12, left: 12, px: 1, py: 0.3, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, color: 'white' }}>
                    Before
                  </Typography>
                  <Typography variant="caption" sx={{ position: 'absolute', top: 12, right: 12, px: 1, py: 0.3, bgcolor: 'rgba(244,114,182,0.8)', borderRadius: 1, color: 'white' }}>
                    After
                  </Typography>
                </Box>

                <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.06)' }} />

                {ratingLoading && !rating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={18} sx={{ color: '#c084fc' }} />
                    <Typography variant="body2" sx={{ color: '#888' }}>
                      Expert stylist rating your look…
                    </Typography>
                  </Box>
                )}

                {rating && <RatingCard rating={rating} />}

                <Button
                  variant="outlined"
                  onClick={handleTryOn}
                  sx={{
                    mt: 3,
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.15)',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#f472b6', bgcolor: 'rgba(244,114,182,0.05)' },
                  }}
                >
                  Try again
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function RatingCard({ rating }: { rating: Rating }) {
  const score = Math.max(0, Math.min(10, rating.rating));
  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : '#f87171';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: `3px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 900, color }}>
            {score}
          </Typography>
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            {[...Array(5)].map((_, i) => (
              <StarIcon key={i} sx={{ fontSize: 16, color: i < Math.round(score / 2) ? color : 'rgba(255,255,255,0.15)' }} />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: '#888', letterSpacing: 1 }}>
            STYLIST SCORE
          </Typography>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mb: 2, lineHeight: 1.7 }}>
        {rating.feedback}
      </Typography>

      {rating.pros && rating.pros.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          {rating.pros.map((p, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e', mt: 0.2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{p}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {rating.cons && rating.cons.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          {rating.cons.map((c, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
              <CancelIcon sx={{ fontSize: 18, color: '#f87171', mt: 0.2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{c}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {rating.suggestions && rating.suggestions.length > 0 && (
        <Box>
          {rating.suggestions.map((s, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
              <LightbulbIcon sx={{ fontSize: 18, color: '#eab308', mt: 0.2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{s}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
