'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Typography, 
  Box, 
  Grid, 
  Button, 
  Chip, 
  Divider,
  Container,
  IconButton,
  CircularProgress,
  Fade,
  Breadcrumbs,
  Link as MuiLink,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '@/services/supabase';
import UploadProfileImageModal from '@/components/UploadProfileImageModal';
import dynamic from 'next/dynamic';

const VirtualTryOnStudio = dynamic(() => import('@/components/VirtualTryOnStudio'), {
  ssr: false,
});

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const slug = params.slug as string;
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tryOutfitLoading, setTryOutfitLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'error' | 'success' | 'warning' });

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data) {
          setProduct(data);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/user/profile/${session.user.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.id) setUserProfile(data);
          }
        } catch (e) {
          console.error("Backend fetch profile failed", e);
        }
      }
    };
    fetchUserProfile();
  }, [id]);

  const handleTryOutfit = async () => {
    setTryOutfitLoading(true);
    console.log("Try outfit clicked, checking session...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No session found, redirecting to login...");
        setSnackbar({ open: true, message: "Please login to use the virtual try-on feature.", severity: 'warning' });
        router.push('/login');
        return;
      }

      console.log("Session found for user:", session.user.id);

      // Check if profile exists by hitting backend bypass
      let currentProfile = userProfile;
      try {
        const res = await fetch(`http://localhost:8000/api/v1/user/profile/${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            currentProfile = data;
            setUserProfile(data);
          }
        }
      } catch (err) {
        console.error("Profile fetch error via backend:", err);
      }
      
      currentProfile = currentProfile || { id: session.user.id };
      setUserProfile(currentProfile);

      if (!currentProfile?.full_body_img_url) {
        console.log("No full body image found, opening upload modal...");
        setShowUploadModal(true);
      } else {
        console.log("Profile photo found, proceeding to 3D View...");
        setShowStudio(true);
      }
    } catch (err) {
      console.error('Error in handleTryOutfit:', err);
      setSnackbar({ open: true, message: "An unexpected error occurred. Please try again.", severity: 'error' });
    } finally {
      setTryOutfitLoading(false);
    }
  };

  const onUploadSuccess = async (success?: boolean, newImageUrl?: string) => {
    setShowUploadModal(false);
    if (success && newImageUrl) {
      setSnackbar({ open: true, message: "Profile photo updated! Launching 3D Studio...", severity: 'success' });
      
      // Update local state immediately so VirtualTryOnStudio receives the URL
      setUserProfile((prev: any) => ({
        ...prev,
        id: prev?.id,
        full_body_img_url: newImageUrl
      }));

      // Auto-launch the studio
      setTimeout(() => {
        setShowStudio(true);
      }, 500);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#050505', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#00f2fe' }} />
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#050505', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <Typography variant="h5">Product not found</Typography>
        <Button onClick={() => router.back()} sx={{ mt: 2, color: '#00f2fe' }}>Go Back</Button>
      </Box>
    );
  }

  const metadata = product.metadata || {};
  const gallery = metadata.gallery_urls || [product.image_url];
  const sizes = metadata.sizes || [];
  const colors = product.colors || [];
  const description = product.description || "The timeless design and premium quality make this a must-have for your modern wardrobe. Designed for both style and comfort.";
  const categoryName = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050505', color: 'white', pt: 10, pb: 8 }}>
      <Container maxWidth="xl">
        {/* BREADCRUMBS & BACK */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
            <ArrowBackIcon />
          </IconButton>
          <Breadcrumbs separator={<Typography sx={{ color: 'rgba(255,255,255,0.3)' }}>/</Typography>} aria-label="breadcrumb">
            <MuiLink underline="hover" sx={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} onClick={() => router.push('/')}>Home</MuiLink>
            <MuiLink underline="hover" sx={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} onClick={() => router.push(`/category/${slug}`)}>{categoryName}</MuiLink>
            <Typography sx={{ color: 'white' }}>{product.name}</Typography>
          </Breadcrumbs>
        </Box>

        <Fade in={!loading}>
          <Grid container spacing={6}>
            {/* LEFT: GALLERY */}
            <Grid item xs={12} md={7}>
              <Box sx={{ position: 'relative', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 6, overflow: 'hidden', height: { md: '80vh' } }}>
                <Box 
                  component="img"
                  src={gallery[activeImg]}
                  alt={product.name}
                  sx={{ 
                    width: '100%', 
                    height: '100%', 
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
                          width: 60,
                          height: 60,
                          borderRadius: 1.5,
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: activeImg === idx ? '2px solid #00f2fe' : '2px solid transparent',
                          transition: 'all 0.2s ease',
                          opacity: activeImg === idx ? 1 : 0.6,
                          '&:hover': { opacity: 1 }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* RIGHT: INFO */}
            <Grid item xs={12} md={5}>
              <Box sx={{ position: 'sticky', top: 100 }}>
                <Typography variant="overline" sx={{ color: '#00f2fe', fontWeight: 'bold', letterSpacing: 2 }}>
                  {product.metadata?.source?.replace('-', ' ').toUpperCase() || 'PREMIUM BRAND'}
                </Typography>
                
                <Typography variant="h2" sx={{ 
                  fontWeight: 900, 
                  color: 'white', 
                  mt: 1, 
                  mb: 1,
                  lineHeight: 1.1,
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {sizes.map((size: string) => (
                        <Box
                          key={size}
                          sx={{
                            px: 3,
                            py: 1.5,
                            borderRadius: 2.5,
                            border: '1px solid rgba(255,255,255,0.1)',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            color: 'white',
                            fontSize: '0.9rem',
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
                            px: 1,
                            py: 2.5,
                            bgcolor: 'rgba(255,255,255,0.05)', 
                            color: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontWeight: 600,
                            fontSize: '0.9rem'
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
                    p: 3, 
                    mb: 6,
                    borderRadius: 4, 
                    bgcolor: 'rgba(0, 242, 254, 0.03)', 
                    border: '1px solid rgba(0, 242, 254, 0.1)' 
                  }}>
                    <Grid container spacing={3}>
                      {metadata.sku && (
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'rgba(0, 242, 254, 0.6)', display: 'block' }}>SKU</Typography>
                          <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>{metadata.sku}</Typography>
                        </Grid>
                      )}
                      {metadata.fabric && (
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'rgba(0, 242, 254, 0.6)', display: 'block' }}>FABRIC</Typography>
                          <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>{metadata.fabric}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                <Box>
                  <Tooltip 
                    title="Click to view a 3D model of this outfit layered over your photo for a realistic virtual try-on experience."
                    placement="top"
                    arrow
                    enterDelay={200}
                    leaveDelay={200}
                    slotProps={{
                      tooltip: {
                        sx: {
                          bgcolor: 'rgba(15, 15, 15, 0.9)',
                          backdropFilter: 'blur(10px)',
                          color: 'white',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          borderRadius: 2,
                          p: 1.5,
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          textAlign: 'center',
                          boxShadow: '0 8px 32px rgba(0, 242, 254, 0.15)',
                          '& .MuiTooltip-arrow': {
                            color: 'rgba(15, 15, 15, 0.9)',
                            '&::before': {
                              border: '1px solid rgba(0, 242, 254, 0.3)',
                            }
                          }
                        }
                      }
                    }}
                  >
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleTryOutfit}
                      disabled={tryOutfitLoading}
                      startIcon={tryOutfitLoading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                      sx={{
                        py: 2.5,
                        borderRadius: 4,
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        textTransform: 'none',
                        background: 'linear-gradient(45deg, #4f46e5, #00f2fe)',
                        boxShadow: '0 4px 20px 0 rgba(0, 242, 254, 0.3)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 30px rgba(0,242,254,0.4)',
                          background: 'linear-gradient(45deg, #4f46e5, #00f2fe)'
                        }
                      }}
                    >
                      {tryOutfitLoading ? 'Checking Profile...' : 'Try outfit'}
                    </Button>
                  </Tooltip>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, color: 'rgba(255,255,255,0.4)', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} /> Locally verified authentic quality
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Fade>
      </Container>

      {/* Upload Profile Image Modal */}
      <UploadProfileImageModal 
        open={showUploadModal} 
        onClose={onUploadSuccess} 
        userId={userProfile?.id || ""} 
      />

      {/* Virtual Try-On Studio */}
      {userProfile?.full_body_img_url && (
        <VirtualTryOnStudio 
          open={showStudio} 
          onClose={() => setShowStudio(false)} 
          userImageUrl={userProfile.full_body_img_url} 
          product={product} 
        />
      )}

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            bgcolor: 'rgba(20, 20, 20, 0.9)',
            backdropFilter: 'blur(15px)',
            color: 'white',
            border: `1px solid ${snackbar.severity === 'error' ? 'rgba(244, 67, 54, 0.5)' : snackbar.severity === 'warning' ? 'rgba(255, 152, 0, 0.5)' : snackbar.severity === 'success' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(0, 242, 254, 0.5)'}`,
            borderRadius: 3,
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            '& .MuiAlert-icon': {
              color: snackbar.severity === 'error' ? '#f44336' : snackbar.severity === 'warning' ? '#ff9800' : snackbar.severity === 'success' ? '#4caf50' : '#00f2fe'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
