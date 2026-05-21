'use client';
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Button, Menu, MenuItem, Box, Grid, Typography, Container, IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '@/services/supabase';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
  const pathname = usePathname();
  const [navData, setNavData] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenu, setActiveMenu] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if(session) setUser(session.user);
    });
    // Fetch dynamic menu from FastAPI
    // This is mocked to point to localhost or the actual backend URL
    fetch('http://localhost:8000/api/v1/categories/menu')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setNavData(data);
      })
      .catch(console.error);
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>, menu: any) => {
    setAnchorEl(event.currentTarget);
    setActiveMenu(menu);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <AppBar position="sticky" elevation={0} sx={{ 
      background: 'rgba(5, 5, 5, 0.7)', 
      backdropFilter: 'blur(12px)', 
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      color: 'white'
    }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: '80px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="h6" onClick={() => window.location.href = '/'} sx={{ 
              fontWeight: '900', 
              mr: 6, 
              letterSpacing: '1px',
              background: 'linear-gradient(45deg, #fff, #a5a5a5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer'
            }}>
              AURASTYLE
            </Typography>
            
            {!isAuthPage && navData.map((category: any) => (
              <Button
                key={category.id}
                onMouseEnter={(e) => handleOpen(e, category)}
                endIcon={<KeyboardArrowDownIcon />}
                sx={{ 
                  mx: 1, 
                  color: 'rgba(255,255,255,0.8)', 
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': { color: 'white', background: 'rgba(255,255,255,0.05)' }
                }}
              >
                {category.name}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
             {user ? (
               <>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#a3a3a3' }}>
                   <AccountCircleIcon fontSize="small"/>
                   <Typography variant="body2">{user.email?.split('@')[0]}</Typography>
                 </Box>
                 <IconButton onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ff4d4f', bgcolor: 'rgba(255,77,79,0.1)' } }}>
                   <LogoutIcon />
                 </IconButton>
               </>
             ) : (
               <Button href="/login" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, textTransform: 'none' }}>
                 Login
               </Button>
             )}
          </Box>
        </Toolbar>
      </Container>

      {/* MEGA MENU DRAWER */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{ onMouseLeave: () => setAnchorEl(null) }}
        PaperProps={{ sx: { 
          width: '100vw', 
          left: '0 !important', 
          mt: 2,
          background: 'rgba(15,15,15,0.95)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}}
      >
        <Container maxWidth="xl">
          <Grid container spacing={4} sx={{ p: 4 }}>
            {activeMenu?.subcategories?.map((sub: any) => (
              <Grid item xs={3} key={sub.id}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#00f2fe' }}>
                  {sub.name}
                </Typography>
                {sub.brands?.map((brand: any) => (
                  <MenuItem key={brand.id} onClick={() => window.location.href=`/shop?brand=${brand.slug}`} sx={{ borderRadius: 1, '&:hover': { background: 'rgba(255,255,255,0.05)' } }}>
                    {brand.name}
                  </MenuItem>
                ))}
              </Grid>
            ))}
            <Grid item xs={3}>
              <Box sx={{ p: 2, background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(0,242,254,0.2))', borderRadius: 4, textAlign: 'center' }}>
                <Box component="img" src={activeMenu?.image_url || 'https://via.placeholder.com/300x200/222/555'} sx={{ width: '100%', borderRadius: 2, mb: 1, filter: 'grayscale(30%)' }} />
                <Typography variant="caption" sx={{ color: '#ccc', letterSpacing: 1, textTransform: 'uppercase' }}>New Arrivals</Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Menu>
    </AppBar>
  );
};

