'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Paper,
  CircularProgress,
  Chip,
  Fade,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StarIcon from '@mui/icons-material/Star';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';

interface TryOnStudioProps {
  open: boolean;
  onClose: () => void;
  userImageUrl: string;
  product: any;
}

// Drag-to-spin 360° viewer — cycles through AI-generated angle frames.
const TurntableViewer = ({ frames }: { frames: string[] }) => {
  const [index, setIndex] = useState(0);
  const drag = useRef<{ startX: number; startIndex: number } | null>(null);

  const move = (clientX: number) => {
    if (!drag.current || frames.length < 2) return;
    const delta = clientX - drag.current.startX;
    const step = Math.round(delta / 40); // 40px of drag = one frame
    const next = (drag.current.startIndex + step) % frames.length;
    setIndex(next < 0 ? next + frames.length : next);
  };

  return (
    <Box
      onMouseDown={(e) => { drag.current = { startX: e.clientX, startIndex: index }; }}
      onMouseMove={(e) => e.buttons === 1 && move(e.clientX)}
      onMouseUp={() => { drag.current = null; }}
      onMouseLeave={() => { drag.current = null; }}
      onTouchStart={(e) => { drag.current = { startX: e.touches[0].clientX, startIndex: index }; }}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      onTouchEnd={() => { drag.current = null; }}
      sx={{
        width: '100%', height: '100%', position: 'relative',
        cursor: 'ew-resize', userSelect: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Box component="img" src={frames[index]} alt={`view ${index + 1}`}
        draggable={false}
        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      <Box sx={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 1,
        bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
        px: 2, py: 0.75, borderRadius: 5,
      }}>
        <ThreeSixtyIcon sx={{ fontSize: 18, color: '#00f2fe' }} />
        <Typography variant="caption" sx={{ color: 'white' }}>
          Drag to spin • {index + 1}/{frames.length}
        </Typography>
      </Box>
    </Box>
  );
};

export default function VirtualTryOnStudio({ open, onClose, userImageUrl, product }: TryOnStudioProps) {
  const [loadingStep, setLoadingStep] = useState<'idle' | 'try-on' | 'turntable' | 'complete'>('idle');
  const [error, setError] = useState<string | null>(null);

  // States to hold the assets
  const [tryOnImageUrl, setTryOnImageUrl] = useState<string | null>(null);
  const [turntableFrames, setTurntableFrames] = useState<string[]>([]);
  const [expertAdvice, setExpertAdvice] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    
    let isMounted = true;
    
    const runPipeline = async () => {
      // Reset states
      setLoadingStep('try-on');
      setError(null);
      setTryOnImageUrl(null);
      setTurntableFrames([]);
      setExpertAdvice(null);

      try {
        // Step 1: Virtual Try-On
        const tryOnRes = await fetch('http://localhost:8000/api/v1/styling/try-on', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_image_url: userImageUrl,
            product_image_url: product.image_url,
            garment_des: product.name,
            category: "upper_body" // using a default
          })
        });

        if (!tryOnRes.ok) throw new Error("Failed to generate Try-On image.");
        const tryOnData = await tryOnRes.json();
        const vtonUrl = tryOnData.generated_image_url;
        
        if (isMounted) {
          setTryOnImageUrl(vtonUrl);
          setTurntableFrames([vtonUrl]); // show the front view immediately
          setLoadingStep('turntable');
        }

        // Fire Expert Advice in parallel
        fetch('http://localhost:8000/api/v1/styling/expert-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_image_url: userImageUrl, // Use original or vtonUrl for advice, using original to gauge fit
            product_name: product.name,
            product_description: product.description || "A premium fashion product"
          })
        }).then(res => res.json())
          .then(data => { if (isMounted) setExpertAdvice(data); })
          .catch(e => console.error("Expert Advice error:", e));

        // Step 2: 360° turntable — AI-generated rotated views
        try {
          const turntableRes = await fetch('http://localhost:8000/api/v1/styling/turntable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: vtonUrl })
          });

          if (turntableRes.ok) {
            const turntableData = await turntableRes.json();
            if (isMounted && Array.isArray(turntableData.frames) && turntableData.frames.length) {
              setTurntableFrames(turntableData.frames);
            }
          } else {
            console.warn("Turntable generation failed — keeping the single front view.");
          }
        } catch(e) {
          console.error("Turntable pipeline error:", e);
        }

        if (isMounted) {
          setLoadingStep('complete');
        }

      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "An error occurred in the Virtual Studio pipeline.");
          setLoadingStep('complete');
        }
      }
    };

    runPipeline();

    return () => { isMounted = false; };
  }, [open, userImageUrl, product]);

  return (
    <Dialog 
      fullScreen 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#050505',
          color: 'white',
          backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(79, 70, 229, 0.1) 0%, transparent 60%)',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {/* HEADER */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: 'monospace' }}>
          <AutoAwesomeIcon sx={{ color: '#00f2fe' }} />
          AURA 3D STUDIO
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{
        flexGrow: 1,
        minHeight: 0,
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        overflow: 'hidden'
      }}>

          {/* LEFT PANEL: 360° TURNTABLE VIEWER */}
          <Box sx={{ flex: { xs: '1 1 0', md: '2 1 0' }, minHeight: 0, minWidth: 0 }}>
            <Paper sx={{
              height: '100%',
              bgcolor: 'rgba(255,255,255,0.02)',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* STATUS OVERLAYS */}
              {loadingStep === 'try-on' && (
                <Box sx={{
                  position: 'absolute', inset: 0, zIndex: 5,
                  bgcolor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                }}>
                  <CircularProgress size={60} thickness={2} sx={{ color: '#00f2fe', mb: 4 }} />
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 300, letterSpacing: 1 }}>
                    Dressing you in {product.name}...
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
                    Powered by AuraStyle AI
                  </Typography>
                </Box>
              )}

              {error && (
                <Box sx={{
                  position: 'absolute', inset: 0, zIndex: 6,
                  bgcolor: 'rgba(20,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center'
                }}>
                  <Typography color="error" variant="h6">{error}</Typography>
                </Box>
              )}

              {/* VIEWER */}
              <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 0 }}>
                {turntableFrames.length > 0 && <TurntableViewer frames={turntableFrames} />}

                {/* While extra angles generate, a subtle banner over the front view */}
                {loadingStep === 'turntable' && (
                  <Box sx={{
                    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 1,
                    bgcolor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                    px: 2, py: 0.75, borderRadius: 5, zIndex: 4,
                  }}>
                    <CircularProgress size={14} sx={{ color: '#00f2fe' }} />
                    <Typography variant="caption" sx={{ color: 'white' }}>
                      Generating 360° spin...
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>

          {/* RIGHT PANEL: EXPERT STYLIST */}
          <Box sx={{ flex: { xs: '1 1 0', md: '1 1 0' }, minHeight: 0, minWidth: 0 }}>
            <Paper sx={{
              height: '100%',
              bgcolor: 'rgba(20, 15, 30, 0.4)',
              borderRadius: 4,
              border: '1px solid rgba(138, 43, 226, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <Typography variant="overline" sx={{ color: '#b983ff', fontWeight: 900, letterSpacing: 2, fontSize: '0.65rem' }}>
                  LEGENDARY FASHION STYLIST
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 300, color: 'white' }}>
                  Style Analysis
                </Typography>
              </Box>

              {/* Scrolls internally only if feedback is unusually long; layout never overflows the screen */}
              <Box sx={{ p: 2.5, flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
                {!expertAdvice ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress size={30} sx={{ color: '#b983ff', mb: 2 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      Analyzing silhouette and fit...
                    </Typography>
                  </Box>
                ) : (
                  <Fade in={!!expertAdvice}>
                    <Box>
                      {/* RATING */}
                      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                          width: 60, height: 60,
                          flexShrink: 0,
                          borderRadius: '50%',
                          bgcolor: expertAdvice.rating >= 8 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                          border: `2px solid ${expertAdvice.rating >= 8 ? '#4caf50' : '#ff9800'}`,
                          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                        }}>
                          <Typography variant="h5" sx={{ color: expertAdvice.rating >= 8 ? '#4caf50' : '#ff9800', fontWeight: 'bold', lineHeight: 1 }}>
                            {expertAdvice.rating}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem' }}>/10</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                            {expertAdvice.rating >= 9 ? "Absolute Must-Have!" : expertAdvice.rating >= 7 ? "Looking Good!" : "Room for Improvement"}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.4, mt: 0.5 }}>
                            {[...Array(10)].map((_, i) => (
                              <StarIcon key={i} sx={{ fontSize: 13, color: i < expertAdvice.rating ? '#ffc107' : 'rgba(255,255,255,0.1)' }} />
                            ))}
                          </Box>
                        </Box>
                      </Box>

                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 2 }} />

                      {/* FEEDBACK */}
                      <Typography variant="subtitle2" sx={{ color: 'white', mb: 0.5, fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: 1 }}>
                        EXPERT FEEDBACK
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontStyle: 'italic', mb: 2.5, fontSize: '0.85rem' }}>
                        "{expertAdvice.feedback}"
                      </Typography>

                      {/* SUGGESTIONS */}
                      <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: 1 }}>
                        STYLE IT WITH
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {(expertAdvice.suggestions || []).map((sugg: string, i: number) => (
                          <Chip
                            key={i}
                            label={sugg}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(185, 131, 255, 0.1)',
                              color: '#b983ff',
                              border: '1px solid rgba(185, 131, 255, 0.3)'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Fade>
                )}
              </Box>
            </Paper>
          </Box>

      </Box>
    </Dialog>
  );
}
