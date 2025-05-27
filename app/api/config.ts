// OpenAI APIキーを取得する関数
export const getApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OpenAI APIキーが設定されていません');
    return '';
  }
  return apiKey;
}; 