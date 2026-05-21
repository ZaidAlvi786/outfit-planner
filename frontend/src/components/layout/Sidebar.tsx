'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Collapse,
  Divider,
  IconButton,
  Avatar
} from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import FaceIcon from '@mui/icons-material/Face';
import WatchIcon from '@mui/icons-material/Watch';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import { supabase } from '@/services/supabase';

const DRAWER_WIDTH = 280;

export const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [navData, setNavData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Clothes': true,
    'Hair': false,
    'Accessories': false,
    'Shoes': false
  });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if(session) setUser(session.user);
    });

    // Fetch Categories and Subcategories
    const fetchNavData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*, subcategories(*)');
        
        if (data) {
          // Sort subcategories alphabetically for each category
          const sortedData = data.map(cat => ({
            ...cat,
            subcategories: cat.subcategories?.sort((a: any, b: any) => a.name.localeCompare(b.name)) || []
          }));
          setNavData(sortedData);
        }
      } catch (err) {
        console.error('Nav fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNavData();
  }, []);

  const toggleSection = (name: string) => {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (isAuthPage) return null;

  // Helper to get Icon by category name
  const getCategoryIcon = (name: string) => {
    switch(name) {
      case 'Clothes': return <CheckroomIcon />;
      case 'Hair': return <FaceIcon />;
      case 'Accessories': return <WatchIcon />;
      case 'Shoes': return <CheckroomIcon />; // Fallback or customize
      default: return <CheckroomIcon />;
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'rgba(5, 5, 5, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column'
        },
      }}
    >
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" onClick={() => router.push('/')} sx={{ 
          fontWeight: '900', 
          letterSpacing: '1px',
          background: 'linear-gradient(45deg, #fff, #a5a5a5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          cursor: 'pointer'
        }}>
          AURASTYLE
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
        <List sx={{ mt: 2 }}>
          {/* AI OUTFIT ASSISTANT */}
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => router.push('/assistant')}
              selected={pathname === '/assistant'}
              sx={{
                borderRadius: 2,
                background: pathname === '/assistant' ? 'linear-gradient(90deg, rgba(79, 70, 229, 0.2), rgba(0, 242, 254, 0.2))' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
              }}
            >
              <ListItemIcon sx={{ color: '#c084fc', minWidth: 40 }}><AutoAwesomeIcon /></ListItemIcon>
              <ListItemText primary="AI Outfit Assistant" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>

          {/* HAIR STYLES */}
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => router.push('/hair-styles')}
              selected={pathname === '/hair-styles' || pathname.startsWith('/hair-styles/')}
              sx={{
                borderRadius: 2,
                background: (pathname === '/hair-styles' || pathname.startsWith('/hair-styles/')) ? 'linear-gradient(90deg, rgba(79, 70, 229, 0.2), rgba(0, 242, 254, 0.2))' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
              }}
            >
              <ListItemIcon sx={{ color: '#f472b6', minWidth: 40 }}><ContentCutIcon /></ListItemIcon>
              <ListItemText primary="Hair Styles" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>

          {/* SCRAPER TOOL */}
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => router.push('/scraper')}
              selected={pathname === '/scraper'}
              sx={{
                borderRadius: 2,
                background: pathname === '/scraper' ? 'linear-gradient(90deg, rgba(79, 70, 229, 0.2), rgba(0, 242, 254, 0.2))' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
              }}
            >
              <ListItemIcon sx={{ color: '#00f2fe', minWidth: 40 }}><LanguageIcon /></ListItemIcon>
              <ListItemText primary="Scraper Tool" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>

          <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.05)' }} />

          {/* DYNAMIC CATEGORIES */}
          {loading ? (
            <Typography variant="caption" sx={{ p: 2, opacity: 0.5 }}>Loading menu...</Typography>
          ) : (
            navData.map((category) => (
              <React.Fragment key={category.id}>
                <ListItemButton onClick={() => toggleSection(category.name)} sx={{ borderRadius: 2, mt: 1 }}>
                  <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                    {getCategoryIcon(category.name)}
                  </ListItemIcon>
                  <ListItemText primary={category.name} primaryTypographyProps={{ fontWeight: 'bold', fontSize: '1rem' }} />
                  {openSections[category.name] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openSections[category.name]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 4 }}>
                    {category.subcategories.map((sub: any) => (
                      <ListItemButton 
                        key={sub.id} 
                        onClick={() => router.push(`/category/${sub.slug}`)}
                        selected={pathname === `/category/${sub.slug}`}
                        sx={{ 
                          py: 0.5, 
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
                        }}
                      >
                        <ListItemText primary={sub.name} primaryTypographyProps={{ fontSize: '0.85rem', color: pathname === `/category/${sub.slug}` ? '#00f2fe' : 'rgba(255,255,255,0.6)' }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            ))
          )}
        </List>
      </Box>

      {/* USER PROFILE & LOGOUT */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#4f46e5', fontSize: '0.8rem' }}>
                {user.email?.[0].toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white' }}>
                  {user.email?.split('@')[0]}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                  Enterprise User
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleLogout} size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ff4d4f', bgcolor: 'rgba(255,77,79,0.1)' } }}>
              <LogoutIcon fontSize="small"/>
            </IconButton>
          </Box>
        ) : (
          <ListItemButton onClick={() => router.push('/login')} sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><AccountCircleIcon /></ListItemIcon>
            <ListItemText primary="Login" />
          </ListItemButton>
        )}
      </Box>
    </Drawer>
  );
};
