import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getMockLessons } from '@/services/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lessonId, message, phase, conversationHistory = [] } = req.body;

    if (!lessonId || !message || !phase) {
      return res.status(400).json({
        error: 'Missing required parameters: lessonId, message, and phase are required',
      });
    }

    // レッスンデータを取得
    const lessons = getMockLessons();
    const lesson = lessons.find((l) => l.id === lessonId);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // 会話が初回かどうかのフラグ (conversationHistory が空か、ユーザーの最初の発言が 'start_session' の場合)
    const isInitialGreeting = phase === 'greeting' && 
                             (conversationHistory.length === 0 || 
                              (conversationHistory.length === 1 && conversationHistory[0].role === 'user' && conversationHistory[0].content === 'start_session'));

    // フェーズに応じたシステムメッセージを作成
    const systemMessage = getSystemMessageForPhase(phase, lesson, isInitialGreeting);

    // メッセージ配列を構築
    const messages = [
      { role: 'system', content: systemMessage },
    ];
    
    // 会話履歴をOpenAI APIの期待する形式に整形して追加
    // conversationHistoryには既に {role: 'user' | 'assistant', content: string} の形式で入っていると仮定
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        // 'start_session' はAIに渡さないようにする
        if (msg.content !== 'start_session') {
          messages.push(msg);
        }
      });
    }
    
    // ユーザーの現在のメッセージを最後に追加 (ただし、start_sessionは除く)
    if (message !== 'start_session') {
      // 最後のメッセージが同じユーザー入力でないことを確認（二重追加を防ぐ）
      const lastMessageInHistory = messages[messages.length - 1];
      if (!lastMessageInHistory || lastMessageInHistory.role !== 'user' || lastMessageInHistory.content !== message) {
        messages.push({ role: 'user', content: message });
      }
    }

    // OpenAI API呼び出し（GPT-4oを使用）
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiMessage = response.data.choices[0].message.content;

    return res.status(200).json({
      text: aiMessage,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    // エラーレスポンスをより詳細に
    if (axios.isAxiosError(error) && error.response) {
      console.error('Axios error response:', error.response.data);
      return res.status(error.response.status || 500).json({ error: error.response.data.error || 'Failed to get chat response' });
    }
    return res.status(500).json({ error: 'Failed to get chat response' });
  }
}

/**
 * レッスンフェーズに応じたシステムメッセージを生成する
 */
