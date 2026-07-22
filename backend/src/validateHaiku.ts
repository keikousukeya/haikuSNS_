// 575バリデーション関数
// シンプルな実装: 文字数ベースでチェック（形態素解析なし）
// 「字余り」「字足らず」は伝統的な俳句の技法として実際に用いられるため、
// 各行の音数は目安5・7・5からの誤差を許容範囲内なら合格とする。

const MORA_TOLERANCE = 1; // 各行で許容する目安音数からのズレ（字余り・字足らず）

export function validateHaiku(text: string): { valid: boolean; error?: string } {
  // 前後の空白を除去
  const trimmed = text.trim();

  // 空文字列チェック
  if (trimmed.length === 0) {
    return { valid: false, error: "投稿を入力してください" };
  }

  // スペース区切りで分解
  const lines = trimmed.split(/\s+/).filter((line) => line.length > 0);

  if (lines.length !== 3) {
    return {
      valid: false,
      error: "スペース区切りで「5・7・5」の3つに分けて入力してください",
    };
  }

  const counts = lines.map((line) => countMora(line));
  const targets = [5, 7, 5];

  // 各行の音数が目安から許容範囲内に収まっているか（字余り・字足らずを許容）
  const withinTolerance = counts.every((count, i) => Math.abs(count - targets[i]) <= MORA_TOLERANCE);

  if (!withinTolerance) {
    return {
      valid: false,
      error: `五七五になっておりません。現在: ${counts[0]}・${counts[1]}・${counts[2]}（字余り・字足らずは各行±${MORA_TOLERANCE}音まで許容）`,
    };
  }

  return { valid: true };
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
