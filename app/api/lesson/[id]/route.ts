import { NextResponse } from 'next/server';
import { supabase, LESSONS_TABLE, isDevelopment, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_LESSONS } from '@/app/constants/defaultLessons';

interface RouteContext {
  params: {
    id: string;
  };
}

// 特定のレッスンを取得するAPI
export async function GET(request: Request, context: RouteContext) {
  const { id } = context.params;
  
  console.log(`=== 特定レッスン取得API: レッスンID ${id} ===`);
  
  try {
    // Supabaseが設定されているか確認
    if (!isSupabaseConfigured) {
      console.log('Supabase未設定: デフォルトレッスンから検索します');
      
      // デフォルトレッスンから該当するレッスンを検索
      const lesson = DEFAULT_LESSONS.find(lesson => lesson.id === id);
      
      if (lesson) {
        console.log('デフォルトレッスンから見つかりました');
        return NextResponse.json({ 
          lesson,
          source: 'default'
        });
      }
      
      console.log('レッスンが見つかりませんでした');
      return NextResponse.json({ 
        error: 'レッスンが見つかりません',
        id
      }, { status: 404 });
    }
    
    // Supabaseからレッスンデータを取得
    console.log(`Supabaseテーブル「${LESSONS_TABLE}」からレッスンID「${id}」を検索します`);
    const { data, error } = await supabase
      .from(LESSONS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Supabaseからのレッスンデータ取得エラー:', error);
      
      // デフォルトレッスンから検索
      const defaultLesson = DEFAULT_LESSONS.find(lesson => lesson.id === id);
      if (defaultLesson) {
        console.log('デフォルトレッスンから見つかりました');
        return NextResponse.json({ 
          lesson: defaultLesson,
          source: 'default',
          error: error.message
        });
      }
      
      return NextResponse.json({ 
        error: 'レッスンの取得に失敗しました',
        details: error.message,
        id
      }, { status: 500 });
    }
    
    if (!data) {
      console.log('レッスンが見つかりませんでした');
      
      // デフォルトレッスンから検索
      const defaultLesson = DEFAULT_LESSONS.find(lesson => lesson.id === id);
      if (defaultLesson) {
        console.log('デフォルトレッスンから見つかりました');
        return NextResponse.json({ 
          lesson: defaultLesson,
          source: 'default'
        });
      }
      
      return NextResponse.json({ 
        error: 'レッスンが見つかりません',
        id
      }, { status: 404 });
    }
    
    console.log('レッスンが見つかりました:', data.id);
    return NextResponse.json({ 
      lesson: data,
      source: 'supabase'
    });
  } catch (error) {
    console.error('レッスンデータ取得エラー:', error);
    return NextResponse.json({ 
      error: 'エラーが発生しました',
      message: error instanceof Error ? error.message : String(error),
      id
    }, { status: 500 });
  }
} 