import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Button, List, ListItem, ListItemText, IconButton, Divider, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Layout from '@/components/common/Layout';
import { pdfService } from '@/services/api';

const PDFPage: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // PDFファイル一覧を取得
  const fetchPDFs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await pdfService.getAllPdfs();
      setPdfFiles(response.files || []);
    } catch (error) {
      console.error('PDF一覧取得エラー:', error);
      setError('PDFファイルの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 初回レンダリング時にPDF一覧を取得
  useEffect(() => {
    fetchPDFs();
  }, []);

  // PDFファイルをアップロード
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.pdf')) {
      setError('PDFファイルのみアップロード可能です');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await pdfService.uploadPdf(file);
      
      // アップロード成功後、ファイル一覧を再取得
      await fetchPDFs();
      setSuccess(`${file.name} がアップロードされました`);
    } catch (error) {
      console.error('PDFアップロードエラー:', error);
      setError('PDFファイルのアップロードに失敗しました');
    } finally {
      setIsLoading(false);
      // input要素をリセット
      event.target.value = '';
    }
  };

  // PDFファイルを削除
  const handleDeletePDF = async (filename: string) => {
    if (!confirm(`${filename} を削除してもよろしいですか？`)) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await pdfService.deletePdf(filename);
      
      // 削除成功後、ファイル一覧を再取得
      await fetchPDFs();
      setSuccess(`${filename} が削除されました`);
    } catch (error) {
      console.error('PDF削除エラー:', error);
      setError('PDFファイルの削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // PDFファイルをダウンロード
  const handleViewPDF = (filename: string) => {
    const pdfUrl = pdfService.getPdfUrl(filename);
    window.open(pdfUrl, '_blank');
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Typography variant="h4" component="h1" gutterBottom align="center">
          PDF教材管理
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              PDFアップロード
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<FileUploadIcon />}
                disabled={isLoading}
              >
                PDFを選択
                <input
                  type="file"
                  accept=".pdf"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                PDFファイルを選択してアップロードします
              </Typography>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            PDF一覧
          </Typography>
          
          {isLoading ? (
            <Typography color="text.secondary">読み込み中...</Typography>
          ) : pdfFiles.length === 0 ? (
            <Typography color="text.secondary">PDFファイルがありません</Typography>
          ) : (
            <List>
              {pdfFiles.map((filename, index) => (
                <React.Fragment key={filename}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDeletePDF(filename)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={filename} 
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewPDF(filename)}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Layout>
  );
};

export default PDFPage; 