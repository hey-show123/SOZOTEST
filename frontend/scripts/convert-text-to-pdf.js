// テキストファイルをPDFに変換するスクリプト
// PDFKitを使用するには、npm install pdfkit fs-extraが必要です

const fs = require('fs-extra');
const PDFDocument = require('pdfkit');
const path = require('path');

// 変換するテキストファイルがあるディレクトリ
const pdfDir = path.join(__dirname, '../public/pdfs');

// テキストファイルをPDFに変換する関数
async function convertTextToPDF(textFilePath, pdfFilePath) {
  try {
    // テキストファイルの内容を読み込む
    const textContent = await fs.readFile(textFilePath, 'utf8');
    
    // PDFドキュメントを作成
    const doc = new PDFDocument();
    
    // PDFファイルに書き込むためのストリームを作成
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);
    
    // テキスト内容をPDFに追加
    doc.fontSize(12).text(textContent);
    
    // PDFの生成を終了
    doc.end();
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`PDF created: ${pdfFilePath}`);
        resolve();
      });
      
      writeStream.on('error', (err) => {
        console.error(`Error creating PDF: ${err}`);
        reject(err);
      });
    });
  } catch (err) {
    console.error(`Error converting text to PDF: ${err}`);
    throw err;
  }
}

// メイン処理
async function main() {
  try {
    // PDFディレクトリ内のすべてのファイルを取得
    const files = await fs.readdir(pdfDir);
    
    // .txtファイルを検索して変換
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const textFilePath = path.join(pdfDir, file);
        const pdfFilePath = path.join(pdfDir, file.replace('.txt', '.pdf'));
        
        await convertTextToPDF(textFilePath, pdfFilePath);
      }
    }
    
    console.log('All text files converted to PDF');
  } catch (err) {
    console.error(`Error in main process: ${err}`);
  }
}

// スクリプトの実行
main(); 