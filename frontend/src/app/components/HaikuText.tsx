interface HaikuTextProps {
  content: string;
  furigana: string;
  small?: boolean;
}

// 空白（全角スペース・改行を含む）で句を区切る
const splitKu = (text: string) => text.split(/\s+/).filter(Boolean);

// 句を縦書きで表示する。本文とふりがなの区切り数が一致する場合は
// ふりがなをルビとして添え、一致しない場合は句の下に横書きで表示する
export default function HaikuText({ content, furigana, small = false }: HaikuTextProps) {
  const lines = splitKu(content);
  const yomi = splitKu(furigana);
  const useRuby = lines.length > 0 && lines.length === yomi.length;

  return (
    <>
      <div className={`haiku-wrap${small ? ' haiku-wrap-small' : ''}`}>
        <div className={`haiku${small ? ' haiku-small' : ''}`}>
          {lines.map((line, i) => (
            <span key={i} className="haiku-ku">
              {useRuby && yomi[i] !== line ? (
                <ruby>
                  {line}
                  <rt>{yomi[i]}</rt>
                </ruby>
              ) : (
                line
              )}
            </span>
          ))}
        </div>
      </div>
      {!useRuby && furigana && (
        <div className="haiku-yomi" style={small ? { textAlign: 'left' } : undefined}>
          {furigana}
        </div>
      )}
    </>
  );
}
