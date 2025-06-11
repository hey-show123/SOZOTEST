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
    
    // 開発環境の場合はデフォルトレッスンを返す (この条件を削除して常にSupabaseを使用)
    // if (isDevelopment) {
    //   console.log('開発環境: デフォルトレッスンを返します');
    //   return NextResponse.json({ 
    //     lessons: DEFAULT_LESSONS
    //   });
    // }

    // Supabaseからレッスンデータを取得
    const { data, error } = await supabase
      .from(LESSONS_TABLE)
      .select('*')
      .order('updatedAt', { ascending: false });
    
    if (error) {
      console.error('Supabaseからのレッスンデータ取得エラー:', error);
      return NextResponse.json({ 
        lessons: DEFAULT_LESSONS,
        error: 'Supabaseからの取得エラー - デフォルトレッスンを返します',
        debug: { error }
      });
    }
    
    // データが空の場合はデフォルトレッスンを返す
    if (!data || data.length === 0) {
      console.log('Supabaseにデータなし: デフォルトレッスンを返します');
      return NextResponse.json({ 
        lessons: DEFAULT_LESSONS,
        debug: { reason: 'データなし' }
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
      debug: { error }
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
    
    // 開発環境の場合も常にSupabaseに保存する (この条件を削除)
    // if (isDevelopment) {
    //   console.log('POST - 開発環境: ローカルのみに保存します');
    //   return NextResponse.json({ success: true });
    // }
    
    // Supabaseにレッスンデータを保存
    // 一度テーブルをクリア
    const { error: deleteError } = await supabase
      .from(LESSONS_TABLE)
      .delete()
      .neq('id', 'dummy'); // すべての行を削除
    
    if (deleteError) {
      console.error('POST - Supabaseのレッスンデータ削除エラー:', deleteError);
      return NextResponse.json({ 
        success: true,  // ローカルには保存されるのでtrueを返す
        warning: 'Supabaseへの保存に失敗しました',
        debug: { deleteError }
      });
    }
    
    // 新しいレッスンデータを挿入
    const { error: insertError } = await supabase
      .from(LESSONS_TABLE)
      .insert(lessons);
    
    if (insertError) {
      console.error('POST - Supabaseへのレッスンデータ保存エラー:', insertError);
      return NextResponse.json({ 
        success: true,  // ローカルには保存されるのでtrueを返す
        warning: 'Supabaseへの保存に失敗しました',
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
      debug: { error }
    }, { status: 500 });
  }
} 