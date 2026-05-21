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
  Fade,
  Stack,
  Snackbar,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { supabase } from '@/services/supabase';

interface UploadProfileImageModalProps {
  open: boolean;
  onClose: (success?: boolean, newImageUrl?: string) => void;
  userId: string;
}

export default function UploadProfileImageModal({ open, onClose, userId }: UploadProfileImageModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'analyzing' | 'uploading' | 'updating' | 'success'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'error' | 'success' | 'warning' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setSuccess(false);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) return;

    setUploading(true);
    setUploadStatus('analyzing');
    try {
      // 1. AI Analysis Step
      const formData = new FormData();
      formData.append('file', file);

      const aiResponse = await fetch('http://localhost:8000/api/v1/user/analyze-body-photo', {
        method: 'POST',
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error('Backend analysis service is currently unavailable. Please ensure your backend is running.');
      }

      const aiResult = await aiResponse.json();
      
      if (!aiResult.is_full_body) {
        setSnackbar({ 
          open: true, 
          message: aiResult.description || "Please upload a full-body photo (head to toe) for the virtual try-on to work correctly.",
          severity: 'warning'
        });
        setUploading(false);
        setUploadStatus('idle');
        return;
      }

      // 2. Upload to Storage
      setUploadStatus('uploading');
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get Public URL & Update Profile
      setUploadStatus('updating');
      const { data: urlData } = supabase.storage
        .from('user-images')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;

      const updateResponse = await fetch('http://localhost:8000/api/v1/user/update-profile-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          image_url: publicUrl
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Backend failed to securely save profile image.');
      }

      setSuccess(true);
      setUploadStatus('success');
      setTimeout(() => {
        onClose(true, publicUrl);
      }, 1500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Upload failed. Please ensure your backend is running and try again.',
        severity: 'error'
      });
      setUploadStatus('idle');
    } finally {
      setUploading(false);
    }
  };

  const getButtonText = () => {
    switch (uploadStatus) {
      case 'analyzing': return 'AI Analyzing Photo...';
      case 'uploading': return 'Saving to Cloud...';
      case 'updating': return 'Finishing Up...';
      case 'success': return 'Success!';
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
          bgcolor: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          p: 2
        }
      }}
    >
      <Box sx={{ position: 'absolute', right: 16, top: 16 }}>
        <IconButton onClick={() => onClose()} disabled={uploading} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          Step into your Virtual Wardrobe
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
          To experience the full 3D visualization, please upload a clear, full-body photo of yourself.
        </Typography>

        <Box 
          sx={{ 
            border: '2px dashed rgba(0, 242, 254, 0.3)',
            borderRadius: 4,
            p: 4,
            mb: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'rgba(0, 242, 254, 0.02)',
            transition: 'all 0.3s ease',
            height: 300,
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {preview ? (
            <Box component="img" src={preview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 60, color: '#00f2fe', mb: 2, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'white', mb: 1 }}>Drag & Drop or Click to Select</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Support PNG, JPG, WEBP</Typography>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
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
            disabled={!file || uploading || success}
            startIcon={success ? <CheckCircleOutlineIcon /> : (uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />)}
            sx={{
              bgcolor: success ? '#4caf50' : '#4f46e5',
              color: 'white',
              px: 4,
              borderRadius: 2,
              '&:hover': {
                bgcolor: success ? '#4caf50' : '#3f36c5'
              }
            }}
          >
            {getButtonText()}
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
          iconMapping={{
            error: <ErrorOutlineIcon fontSize="inherit" />,
            warning: <InfoOutlinedIcon fontSize="inherit" />,
          }}
          sx={{ 
            width: '100%',
            bgcolor: 'rgba(20, 20, 20, 0.9)',
            backdropFilter: 'blur(15px)',
            color: 'white',
            border: `1px solid ${snackbar.severity === 'error' ? 'rgba(244, 67, 54, 0.5)' : 'rgba(0, 242, 254, 0.5)'}`,
            borderRadius: 3,
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            '& .MuiAlert-icon': {
              color: snackbar.severity === 'error' ? '#f44336' : '#00f2fe'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
