'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonIcon from '@mui/icons-material/Person';
import AddCommentIcon from '@mui/icons-material/AddComment';
import { supabase } from '@/services/supabase';

type Msg = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'Plan an outfit for a summer wedding',
  'What should I wear to a job interview?',
  'Build me a weekend streetwear look',
  'Date night outfit ideas for me',
];

const GREETING =
  "Hi — I'm AuraStyle, your personal outfit planner. Tell me what you're dressing for and I'll build you a look that suits your profile.";

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const nextMessages: Msg[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Assistant request failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const resetChat = () => {
    if (loading) return;
    setMessages([]);
    setInput('');
  };

  const showIntro = messages.length === 0;

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#050505',
        color: 'white',
        backgroundImage:
          'radial-gradient(circle at 20% 0%, rgba(192,132,252,0.12), transparent 55%), radial-gradient(circle at 80% 100%, rgba(0,242,254,0.08), transparent 55%)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          bgcolor: 'rgba(5,5,5,0.6)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'transparent',
              background: 'linear-gradient(135deg, #c084fc, #00f2fe)',
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              AI Outfit Assistant
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>
              Trained for fashion & personal styling
            </Typography>
          </Box>
        </Box>
        <Tooltip title="New chat">
          <span>
            <IconButton
              onClick={resetChat}
              disabled={loading || messages.length === 0}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <AddCommentIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: { xs: 2, md: 0 },
          py: 4,
        }}
      >
        <Container maxWidth="md">
          {showIntro && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  mx: 'auto',
                  mb: 3,
                  bgcolor: 'transparent',
                  background: 'linear-gradient(135deg, #c084fc, #00f2fe)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  mb: 2,
                  background: 'linear-gradient(45deg, #fff, #a5a5a5)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                How can I style you today?
              </Typography>
              <Typography variant="body1" sx={{ color: '#888', maxWidth: 560, mx: 'auto', mb: 5 }}>
                {GREETING}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                justifyContent="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ maxWidth: 720, mx: 'auto' }}
              >
                {STARTERS.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    onClick={() => send(s)}
                    sx={{
                      py: 2.5,
                      px: 0.5,
                      fontSize: '0.9rem',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.9)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(192,132,252,0.1)',
                        border: '1px solid rgba(192,132,252,0.3)',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}

          {loading && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'transparent',
                  background: 'linear-gradient(135deg, #c084fc, #00f2fe)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5 }}>
                <CircularProgress size={14} sx={{ color: '#c084fc' }} />
                <Typography variant="body2" sx={{ color: '#888' }}>
                  Styling your look…
                </Typography>
              </Box>
            </Box>
          )}
        </Container>
      </Box>

      {/* Composer */}
      <Box
        sx={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          bgcolor: 'rgba(5,5,5,0.7)',
          px: { xs: 2, md: 0 },
          py: 3,
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1,
              p: 1,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'border 0.2s',
              '&:focus-within': { border: '1px solid rgba(192,132,252,0.4)' },
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder="Describe your event, vibe, or what you already own..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: { color: 'white', px: 1.5, py: 1, fontSize: '0.95rem' },
              }}
              disabled={loading}
            />
            <IconButton
              onClick={() => send()}
              disabled={loading || !input.trim()}
              sx={{
                background: input.trim() && !loading ? 'linear-gradient(135deg, #c084fc, #00f2fe)' : 'rgba(255,255,255,0.05)',
                color: 'white',
                borderRadius: 2,
                width: 42,
                height: 42,
                '&:hover': {
                  background: input.trim() ? 'linear-gradient(135deg, #a855f7, #00c6d4)' : 'rgba(255,255,255,0.08)',
                },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: '#555', display: 'block', textAlign: 'center', mt: 1.5 }}>
            AuraStyle uses your profile (body type, skin tone) when available. Enter to send · Shift+Enter for newline.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? '#4f46e5' : 'transparent',
          background: isUser ? '#4f46e5' : 'linear-gradient(135deg, #c084fc, #00f2fe)',
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box
        sx={{
          maxWidth: '85%',
          px: 2.5,
          py: 1.5,
          borderRadius: 3,
          bgcolor: isUser ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isUser ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.65,
            fontSize: '0.95rem',
          }}
        >
          {msg.content}
        </Typography>
      </Box>
    </Box>
  );
}
