import React from 'react';
import { Container, Typography, Box, Grid, Paper } from '@mui/material';
import Layout from '@/components/common/Layout';
import LearningSession from '@/components/learning/LearningSession';

const Home: React.FC = () => {
  const handleSessionComplete = (data: {
    duration: number;
    turns: number;
    accuracy: number;
  }) => {
    console.log('セッション完了:', data);
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            英会話学習アプリ
          </Typography>
          
          <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
            AIと会話して英語力を向上させましょう
          </Typography>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <LearningSession
                scenarioId="basic_conversation"
                onComplete={handleSessionComplete}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Layout>
  );
};

export default Home; 