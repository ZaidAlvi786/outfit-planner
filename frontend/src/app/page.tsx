'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Typography, Box, Grid, Card, CardContent, Button, CircularProgress } from '@mui/material'
import { supabase } from '@/services/supabase'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CheckroomIcon from '@mui/icons-material/Checkroom'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0a0a' }}>
        <CircularProgress sx={{ color: '#00f2fe' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#050505', 
      color: 'white',
      backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(0, 242, 254, 0.15), transparent 25%)',
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
    }}>
      <Container maxWidth="xl" sx={{ pt: 12, pb: 8 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 4, 
              borderRadius: 4, 
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
              <Box sx={{ display: 'inline-block', px: 2, py: 0.5, mb: 3, borderRadius: 10, background: 'linear-gradient(90deg, #4f46e5, #00f2fe)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                AI-POWERED VIRTUAL WARDROBE
              </Box>
              <Typography variant="h2" component="h1" gutterBottom fontWeight="900" sx={{ background: '-webkit-linear-gradient(45deg, #fff, #a5a5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AuraStyle Enterprise
              </Typography>
              <Typography variant="h6" sx={{ color: '#a3a3a3', mb: 4, lineHeight: 1.6, fontWeight: 300 }}>
                Revolutionize your e-commerce platform with real-time 3D try-ons, intelligent body-type fashion scaling, and dynamic vector-based style recommendations.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" size="large" sx={{ background: 'linear-gradient(45deg, #4f46e5, #00f2fe)', color: 'white', borderRadius: 8, px: 4, py: 1.5, textTransform: 'none', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 4px 14px 0 rgba(0, 242, 254, 0.39)', '&:hover': { transform: 'translateY(-2px)', transition: 'all 0.2s', boxShadow: '0 6px 20px rgba(0,242,254,0.5)' } }}>
                  Explore Collection
                </Button>
                <Button variant="outlined" size="large" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, px: 4, py: 1.5, textTransform: 'none', fontSize: '1.1rem', '&:hover': { borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)' }}}>
                  View Saved Outfits
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
             {/* 3D Model Placeholder Box representing the useARViewer hook action */}
             <Box sx={{ 
                height: '500px', 
                borderRadius: 6, 
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, rgba(20,20,20,1) 0%, rgba(5,5,5,1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.8)'
             }}>
                <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 1 }}>
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 1, borderRadius: 2 }}><AutoFixHighIcon sx={{ color: '#00f2fe' }} /></Box>
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 1, borderRadius: 2 }}><CheckroomIcon sx={{ color: '#4f46e5' }} /></Box>
                </Box>
                <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>
                  [ AR Viewer Engine Matrix ]
                </Typography>
                {/* Simulated ambient lighting behind the model */}
                <Box sx={{ position: 'absolute', width: 200, height: 200, background: '#4f46e5', filter: 'blur(100px)', opacity: 0.3, top: '10%' }} />
             </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 10, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', pt: 6 }}>
           {['Personalized AI', '3D AR Try-On', 'Smart Recommendations'].map((text, i) => (
             <Card key={i} sx={{ width: '30%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
               <CardContent>
                 <Typography variant="h2" sx={{ color: 'rgba(255,255,255,0.05)', fontWeight: 'bold', position: 'absolute', zIndex: 0, mt: -2 }}>0{i+1}</Typography>
                 <Typography variant="h6" sx={{ color: 'white', position: 'relative', zIndex: 1, fontWeight: 'bold', mb: 1 }}>{text}</Typography>
                 <Typography variant="body2" sx={{ color: '#888', position: 'relative', zIndex: 1 }}>Engineered with machine learning precision to map out your fashion dimensions gracefully.</Typography>
               </CardContent>
             </Card>
           ))}
        </Box>
      </Container>
    </Box>
  )
}
