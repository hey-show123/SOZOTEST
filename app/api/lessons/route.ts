import { NextResponse } from 'next/server';
import { supabase, LESSONS_TABLE, isDevelopment, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_LESSONS } from '@/app/constants/defaultLessons';

// GETリクエスト（レッスンデータの取得）
export async function GET() {
  try {
    // デバッグ情報をログに出力
    console.log('Environment:', process.env.NODE_ENV);
    console.log('isDevelopment:', isDevelopment);
    console.log('isSupabaseConfigured:', isSupabaseConfigured);
    console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Supabaseの接続テスト
    if (supabase) {
      try {
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
      } catch (e) {
        console.error('Supabase接続テスト例外:', e);
      }
    }
    
    // Supabaseが設定されていない場合はデフォルトレッスンを返す
    if (!isSupabaseConfigured) {
      console.log('Supabase未設定: デフォルトレッスンを返します');
      return NextResponse.json({ 
        lessons: DEFAULT_LESSONS,
        debug: {
          reason: 'Supabase未設定',
          isSupabaseConfigured
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
        debug: { error: error.message, code: error.code }
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
    console.log('POST - Environment:', process.env.NODE_ENV);
    console.log('POST - isDevelopment:', isDevelopment);
    console.log('POST - isSupabaseConfigured:', isSupabaseConfigured);
    console.log('POST - SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('POST - SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log('POST - レッスン数:', lessons?.length);

    // レッスンデータのバリデーション
    if (!lessons || !Array.isArray(lessons)) {
      return NextResponse.json({ error: 'レッスンデータが無効です' }, { status: 400 });
    }

    // Supabaseが設定されていない場合は警告を返す
    if (!isSupabaseConfigured) {
      console.log('POST - Supabase未設定: ローカルのみに保存します');
      return NextResponse.json({ 
        success: true,
        warning: 'Supabase未設定のためローカルのみに保存されました',
        debug: { isSupabaseConfigured }
      });
    }
    
    // Supabaseの接続テスト
    if (supabase) {
      try {
        const { data: testData, error: testError } = await supabase
          .from('_tests_')
          .select('*')
          .limit(1)
          .single();
          
        if (testError && testError.code !== 'PGRST116') {  // PGRST116はテーブルが存在しないエラー
          console.error('POST - Supabase接続テストエラー:', testError);
        } else {
          console.log('POST - Supabase接続テスト成功');
        }
      } catch (e) {
        console.error('POST - Supabase接続テスト例外:', e);
      }
    }
    
    // テーブルの存在確認と作成
    try {
      // 簡易的なテーブル存在確認（レコード数の取得）
      const { count, error: countError } = await supabase
        .from(LESSONS_TABLE)
        .select('*', { count: 'exact', head: true });
        
      if (countError && countError.code === 'PGRST116') {
        console.log('POST - レッスンテーブルが存在しません。SQLファイルを実行する必要があります。');
        return NextResponse.json({ 
          success: false,
          error: 'Supabaseにテーブルが存在しません。セットアップが必要です。',
          debug: { error: countError }
        });
      }
    } catch (e) {
      console.error('POST - テーブル確認エラー:', e);
    }
    
    // Supabaseにレッスンデータを保存
    // 一度テーブルをクリア
    console.log('POST - テーブルの既存データをクリアします');
    const { error: deleteError } = await supabase
      .from(LESSONS_TABLE)
      .delete()
      .neq('id', 'dummy'); // すべての行を削除
    
    if (deleteError) {
      console.error('POST - Supabaseのレッスンデータ削除エラー:', deleteError);
      return NextResponse.json({ 
        success: false,
        error: 'Supabaseのデータ削除に失敗しました',
        debug: { deleteError }
      });
    }
    
    // 新しいレッスンデータを挿入
    console.log(`POST - ${lessons.length}件のレッスンデータを挿入します`);
    const { error: insertError } = await supabase
      .from(LESSONS_TABLE)
      .insert(lessons);
    
    if (insertError) {
      console.error('POST - Supabaseへのレッスンデータ保存エラー:', insertError);
      return NextResponse.json({ 
        success: false,
        error: 'Supabaseへのデータ保存に失敗しました',
        debug: { insertError }
      });
    }
    
    console.log(`POST - Supabaseに${lessons.length}件のレッスンデータを保存しました`);
    return NextResponse.json({ 
      success: true,
      debug: { count: lessons.length }
    });
  } catch (error) {
    console.error('POST - レッスンデータ保存エラー:', error);
    return NextResponse.json({ 
      success: false,
      error: 'レッスンデータの保存に失敗しました',
      debug: { error: error instanceof Error ? error.message : String(error) }
    }, { status: 500 });
  }
} 