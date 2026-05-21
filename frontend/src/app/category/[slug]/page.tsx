'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent,
  Skeleton
} from '@mui/material';

import { supabase } from '@/services/supabase';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const categoryName = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const perPage = 12;

  const handleProductClick = (product: any) => {
    router.push(`/category/${slug}/${product.id}`);
  };

  const fetchProducts = React.useCallback(async (pageNum: number, isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    
    try {
      // 1. Resolve slug to either a subcategory or a category
      // First try subcategory
      const { data: subData } = await supabase
        .from('subcategories')
        .select('id')
        .eq('slug', slug)
        .single();

      let query = supabase.from('products').select('*', { count: 'exact' });

      if (subData) {
        query = query.eq('subcategory_id', subData.id);
      } else {
        // Try category
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', slug)
          .single();

        if (catData) {
          // Find all subcategories for this category
          const { data: allSubcats } = await supabase
            .from('subcategories')
            .select('id')
            .eq('category_id', catData.id);
          
          if (allSubcats && allSubcats.length > 0) {
            query = query.in('subcategory_id', allSubcats.map(s => s.id));
          }
        } else if (slug !== 'all') {
          // Fallback fuzzy search if no ID mapping found
          query = query.ilike('name', `%${categoryName}%`);
        }
      }

      const from = pageNum * perPage;
      const to = from + perPage - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (data) {
        setProducts(prev => isInitial ? data : [...prev, ...data]);
        setHasMore(count ? (from + data.length) < count : data.length === perPage);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, categoryName]);

  React.useEffect(() => {
    setProducts([]);
    setPage(0);
    fetchProducts(0, true);
  }, [slug, fetchProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#050505', 
      color: 'white',
      pt: 10,
      pb: 8
    }}>
      <Container maxWidth="xl">
        <Typography variant="h3" sx={{ 
            fontWeight: 900, 
            mb: 1,
            background: 'linear-gradient(45deg, #fff, #a5a5a5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        }}>
          {categoryName}
        </Typography>
        <Typography variant="h6" sx={{ color: '#888', mb: 6, fontWeight: 300 }}>
          {loading ? 'Searching our collection...' : `Found ${products.length} items in ${categoryName.toLowerCase()}.`}
        </Typography>

        <Grid container spacing={3}>
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item}>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
              </Grid>
            ))
          ) : products.length > 0 ? (
            products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card 
                  onClick={() => handleProductClick(product)}
                  sx={{ 
                    height: '100%', 
                    bgcolor: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <Box sx={{ position: 'relative', pt: '120%', bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                    <CardMedia
                      component="img"
                      image={product.image_url || 'https://via.placeholder.com/400x500/111/444?text=Product'}
                      alt={product.name}
                      sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="caption" sx={{ color: '#00f2fe', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
                      {product.metadata?.source || 'Premium Collection'}
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mt: 0.5, noWrap: true }}>
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                        ${product.price ? product.price.toFixed(2) : '299.00'}
                      </Typography>
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#4f46e5', opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
                <Typography variant="h5">No products found in this category yet.</Typography>
                <Typography variant="body1">Use the Scraper Tool to import new items!</Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <Box
              component="button"
              onClick={handleLoadMore}
              disabled={loading}
              sx={{
                px: 6,
                py: 2,
                borderRadius: '50px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:disabled': {
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }
              }}
            >
              {loading ? 'Loading...' : 'Load More Items'}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
