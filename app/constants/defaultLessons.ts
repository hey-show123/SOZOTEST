import { Lesson } from '@/app/types/lesson';
import { v4 as uuidv4 } from 'uuid';

// デフォルトのレッスンデータ
export const DEFAULT_LESSONS: Lesson[] = [
  {
    id: 'welcome-lesson',
    title: '英会話入門: 自己紹介',
    description: '基本的な自己紹介のフレーズと会話を学びましょう。初めての英会話に最適です。',
    level: '初級',
    tags: ['自己紹介', '基本会話'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    headerTitle: 'レッスン: 自己紹介',
    startButtonText: 'レッスンを始める',
    systemPrompt: 'あなたは英会話の先生です。生徒が英語で自己紹介の練習をしています。適切にサポートしてください。',
    keyPhrase: {
      english: 'Nice to meet you!',
      japanese: 'はじめまして！'
    },
    dialogueTurns: [
      {
        id: uuidv4(),
        speaker: 'teacher',
        english: 'Hello! Nice to meet you. My name is Emma. What\'s your name?',
        japanese: 'こんにちは！はじめまして。私の名前はエマです。あなたの名前は？'
      },
      {
        id: uuidv4(),
        speaker: 'user',
        english: 'Nice to meet you, Emma. My name is [your name].',
        japanese: 'はじめまして、エマ。私の名前は[あなたの名前]です。'
      },
      {
        id: uuidv4(),
        speaker: 'teacher',
        english: 'Where are you from?',
        japanese: '出身はどこですか？'
      },
      {
        id: uuidv4(),
        speaker: 'user',
        english: 'I\'m from Japan.',
        japanese: '日本出身です。'
      },
      {
        id: uuidv4(),
        speaker: 'teacher',
        english: 'What do you do for work?',
        japanese: 'お仕事は何をしていますか？'
      },
      {
        id: uuidv4(),
        speaker: 'user',
        english: 'I work as a [your job].',
        japanese: '私は[あなたの職業]として働いています。'
      }
    ],
    goals: [
      {
        id: uuidv4(),
        english: 'Introduce yourself',
        japanese: '自己紹介をする'
      },
      {
        id: uuidv4(),
        english: 'Ask and answer basic questions',
        japanese: '基本的な質問をする・答える'
      }
    ]
  },
  {
    id: 'ordering-food',
    title: 'レストランでの注文',
    description: 'レストランでの注文方法を学びましょう。メニューの読み方や注文の仕方を練習します。',
    level: '初級',
    tags: ['レストラン', '注文', '日常会話'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    headerTitle: 'レッスン: レストランでの注文',
    startButtonText: '注文の練習を始める',
    systemPrompt: 'あなたはレストランのウェイターです。お客さんが注文をしています。適切に応対してください。',
    keyPhrase: {
      english: 'I would like to order, please.',
      japanese: '注文したいです。'
    },
    dialogueTurns: [
      {
        id: uuidv4(),
        speaker: 'teacher',
        english: 'Hello! Welcome to our restaurant. Are you ready to order?',
        japanese: 'こんにちは！当レストランへようこそ。ご注文はお決まりですか？'
      },
      {
        id: uuidv4(),
        speaker: 'user',
        english: 'Yes, I would like to order, please.',
        japanese: 'はい、注文したいです。'
      },
      {
        id: uuidv4(),
        speaker: 'teacher',
        english: 'What would you like to have?',
        japanese: '何にしますか？'
      },
      {
        id: uuidv4(),
        speaker: 'user',
        english: 'I\'ll have a hamburger and a cola, please.',
        japanese: 'ハンバーガーとコーラをお願いします。'
      },
      {
        id: uuidv4(),
        speaker: 'teacher',
        english: 'Would you like any side dishes with that?',
        japanese: 'サイドメニューはいかがですか？'
      },
      {
        id: uuidv4(),
        speaker: 'user',
        english: 'Yes, I\'d like some french fries.',
        japanese: 'はい、フライドポテトをお願いします。'
      }
    ],
    goals: [
      {
        id: uuidv4(),
        english: 'Order food at a restaurant',
        japanese: 'レストランで食事を注文する'
      },
      {
        id: uuidv4(),
        english: 'Understand menu items',
        japanese: 'メニュー項目を理解する'
      }
    ]
  }
]; 