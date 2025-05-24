import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
}));

const MainContent = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}));

const NavButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  color: '#fff',
  marginRight: theme.spacing(2),
  fontWeight: active ? 'bold' : 'normal',
  '&:after': active ? {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60%',
    height: '3px',
    backgroundColor: theme.palette.secondary.main,
    borderRadius: '2px',
  } : {},
}));

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <StyledAppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            英会話学習アプリ
          </Typography>
          
          <Link href="/" passHref style={{ textDecoration: 'none' }}>
            <NavButton active={currentPath === '/'}>
              レッスン
            </NavButton>
          </Link>
          
          <Link href="/pdfs" passHref style={{ textDecoration: 'none' }}>
            <NavButton active={currentPath === '/pdfs'}>
              PDF教材
            </NavButton>
          </Link>
          
        </Toolbar>
      </StyledAppBar>
      <Container component="main" maxWidth="lg">
        <MainContent>
          {children}
        </MainContent>
      </Container>
    </Box>
  );
};

export default Layout; 