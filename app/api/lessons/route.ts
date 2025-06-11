import { NextResponse } from 'next/server';
import { supabase, LESSONS_TABLE, isDevelopment, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_LESSONS } from '@/app/constants/defaultLessons';

// GETリクエスト（レッスンデータの取得）
export async function GET() {
  try {
    // デバッグ情報をログに出力
    console.log('==================== API GET リクエスト開始 ====================');
    console.log('環境変数詳細:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY長さ:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY先頭4文字:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 4) || 'なし');
    console.log('isDevelopment:', isDevelopment);
    console.log('isSupabaseConfigured:', isSupabaseConfigured);
    
    // Supabaseの接続テスト
    if (supabase) {
      try {
        console.log('Supabase接続テスト開始...');
        const { data: testData, error: testError } = await supabase
          .from('_tests_')
          .select('*')
          .limit(1)
          .single();
          
        if (testError && testError.code !== 'PGRST116') {  // PGRST116はテーブルが存在しないエラー
          console.error('Supabase接続テストエラー:', testError);
        } else {
          console.log('Supabase接続テスト成功');
        }
        
        // lessonsテーブルの存在確認
        console.log(`lessonsテーブル確認中...`);
        const { count, error: countError } = await supabase
          .from(LESSONS_TABLE)
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error(`lessonsテーブル確認エラー:`, countError);
        } else {
          console.log(`lessonsテーブル確認成功: ${count}件のレコードが存在します`);
        }
      } catch (e) {
        console.error('Supabase接続テスト例外:', e);
      }
    } else {
      console.error('Supabaseクライアントが初期化されていません');
    }
    
    // Supabaseが設定されていない場合はデフォルトレッスンを返す
    if (!isSupabaseConfigured) {
      console.log('Supabase未設定: デフォルトレッスンを返します');
      return NextResponse.json({ 
        lessons: DEFAULT_LESSONS,
        debug: {
          reason: 'Supabase未設定',
          isSupabaseConfigured,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
          supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定',
          environment: process.env.NODE_ENV
        }
      });
    }
    
    // Supabaseからレッスンデータを取得
    console.log(`Supabaseテーブル「${LESSONS_TABLE}」からデータ取得を試みます`);
    const { data, error } = await supabase
      .from(LESSONS_TABLE)
      .select('*')
      .order('updatedAt', { ascending: false });
    
    if (error) {
      console.error('Supabaseからのレッスンデータ取得エラー:', error);
      return NextResponse.json({ 
        lessons: DEFAULT_LESSONS,
        error: 'Supabaseからの取得エラー - デフォルトレッスンを返します',
        debug: { 
          error: error.message, 
          code: error.code,
          details: error.details,
          hint: error.hint,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SUPABASE_URL設定済み' : 'SUPABASE_URL未設定',
          supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ANON_KEY設定済み' : 'ANON_KEY未設定'
        }
      });
    }
    
    // データが空の場合はデフォルトレッスンを返す
    if (!data || data.length === 0) {
      console.log('Supabaseにデータなし: デフォルトレッスンを返します');
      
      // Supabaseにデフォルトレッスンを保存
      console.log('デフォルトレッスンをSupabaseに保存します');
      const { error: insertError } = await supabase
        .from(LESSONS_TABLE)
        .insert(DEFAULT_LESSONS);
        
      if (insertError) {
        console.error('デフォルトレッスンの保存エラー:', insertError);
      } else {
        console.log('デフォルトレッスンを保存しました');
      }
      
      return NextResponse.json({ 
        lessons: DEFAULT_LESSONS,
        debug: { 
          reason: 'データなし',
          defaultSaved: !insertError 
        }
      });
    }
    
    console.log(`Supabaseから${data.length}件のレッスンデータを取得しました`);
    return NextResponse.json({ 
      lessons: data,
      debug: { count: data.length }
    });
  } catch (error) {
    console.error('レッスンデータ取得エラー:', error);
    return NextResponse.json({ 
      lessons: DEFAULT_LESSONS,
      error: 'エラー発生 - デフォルトレッスンを返します',
      debug: { error: error instanceof Error ? error.message : String(error) }
    });
  }
}

