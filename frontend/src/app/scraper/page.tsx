'use client';
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  CircularProgress,
  Alert,
  Fade,
  LinearProgress
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from '@/services/supabase';

export default function ScraperPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState<{ id: string, url: string, status: string, time: string }[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if(session) setUser(session.user);
    });
  }, []);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    if (!user) {
        setStatus({ type: 'error', message: 'You must be logged in to use the scraper.' });
        return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Triggering background scraper...' });

    try {
      const response = await fetch('http://localhost:8000/api/v1/scraper/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          url: url,
          country: 'USA'
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Scraper triggered successfully!' });
        const newJob = {
          id: Math.random().toString(36).substr(2, 9),
          url: url,
          status: 'In Progress',
          time: new Date().toLocaleTimeString()
        };
        setActiveJobs(prev => [newJob, ...prev]);
        setUrl('');
        
        // Simulate completion after 30 seconds
        setTimeout(() => {
          setActiveJobs(prev => prev.map(job => 
            job.id === newJob.id ? { ...job, status: 'Completed' } : job
          ));
        }, 30000);

      } else {
        setStatus({ type: 'error', message: data.detail || 'Failed to trigger scraper.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Please make sure the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#050505', 
      color: 'white',
      backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.1), transparent 50%)',
      pt: 10,
      pb: 8
    }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ 
            fontWeight: 900, 
            mb: 2,
            background: 'linear-gradient(45deg, #fff, #a5a5a5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
        }}>
          Brand Data Scraper
        </Typography>
        <Typography variant="h6" sx={{ color: '#888', mb: 6, textAlign: 'center', fontWeight: 300 }}>
          Enter a brand's website link to automatically import dresses, shoes, and styles into your AI wardrobe.
        </Typography>

        <Paper sx={{ 
          p: 4, 
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 4,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          mb: 4
        }}>
          <form onSubmit={handleScrape}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)', ml: 1 }}>
                  Website URL
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://brand-website.com/collection"
                  variant="outlined"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 3,
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#00f2fe' }
                    }
                  }}
                  InputProps={{
                    startAdornment: <LanguageIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1.5 }} />
                  }}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={loading || !url}
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                sx={{
                  py: 1.8,
                  borderRadius: 3,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textTransform: 'none',
                  background: 'linear-gradient(45deg, #4f46e5, #00f2fe)',
                  boxShadow: '0 4px 14px 0 rgba(0, 242, 254, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0,242,254,0.4)'
                  },
                  '&.Mui-disabled': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                {loading ? 'Triggering...' : 'Start Scraping'}
              </Button>
            </Box>
          </form>

          {loading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.05)', 
                '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #4f46e5, #00f2fe)' }
              }} />
            </Box>
          )}

          {status && (
            <Fade in={!!status}>
              <Box sx={{ mt: 3 }}>
                <Alert 
                  severity={status.type} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2, 
                    color: 'white',
                    borderColor: status.type === 'success' ? 'rgba(76, 175, 80, 0.3)' : status.type === 'error' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(33, 150, 243, 0.3)',
                    bgcolor: status.type === 'success' ? 'rgba(76, 175, 80, 0.05)' : status.type === 'error' ? 'rgba(244, 67, 54, 0.05)' : 'rgba(33, 150, 243, 0.05)'
                  }}
                >
                  {status.message}
                </Alert>
              </Box>
            </Fade>
          )}
        </Paper>

        {/* RECENT ACTIVITY */}
        {activeJobs.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
              Recent Activity
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeJobs.map((job) => (
                <Paper key={job.id} sx={{ 
                  p: 2, 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ position: 'relative', display: 'flex' }}>
                       {job.status === 'In Progress' ? (
                         <CircularProgress size={24} sx={{ color: '#00f2fe' }} />
                       ) : (
                         <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</Box>
                       )}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white' }}>{job.url}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{job.time} • {job.status}</Typography>
                    </Box>
                  </Box>
                  {job.status === 'In Progress' && (
                    <Typography variant="caption" sx={{ color: '#00f2fe', animate: 'pulse 2s infinite' }}>
                      Crawling...
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
           <Paper sx={{ p: 3, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 3 }}>
             <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#00f2fe' }}>Automatic Tagging</Typography>
             <Typography variant="body2" sx={{ color: '#888' }}>Our AI automatically categorizes and tags crawled items by color, season, and style.</Typography>
           </Paper>
           <Paper sx={{ p: 3, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 3 }}>
             <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#4f46e5' }}>3D Model Generation</Typography>
             <Typography variant="body2" sx={{ color: '#888' }}>High-quality images are processed to generate virtual try-on models automatically.</Typography>
           </Paper>
        </Box>
      </Container>
    </Box>
  );
}
