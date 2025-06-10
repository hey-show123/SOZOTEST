import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDFファイルのみアップロードできます' },
        { status: 400 }
      );
    }

    // Vercelでのデプロイ時はファイルシステムに書き込めないため、
    // フロントエンドにファイルが選択されたことを伝えるだけの処理に変更
    if (process.env.VERCEL) {
      // Vercel環境では実際のファイル保存は行わず、成功レスポンスのみ返す
      return NextResponse.json(
        { 
          success: true,
          message: 'ファイルを選択しました。※Vercel環境ではファイルは保存されません。実際のファイルは手動でアップロードしてください。',
          fileName,
          url: `/pdfs/${fileName}`
        },
        { status: 200 }
      );
    }

    // 開発環境でのファイル保存処理
    try {
      // PDFディレクトリのパスを作成
      const pdfsDirectory = join(process.cwd(), 'public', 'pdfs');
      
      // ディレクトリが存在しない場合は作成
      if (!existsSync(pdfsDirectory)) {
        await mkdir(pdfsDirectory, { recursive: true });
      }

      // ファイルパスを作成
      const filePath = join(pdfsDirectory, fileName);

      // ファイルをバイト配列に変換
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // ファイルを保存
      await writeFile(filePath, buffer);

      return NextResponse.json(
        { 
          success: true,
          message: 'ファイルのアップロードに成功しました',
          fileName,
          url: `/pdfs/${fileName}`
        },
        { status: 200 }
      );
    } catch (fileError) {
      console.error('ファイル保存エラー:', fileError);
      return NextResponse.json(
        { error: 'ファイルの保存に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('PDFアップロードエラー:', error);
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

// 最大ファイルサイズを設定 (10MB)
export const config = {
  api: {
    bodyParser: false,
  },
}; 