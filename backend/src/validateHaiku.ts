// 575バリデーション関数
// シンプルな実装: 文字数ベースでチェック（形態素解析なし）

export function validateHaiku(text: string): { valid: boolean; error?: string } {
  // 前後の空白を除去
  const trimmed = text.trim();

  // 空文字列チェック
  if (trimmed.length === 0) {
    return { valid: false, error: "投稿を入力してください" };
  }

  // スペース区切りで分解
  const lines = trimmed.split(/\s+/).filter((line) => line.length > 0);

  // 575判定（シンプルモード）
  if (lines.length === 3) {
    const counts = lines.map((line) => countMora(line));
    if (counts[0] === 5 && counts[1] === 7 && counts[2] === 5) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: `五七五になっておりません。現在: ${counts[0]}・${counts[1]}・${counts[2]}`,
      };
    }
  }

  // 全体で17文字チェック
  const totalMora = countMora(trimmed);
  if (totalMora <= 17 && totalMora >= 15) {
    // 厳密でない判定（バリアントとして、ユーザーが575を守らない場合の代替）
    return { valid: false, error: "スペース区切りで「5・7・5」の形式で投稿してください" };
  }

  return {
    valid: false,
    error: `投稿は五七五の形式で、スペース区切りで入力してください（現在: ${totalMora}字）`,
  };
}

// モーラ（音節）をカウント
// シンプル実装: 拗音（ゃ・ゅ・ょ）を1モーラとして数える
function countMora(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // ひらがな
    if (code >= 0x3041 && code <= 0x3096) {
      count++;
      // 次の文字が拗音（ゃ・ゅ・ょ）なら、それは数えない（ひとつの音節）
      if (i + 1 < text.length) {
        const nextCode = text[i + 1].charCodeAt(0);
        if (nextCode === 0x3083 || nextCode === 0x3085 || nextCode === 0x3087) {
          i++; // 次の文字をスキップ
        }
      }
    }
    // カタカナ
    else if (code >= 0x30a1 && code <= 0x30f6) {
      count++;
      // 次の文字が拗音（ャ・ュ・ョ）なら、それは数えない
      if (i + 1 < text.length) {
        const nextCode = text[i + 1].charCodeAt(0);
        if (nextCode === 0x30e3 || nextCode === 0x30e5 || nextCode === 0x30e7) {
          i++; // 次の文字をスキップ
        }
      }
    }
    // 漢字は1文字＝1音節として数える
    else if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff)) {
      count++;
    }
    // 英数字・その他は数えない（または1文字＝1音節にしたい場合は count++ する）
  }
  return count;
}
