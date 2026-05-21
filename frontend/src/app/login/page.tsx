'use client'
import React, { useState } from 'react'
import { Container, Box, Typography, TextField, Button, Alert, Grid } from '@mui/material'
import { supabase } from '@/services/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#050505' }}>
      <Grid container>
        {/* Left Side: Editorial Fashion Hero Image */}
        <Grid item xs={12} md={6} sx={{
          display: { xs: 'none', md: 'block' },
          backgroundImage: 'url(https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}>
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(5,5,5,0.1), rgba(5,5,5,1))',
          }} />
          <Box sx={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
            <Typography variant="h3" fontWeight="900" sx={{ color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
              Step Into The Future.
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              AuraStyle AI uses predictive modeling to curate your ultimate wardrobe.
            </Typography>
          </Box>
        </Grid>

        {/* Right Side: Glassmorphism Login Form */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Box sx={{
            width: '100%', maxWidth: 450,
            p: 5, borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)',
            textAlign: 'center'
          }}>
            <Typography variant="h4" mb={1} fontWeight="900" sx={{ 
              background: 'linear-gradient(45deg, #fff, #a5a5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' 
            }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" mb={5} sx={{ color: '#888' }}>Access your personalized style engine.</Typography>
            
            {error && <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffb4ab', '& .MuiAlert-icon': { color: '#ffb4ab' } }}>{error}</Alert>}
            
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth label="Email Address" variant="filled" margin="normal"
                value={email} onChange={(e) => setEmail(e.target.value)} required type="email"
                InputProps={{ sx: { color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } } }}
                InputLabelProps={{ sx: { color: '#888' } }}
              />
              <TextField
                fullWidth label="Password" variant="filled" margin="normal"
                value={password} onChange={(e) => setPassword(e.target.value)} required type="password"
                InputProps={{ sx: { color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } } }}
                InputLabelProps={{ sx: { color: '#888' } }}
              />
              <Button fullWidth type="submit" variant="contained" size="large" sx={{ 
                mt: 5, mb: 3, 
                background: 'linear-gradient(90deg, #4f46e5, #00f2fe)', 
                color: 'white', fontWeight: 'bold', py: 1.8, borderRadius: 8, fontSize: '1.1rem',
                boxShadow: '0 10px 30px -10px rgba(0, 242, 254, 0.6)',
                '&:hover': { background: 'linear-gradient(90deg, #4338ca, #00c6d4)', transform: 'translateY(-2px)' }
              }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>
            <Button href="/signup" variant="text" sx={{ color: '#a3a3a3', textTransform: 'none', '&:hover': { color: 'white' } }}>
              Don't have an account? <span style={{ color: '#00f2fe', marginLeft: '6px' }}>Create one</span>
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
