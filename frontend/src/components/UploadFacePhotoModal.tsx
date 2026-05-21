'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  IconButton,
  CircularProgress,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import { supabase } from '@/services/supabase';

interface Props {
  open: boolean;
  onClose: (success?: boolean, newImageUrl?: string) => void;
  userId: string;
}

export default function UploadFacePhotoModal({ open, onClose, userId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'uploading' | 'updating' | 'success'>('idle');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'error' | 'success' | 'warning',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
  };

  const handleUpload = async () => {
    if (!file || !userId) return;
    setUploading(true);
    setStatus('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const aiRes = await fetch('http://localhost:8000/api/v1/user/analyze-face-photo', {
        method: 'POST',
        body: formData,
      });
      if (!aiRes.ok) throw new Error('Face analysis service unavailable. Is the backend running?');
      const aiResult = await aiRes.json();

      if (!aiResult.is_valid_headshot) {
        setSnackbar({
          open: true,
          message: aiResult.description || 'Please upload a clear, front-facing headshot.',
          severity: 'warning',
        });
        setStatus('idle');
        setUploading(false);
        return;
      }

      setStatus('uploading');
      const fileExt = file.name.split('.').pop();
      const fileName = `face-${userId}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      setStatus('updating');
      const { data: urlData } = supabase.storage.from('user-images').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const updateRes = await fetch('http://localhost:8000/api/v1/user/update-face-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, image_url: publicUrl }),
      });
      if (!updateRes.ok) throw new Error('Backend failed to save face photo.');

      setStatus('success');
      setTimeout(() => onClose(true, publicUrl), 1200);
    } catch (err: any) {
      console.error('Face upload failed:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Upload failed. Please try again.',
        severity: 'error',
      });
      setStatus('idle');
    } finally {
      setUploading(false);
    }
  };

  const buttonText = () => {
    switch (status) {
      case 'analyzing': return 'AI checking your headshot…';
      case 'uploading': return 'Uploading…';
      case 'updating': return 'Finishing up…';
      case 'success': return 'Saved!';
      default: return 'Upload & Analyze';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !uploading && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          p: 2,
        },
      }}
    >
      <Box sx={{ position: 'absolute', right: 16, top: 16 }}>
        <IconButton onClick={() => onClose()} disabled={uploading} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <FaceRetouchingNaturalIcon sx={{ fontSize: 48, color: '#f472b6', mb: 1 }} />
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          Upload a Headshot
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, maxWidth: 420, mx: 'auto' }}>
          We need a clear, front-facing photo of your head & shoulders so the AI can realistically
          swap different hairstyles onto you. Good lighting helps a lot.
        </Typography>

        <Box
          sx={{
            border: '2px dashed rgba(244,114,182,0.3)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'rgba(244,114,182,0.02)',
            height: 300,
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {preview ? (
            <Box component="img" src={preview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 60, color: '#f472b6', mb: 2, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'white', mb: 1 }}>
                Drag & Drop or Click to Select
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>PNG, JPG, WEBP</Typography>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </Box>

        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            onClick={() => onClose()}
            disabled={uploading}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || uploading || status === 'success'}
            startIcon={
              status === 'success' ? (
                <CheckCircleOutlineIcon />
              ) : uploading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CloudUploadIcon />
              )
            }
            sx={{
              bgcolor: status === 'success' ? '#4caf50' : '#f472b6',
              color: 'white',
              px: 4,
              borderRadius: 2,
              '&:hover': {
                bgcolor: status === 'success' ? '#4caf50' : '#ec4899',
              },
            }}
          >
            {buttonText()}
          </Button>
        </Stack>
      </DialogContent>

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
            bgcolor: 'rgba(20,20,20,0.9)',
            backdropFilter: 'blur(15px)',
            color: 'white',
            border: `1px solid ${snackbar.severity === 'error' ? 'rgba(244,67,54,0.5)' : 'rgba(244,114,182,0.5)'}`,
            borderRadius: 3,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
