import { Metadata } from 'next'
import { Sidebar } from '@/components/layout/Sidebar'
import { AuthGuard } from '@/components/AuthGuard'
import { Box } from '@mui/material'

export const metadata: Metadata = {
  title: 'AuraStyle AI',
  description: 'Enterprise Fashion AI Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#050505' }}>
        <Box sx={{ display: 'flex' }}>
          <Sidebar />
          <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', overflowX: 'hidden' }}>
            <AuthGuard>{children}</AuthGuard>
          </Box>
        </Box>
      </body>
    </html>
  )
}
