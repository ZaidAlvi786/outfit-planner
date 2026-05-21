'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { supabase } from '@/services/supabase';

const PUBLIC_ROUTES = ['/login', '/signup'];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      const hasSession = !!session;
      setAuthed(hasSession);
      setChecking(false);
      if (!hasSession && !isPublic) {
        router.replace('/login');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const hasSession = !!session;
      setAuthed(hasSession);
      if (!hasSession && !PUBLIC_ROUTES.includes(window.location.pathname)) {
        router.replace('/login');
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, isPublic, router]);

  if (isPublic) return <>{children}</>;

  if (checking || !authed) {
    return (
      <Box sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#050505'
      }}>
        <CircularProgress sx={{ color: '#00f2fe' }} />
      </Box>
    );
  }

  return <>{children}</>;
};
