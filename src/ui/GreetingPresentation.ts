/** 人工標註的本情境讀音；不是自動注音轉換。輕聲置前，多音字依此文案。 */
export const READINGS: Readonly<Record<string, string>> = {
  小: 'ㄒㄧㄠˇ',
  安: 'ㄢ',
  你: 'ㄋㄧˇ',
  好: 'ㄏㄠˇ',
  我: 'ㄨㄛˇ',
  在: 'ㄗㄞˋ',
  這: 'ㄓㄜˋ',
  裡: 'ㄌㄧˇ',
  休: 'ㄒㄧㄡ',
  息: 'ㄒㄧˊ',
  想: 'ㄒㄧㄤˇ',
  怎: 'ㄗㄣˇ',
  麼: '˙ㄇㄜ',
  回: 'ㄏㄨㄟˊ',
  應: 'ㄧㄥˋ',
  說: 'ㄕㄨㄛ',
  點: 'ㄉㄧㄢˇ',
  頭: 'ㄊㄡˊ',
  先: 'ㄒㄧㄢ',
  不: 'ㄅㄨˋ',
  參: 'ㄘㄢ',
  與: 'ㄩˋ',
  或: 'ㄏㄨㄛˋ',
  都: 'ㄉㄡ',
  可: 'ㄎㄜˇ',
  以: 'ㄧˇ',
  也: 'ㄧㄝˇ',
  了: '˙ㄌㄜ',
  打: 'ㄉㄚˇ',
  招: 'ㄓㄠ',
  呼: 'ㄏㄨ',
  結: 'ㄐㄧㄝˊ',
  束: 'ㄕㄨˋ',
  再: 'ㄗㄞˋ',
  練: 'ㄌㄧㄢˋ',
  一: 'ㄧ',
  次: 'ㄘˋ',
  換: 'ㄏㄨㄢˋ',
  個: 'ㄍㄜˋ',
  方: 'ㄈㄤ',
  式: 'ㄕˋ',
  到: 'ㄉㄠˋ',
  開: 'ㄎㄞ',
  始: 'ㄕˇ',
  重: 'ㄔㄨㄥˊ',
  新: 'ㄒㄧㄣ',
  選: 'ㄒㄩㄢˇ',
  按: 'ㄢˋ',
  會: 'ㄏㄨㄟˋ',
  公: 'ㄍㄨㄥ',
  園: 'ㄩㄢˊ',
  還: 'ㄏㄞˊ',
  長: 'ㄔㄤˊ',
  椅: 'ㄧˇ',
  上: 'ㄕㄤˋ',
  幫: 'ㄅㄤ',
  助: 'ㄓㄨˋ',
  關: 'ㄍㄨㄢ',
  閉: 'ㄅㄧˋ',
  看: 'ㄎㄢˋ',
  靠: 'ㄎㄠˋ',
  近: 'ㄐㄧㄣˋ',
  暫: 'ㄗㄢˋ',
  停: 'ㄊㄧㄥˊ',
  返: 'ㄈㄢˇ',
  全: 'ㄑㄩㄢˊ',
  區: 'ㄑㄩ',
  繼: 'ㄐㄧˋ',
  續: 'ㄒㄩˋ',
  試: 'ㄕˋ',
  本: 'ㄅㄣˇ',
  人: 'ㄖㄣˊ',
  物: 'ㄨˋ',
  動: 'ㄉㄨㄥˋ',
  作: 'ㄗㄨㄛˋ',
};
export function annotatedText(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const character of text) {
    const reading = READINGS[character];
    if (!reading) {
      fragment.append(character);
      continue;
    }
    const ruby = document.createElement('ruby');
    const base = document.createElement('span');
    base.className = 'ruby-character';
    base.textContent = character;
    ruby.append(base);
    const rt = document.createElement('rt');
    const neutral = reading.startsWith('˙');
    const tone = neutral ? '˙' : reading.match(/[ˊˇˋ]$/u)?.[0];
    const symbols = document.createElement('span');
    symbols.className = 'zhuyin-symbols';
    symbols.textContent = reading.replace(/[˙ˊˇˋ]/gu, '');
    rt.append(symbols);
    if (tone) {
      const mark = document.createElement('span');
      mark.className = neutral ? 'zhuyin-neutral' : 'zhuyin-tone';
      mark.textContent = tone;
      rt.append(mark);
      if (neutral) rt.classList.add('has-neutral');
    }
    rt.setAttribute('aria-hidden', 'true');
    ruby.append(rt);
    fragment.append(ruby);
  }
  return fragment;
}
/** 圖示僅作輔助，按鈕名稱維持原中文，不讓報讀器重複讀注音。 */
export function decorateButton(button: HTMLButtonElement, label: string, icon: string): void {
  const paths: Readonly<Record<string, string>> = {
    speech: 'M4 4h16v12H9l-5 4V4zm2 2v10l2-2h10V6H6z',
    nod: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5 21v-2a7 7 0 0 1 14 0v2h-2v-2a5 5 0 0 0-10 0v2zM20 3v6l-3-3h2V3z',
    park: 'M12 2 4 12h5l-3 5h5v5h2v-5h5l-3-5h5z',
    repeat: 'M5 5h12l-3-3h3l5 5-5 5h-3l3-3H7v7h10v-3h2v5H5z',
    help: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14h2v2h-2zm1-10c5 0 5 6 1 7v1h-2v-3c4-1 4-3 1-3-1 0-2 1-2 2H8c0-2 2-4 4-4z',
    exit: 'M4 3h9v2H6v14h7v2H4zM14 7l6 5-6 5v-4H8v-2h6z',
    done: 'M4 12l5 5L21 5l-2-2L9 13l-3-3z',
    pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'control-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[icon] ?? paths['speech'] ?? '');
  svg.append(path);
  const span = document.createElement('span');
  span.className = 'greeting-label';
  span.append(annotatedText(label));
  button.setAttribute('aria-label', label);
  button.replaceChildren(svg, span);
}