// POSTリクエスト（レッスンデータの保存）
export async function POST(request: Request) {
  try {
    const { lessons } = await request.json();

    // デバッグ情報をログに出力
    console.log('==================== レッスン保存API - POSTリクエスト ====================');
    console.log('環境:', process.env.NODE_ENV);
    console.log('isDevelopment:', isDevelopment);
    console.log('isSupabaseConfigured:', isSupabaseConfigured);
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY長さ:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
    console.log('レッスン数:', lessons?.length);
    
    if (lessons && lessons.length > 0) {
      console.log('最初のレッスンID:', lessons[0].id);
      console.log('最初のレッスンタイトル:', lessons[0].title);
    }

    // レッスンデータのバリデーション
    if (!lessons || !Array.isArray(lessons)) {
      console.error('無効なレッスンデータ形式');
      return NextResponse.json({ error: 'レッスンデータが無効です' }, { status: 400 });
    }

    // Supabaseが初期化されているか厳密に確認
    if (!supabase) {
      console.error('Supabaseクライアントが初期化されていません');
      return NextResponse.json({ 
        success: false,
        error: 'Supabaseクライアントが初期化されていません',
        warning: 'ローカルのみに保存されました'
      });
    }
    
    // Supabaseの接続テスト
    console.log('Supabase接続テスト実行中...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('_tests_')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      if (testError && testError.code !== 'PGRST116') {  // PGRST116はテーブルが存在しないエラー
        console.error('Supabase接続テストエラー:', testError);
      } else {
        console.log('Supabase接続テスト成功');
      }
    } catch (e) {
      console.error('Supabase接続テスト例外:', e);
    }
    
    // レッスンテーブルの存在確認
    console.log(`レッスンテーブル「${LESSONS_TABLE}」の存在確認中...`);
    try {
      const { count, error: countError } = await supabase
        .from(LESSONS_TABLE)
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        if (countError.code === 'PGRST116') {
          console.error('レッスンテーブルが存在しません。セットアップが必要です。');
          return NextResponse.json({ 
            success: false,
            error: 'Supabaseにテーブルが存在しません。セットアップが必要です。',
            details: 'setup-supabase.sqlを実行してテーブルを作成してください。',
            debug: { error: countError }
          });
        } else {
          console.error('テーブル確認エラー:', countError);
        }
      } else {
        console.log(`レッスンテーブル確認成功: 現在${count}件のレコードが存在します`);
      }
    } catch (e) {
      console.error('テーブル確認エラー:', e);
    }
    
    // Supabaseにレッスンデータを保存
    console.log('既存データを削除中...');
    const { error: deleteError } = await supabase
      .from(LESSONS_TABLE)
      .delete()
      .neq('id', 'dummy'); // すべての行を削除
    
    if (deleteError) {
      console.error('データ削除エラー:', deleteError);
      return NextResponse.json({ 
        success: false,
        error: 'Supabaseのデータ削除に失敗しました',
        debug: { deleteError }
      });
    } else {
      console.log('既存データの削除に成功しました');
    }
    
    // レッスンごとに個別に挿入してエラーの詳細を確認
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`${lessons.length}件のレッスンデータを挿入します...`);
    
    for (const lesson of lessons) {
      try {
        // 問題がある可能性のあるフィールドをチェック
        const cleanLesson = {
          ...lesson,
          // 不正な値を修正
          createdAt: typeof lesson.createdAt === 'number' ? lesson.createdAt : Date.now(),
          updatedAt: typeof lesson.updatedAt === 'number' ? lesson.updatedAt : Date.now(),
          tags: Array.isArray(lesson.tags) ? lesson.tags : [],
        };
        
        const { error } = await supabase
          .from(LESSONS_TABLE)
          .insert(cleanLesson);
        
        if (error) {
          console.error(`ID「${lesson.id}」のレッスン保存エラー:`, error);
          errorCount++;
          errors.push({ id: lesson.id, error: error.message });
        } else {
          successCount++;
        }
      } catch (e) {
        console.error(`ID「${lesson.id}」のレッスン保存例外:`, e);
        errorCount++;
        errors.push({ id: lesson.id, error: e instanceof Error ? e.message : String(e) });
      }
    }
    
    console.log(`レッスンデータ保存完了: 成功=${successCount}, 失敗=${errorCount}`);
    
    if (errorCount > 0) {
      return NextResponse.json({ 
        success: successCount > 0,
        partialSuccess: successCount > 0,
        error: '一部のレッスンデータの保存に失敗しました',
        successCount,
        errorCount,
        errors
      });
    }
    
    return NextResponse.json({ 
      success: true,
      count: successCount
    });
  } catch (error) {
    console.error('レッスンデータ保存エラー:', error);
    return NextResponse.json({ 
      success: false,
      error: 'レッスンデータの保存に失敗しました',
      debug: { error: error instanceof Error ? error.message : String(error) }
    }, { status: 500 });
  }
} 