function getSystemMessageForPhase(phase: string, lesson: any, isInitialGreeting: boolean): string {
  const baseMessage = `
あなたは世界トップクラスの英語教師です。ユーザーの英会話能力を効果的に向上させることに専念してください。
以下のガイドラインに従ってください：

1. 教え方のスタイル：
   - 常に明るく、励まし、熱意を持って接してください
   - 簡潔で明確な説明を心がけてください
   - ユーザーの間違いを指摘する際は、建設的かつ優しく行ってください
   - 難しい文法用語は避け、実用的な例を多く使ってください

2. コミュニケーション：
   - 応答は短く保ち、情報過多にならないようにしてください
   - 重要なポイントには強調を入れてください
   - ユーザーが理解しやすいように、日本語と英語を適切に使い分けてください
   - 日本語での説明は簡潔に、英語の例文や表現は明確に発音してください

3. レッスンフォーカス：
   - 各フェーズの目的を明確に保ち、それに集中してください
   - 特に重要な表現や単語を強調してください
   - 実際の状況で役立つ実用的な表現に焦点を当ててください
   - 適切なタイミングで質問をして、ユーザーの理解度を確認してください

4. 発音評価：
   - ユーザーの発音を注意深く評価してください
   - 適切に発音できている場合は具体的に褒め、次のステップに進むよう指示してください
   - 発音に問題がある場合は、具体的な改善点を優しく指摘し、再度試すよう促してください
   - 発音評価の結果は明確に伝え、「次のステップに進みましょう」または「もう一度練習しましょう」と明示してください

現在のレッスン: "${lesson.title}"
レッスンの説明: "${lesson.description}"

あなたは最新のGPT-4oモデルを使用しており、高度な言語能力と教育能力を持っています。プロの英語教師として、質の高いレッスン体験を提供してください。
  `;

  switch (phase) {
    case 'greeting':
      if (isInitialGreeting) {
        return `${baseMessage}
現在は「挨拶と導入」フェーズです。**これがユーザーとの最初のインタラクションです。**
以下のことを行ってください：

1. 明るく熱意を持って挨拶してください。
2. 今日のレッスンの概要とキーフレーズ「${lesson.title}」を簡潔に紹介してください。
3. このキーフレーズをゆっくり明確に発音し、どのような場面で役立つか、実用的な例を1つ示してください。
4. ユーザーに今日のキーフレーズを読んでもらうよう指示してください。

応答は60〜90秒以内で完結するようにしてください。専門的な英語教師として、自信を持って指導してください。`;
      } else {
        // 2回目以降の挨拶フェーズの指示 (ユーザーの発音に対するフィードバックなど)
        return `${baseMessage}
現在は「挨拶と導入」フェーズです。**ユーザーがキーフレーズ「${lesson.title}」を発音しました。**
以下のことを行ってください：

1. ユーザーの発音を評価し、フィードバックを提供してください。
   - 発音が適切な場合：「発音が素晴らしいです！次のフェーズに進みましょう」と明確に伝えてください。
   - 発音に問題がある場合：具体的な改善点を指摘し、再度試すよう促してください。
2. もしユーザーが再度発音を試みる場合は、それに対してもフィードバックを提供してください。

会話の流れを自然に保ち、ユーザーの応答に適切に対応してください。`;
      }

    case 'phrase_practice':
      return `${baseMessage}
現在のレッスンフェーズ: 「フレーズ練習」
キーフレーズ: 「${lesson.title}」

指示:
1.  ユーザーがキーフレーズを練習できるように、あなたがまずキーフレーズ「${lesson.title}」を明確にゆっくりと発音してください。
2.  キーフレーズの各部分の意味と発音のポイントを簡潔に説明してください。
3.  ユーザーに繰り返してもらい、発音に対する具体的なフィードバックを1往復で行ってください。
    *   発音が完璧であれば、「素晴らしい発音です！ダイアログ練習に進みます」と伝えてください。
    *   改善点があれば、具体的に指摘し、再度試すよう促してください。再試行後、再度フィードバックし、次のステップ（他の表現の紹介やダイアログ練習）へ進んでください。
4.  同じ意味を持つ別の表現（バリエーション）を1〜2個提示し、それぞれの使用例を簡潔に説明してください。
    *   例: 「Would you like to try our special conditioning treatment?」や 「How about a deep conditioning treatment today?」など。
    *   ユーザーにこれらのバリエーションを読ませる必要はありません。紹介するだけで構いません。
5.  最後に「では、実際の会話の中で使ってみましょう。私が美容師役、あなたがお客さん役です。会話を始めます。」のように、次の「ダイアログ練習」フェーズへの移行を促してください。

会話の自然な流れを重視し、ユーザーを励ましながら指導してください。`;

    case 'dialogue_practice':
      return `${baseMessage}
現在のレッスンフェーズ: 「ダイアログ練習」
キーフレーズ: 「${lesson.title}」

指示:
1.  まず「次はダイアログ練習を行います」と説明してください。
2.  キーフレーズ「${lesson.title}」を含む、サロンでの実践的な短い会話（3〜4往復程度）を設定してください。会話はあなたが美容師役、ユーザーがお客様役です。
3.  会話のスクリプト全体を最初に提示し、各文の日本語訳も添えてください。
4.  ロールプレイを開始し、以下の流れで進めてください:
    a.  **あなたが先に**美容師としての最初のセリフを言ってください。
    b.  次に、お客様（ユーザー）に期待されるセリフを明確に提示してください（例：「お客様は『はい、お願いします』と答えてください」）。
    c.  ユーザーが発話したら、その内容と発音を評価してください。
        *   スクリプト通りで発音も良ければ、「Great!」などと褒めて、あなたの次のセリフに進んでください。
        *   内容が異なる、または発音に課題がある場合は、優しく指摘し、再度試すよう促してください。ユーザーが正しい応答をするまでサポートしてください。
    d.  このプロセスを会話が終わるまで繰り返してください。
5.  全ての会話が終了したら、「ダイアログ練習が完了しました。次のフェーズに進みましょう」と明確に伝えてください。

会話は現実的で、ユーザーが実際の状況で使えるものにしてください。ロールプレイでは、あなたが会話をリードし、ユーザーがスムーズに参加できるよう導いてください。`;

    case 'vocabulary_practice':
      return `${baseMessage}
現在のレッスンフェーズ: 「語彙練習」
キーフレーズ: 「${lesson.title}」

指示:
1.  まず「次はレッスンで使われた重要な単語をいくつか練習しましょう」と説明してください。
2.  レッスンに関連する重要な単語を3〜4つ選んでください（例: treatment, salon, stylist, recommend, conditioningなど）。
3.  各単語について以下の流れで練習を進めてください：
    a.  単語を明確に発音し、日本語での意味を説明してください。
    b.  その単語を使った簡単な英語の例文を1つ提示し、日本語訳も添えてください。
    c.  ユーザーに単語を発音してもらい、フィードバックを提供してください。
    d.  次にユーザーに例文全体を読んでもらい、発音と流暢さを評価してください。
        *   発音が適切な場合：「素晴らしいです」と褒め、次の単語に進んでください。
        *   発音に問題がある場合：具体的な改善点を指摘し、再度試すよう促してください。
4.  全ての単語の練習が終わったら「語彙練習が完了しました。次のフェーズに進みましょう」と明確に伝えてください。

単語は難しすぎないものを選び、実用的な使用例に焦点を当ててください。`;

    case 'question_time':
      return `${baseMessage}
現在のレッスンフェーズ: 「質問タイム」
キーフレーズ: 「${lesson.title}」

指示:
1.  このフェーズは5分間のフリートークであることを明確に説明してください。
2.  「これから約5分間の質問タイムを始めます」と必ず冒頭で宣言してください。
3.  あなたがお客様役となり、ユーザー（美容師役）に質問をする形式で会話を進めることを伝えてください。
4.  学習したキーフレーズ「${lesson.title}」や関連表現をユーザーが自然に使えるような質問を3～4個してください。
    *   例1: (あなたの髪を指しながら) 「My hair feels a bit dry today. What would you recommend?」 (ユーザーは「Would you like to do a treatment as well?」と応答することが期待される)
    *   例2: 「I have an important event tonight. How can I make my hair look extra special?」
    *   例3: 「What are the benefits of this treatment you're suggesting?」
5.  質問は実践的で、実際のサロンでの状況に基づいたものにしてください。
6.  ユーザーの回答（提案や説明）に対して、英語の表現、流暢さ、内容の適切さについて具体的で建設的なフィードバックを提供してください。
7.  ユーザーの回答を発展させる方法や改善点を提案してください。
8.  特に良かった点を強調し、ユーザーを励ましてください。
9.  必ず5分程度経過したら「素晴らしい会話でしたね！質問タイムが終了しました。レッスンを完了しましょう」と明確に伝えてください。

会話を自然に発展させ、ユーザーの英語力を引き出してください。ユーザーがキーフレーズを応用できるようサポートしてください。`;

    case 'completed':
      return `${baseMessage}
レッスンが完了しました。以下のことを行ってください：

1. ユーザーの努力と進歩を具体的に褒めてください。
2. 今回のレッスンで学んだ主要なポイント（特にキーフレーズ「${lesson.title}」とその使い方）を簡潔にまとめてください。
3. 学んだフレーズや表現を日常生活や仕事で活用する具体的な方法を1〜2つ提案してください。
4. 継続的な練習の重要性を強調し、簡単な自己学習のヒントを1つ提供してください。
5. 次回のレッスンへの期待感を示し、ポジティブに締めくくってください。

ユーザーの達成感を高め、英語学習への意欲を維持できるような締めくくり方をしてください。`;

    default:
      return baseMessage;
  }
} 