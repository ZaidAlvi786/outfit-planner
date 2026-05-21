'use client'
import React, { useState } from 'react'
import { Container, Box, Typography, TextField, Button, Alert, Select, MenuItem, InputLabel, FormControl, Grid } from '@mui/material'
import { supabase } from '@/services/supabase'
import { countries } from '@/utils/countries'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [country, setCountry] = useState('USA')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Sign up user via Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password 
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Automatically create their profile row
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: data.user.id, full_name: name, country }
      ])
      if (profileError) {
        // Just warning here, the auth sign up succeeded.
        console.error("Profile creation error:", profileError.message)
      } else {
        // Trigger Background Scraper logic from Backend API
        fetch('http://localhost:8000/api/v1/scraper/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: data.user.id, country })
        }).catch(err => console.error("Could not trigger background scraper", err))
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#050505' }}>
      <Grid container>
        {/* Left Side: Editorial Fashion Hero Image */}
        <Grid item xs={12} md={6} sx={{
          display: { xs: 'none', md: 'block' },
          backgroundImage: 'url(https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop)',
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
              Join the Elite.
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              Discover curated styles precisely mapped to your geographic and biometric profile.
            </Typography>
          </Box>
        </Grid>

        {/* Right Side: Glassmorphism Signup Form */}
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
          <Typography variant="h4" mb={1} fontWeight="900" sx={{ background: 'linear-gradient(45deg, #fff, #a5a5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create Account</Typography>
          <Typography variant="body1" mb={4} sx={{ color: '#888' }}>Join the AI fashion revolution today.</Typography>
          
          {error && <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffb4ab', '& .MuiAlert-icon': { color: '#ffb4ab' } }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3, bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#81c784', '& .MuiAlert-icon': { color: '#81c784' } }}>Signup successful! You can now log in.</Alert>}
          
          {!success && (
            <form onSubmit={handleSignUp}>
              <TextField
                fullWidth label="Full Name" variant="filled" margin="normal"
                 value={name} onChange={(e) => setName(e.target.value)} required
                 InputProps={{ sx: { color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } } }}
                 InputLabelProps={{ sx: { color: '#888' } }}
              />
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
              <FormControl fullWidth margin="normal" variant="filled">
                <InputLabel sx={{ color: '#888' }}>Country</InputLabel>
                <Select
                  value={country}
                  label="Country"
                  onChange={(e) => setCountry(e.target.value)}
                  sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, textAlign: 'left', '& svg': { color: '#888' } }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#1a1a1a', color: 'white', maxHeight: 300 } } }}
                >
                  {countries.map((c) => (
                    <MenuItem key={c} value={c} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button fullWidth type="submit" variant="contained" size="large" sx={{ 
                mt: 5, mb: 3, 
                background: 'linear-gradient(90deg, #4f46e5, #00f2fe)', 
                color: 'white', fontWeight: 'bold', py: 1.8, borderRadius: 8, fontSize: '1.1rem',
                boxShadow: '0 10px 30px -10px rgba(0, 242, 254, 0.6)',
                '&:hover': { background: 'linear-gradient(90deg, #4338ca, #00c6d4)', transform: 'translateY(-2px)' }
              }} disabled={loading}>
                {loading ? 'Processing...' : 'Create Account'}
              </Button>
            </form>
          )}
          <Button href="/login" variant="text" sx={{ color: '#a3a3a3', textTransform: 'none', '&:hover': { color: 'white' } }}>
            Already have an account? <span style={{ color: '#00f2fe', marginLeft: '6px' }}>Sign in</span>
          </Button>
        </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
