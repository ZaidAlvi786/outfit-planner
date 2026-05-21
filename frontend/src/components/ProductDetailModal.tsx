'use client';
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  Grid, 
  Button, 
  Chip, 
  Divider,
  useMediaQuery,
  useTheme,
  Fade,
  Grow
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ProductDetailModalProps {
  product: any | null;
  open: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({ product, open, onClose }: ProductDetailModalProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [activeImg, setActiveImg] = useState(0);

  if (!product) return null;

  const metadata = product.metadata || {};
  const gallery = metadata.gallery_urls || [product.image_url];
  const sizes = metadata.sizes || [];
  const colors = product.colors || [];
  const description = product.description || "The timeless design and premium quality make this a must-have for your modern wardrobe. Designed for both style and comfort.";

  return (
    <Dialog
      fullScreen={fullScreen}
      open={open}
      onClose={onClose}
      TransitionComponent={Grow}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backgroundImage: 'none',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: fullScreen ? 0 : 6,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ position: 'absolute', right: 16, top: 16, zIndex: 10 }}>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            color: 'white', 
            bgcolor: 'rgba(255,255,255,0.05)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%', minHeight: { md: '80vh' } }}>
          {/* GALLERY SIDE */}
          <Grid item xs={12} md={7} sx={{ position: 'relative', bgcolor: '#000' }}>
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Box 
                component="img"
                src={gallery[activeImg]}
                alt={product.name}
                sx={{ 
                  width: '100%', 
                  height: '100%', 
                  maxHeight: { xs: '60vh', md: '100%' },
                  objectFit: 'contain',
                  transition: 'opacity 0.3s ease'
                }}
              />
              
              {/* THUMBS */}
              {gallery.length > 1 && (
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 24, 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  display: 'flex', 
                  gap: 1.5,
                  p: 1,
                  bgcolor: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {gallery.map((img: string, idx: number) => (
                    <Box
                      key={idx}
                      onClick={() => setActiveImg(idx)}
                      component="img"
                      src={img}
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 1,
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: activeImg === idx ? '2px solid #00f2fe' : '2px solid transparent',
                        transition: 'all 0.2s ease',
                        opacity: activeImg === idx ? 1 : 0.5,
                        '&:hover': { opacity: 1 }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          {/* INFO SIDE */}
          <Grid item xs={12} md={5} sx={{ 
            p: { xs: 4, md: 6 }, 
            display: 'flex', 
            flexDirection: 'column',
            maxHeight: '100%',
            overflowY: 'auto'
          }}>
            <Typography variant="overline" sx={{ color: '#00f2fe', fontWeight: 'bold', letterSpacing: 2 }}>
              {product.metadata?.source?.replace('-', ' ').toUpperCase() || 'PREMIUM BRAND'}
            </Typography>
            
            <Typography variant="h3" sx={{ 
              fontWeight: 900, 
              color: 'white', 
              mt: 1, 
              mb: 1,
              lineHeight: 1.1,
              fontSize: { xs: '2rem', md: '3rem' }
            }}>
              {product.name}
            </Typography>

            <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 300, mb: 4 }}>
              ${product.price ? product.price.toFixed(2) : '249.00'}
            </Typography>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 4 }} />

            {/* SIZES */}
            {sizes.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                  AVAILABLE SIZES
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {sizes.map((size: string) => (
                    <Box
                      key={size}
                      sx={{
                        px: 2.5,
                        py: 1,
                        borderRadius: 2,
                        border: '1px solid rgba(255,255,255,0.1)',
                        bgcolor: 'rgba(255,255,255,0.03)',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'white',
                          color: 'black'
                        }
                      }}
                    >
                      {size}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* COLORS */}
            {colors.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                  COLORS
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {colors.map((color: string) => (
                    <Chip 
                      key={color} 
                      label={color} 
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.05)', 
                        color: 'rgba(255,255,255,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: 600
                      }} 
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* DESCRIPTION */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                PRODUCT STORY
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
                {description}
              </Typography>
            </Box>

            {/* METADATA (SKU/Fabric) */}
            {(metadata.sku || metadata.fabric) && (
              <Box sx={{ 
                p: 2.5, 
                mb: 6,
                borderRadius: 3, 
                bgcolor: 'rgba(0, 242, 254, 0.03)', 
                border: '1px solid rgba(0, 242, 254, 0.1)' 
              }}>
                <Grid container spacing={2}>
                  {metadata.sku && (
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 242, 254, 0.6)', display: 'block' }}>SKU</Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>{metadata.sku}</Typography>
                    </Grid>
                  )}
                  {metadata.fabric && (
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 242, 254, 0.6)', display: 'block' }}>FABRIC</Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>{metadata.fabric}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            <Box sx={{ mt: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ShoppingBagIcon />}
                sx={{
                  py: 2,
                  borderRadius: 3,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textTransform: 'none',
                  background: 'linear-gradient(45deg, #4f46e5, #00f2fe)',
                  boxShadow: '0 4px 14px 0 rgba(0, 242, 254, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0,242,254,0.4)',
                    background: 'linear-gradient(45deg, #4f46e5, #00f2fe)'
                  }
                }}
              >
                Add to Wardrobe
              </Button>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, color: 'rgba(255,255,255,0.4)', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 14, color: '#4caf50' }} /> Locally verified authentic quality
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
