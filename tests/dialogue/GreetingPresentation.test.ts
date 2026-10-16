import { describe, expect, it } from 'vitest';
import { GREETING } from '../../src/dialogue/Greeting';
import { READINGS } from '../../src/ui/GreetingPresentation';
describe('人工注音內容', () => {
  it('每個節點的台詞、提示、選項及幫助沒有漏標漢字', () => {
    const texts = Object.values(GREETING).flatMap((copy) => [
      copy.line,
      ...copy.prompts,
      ...copy.help,
      ...copy.choices.map((choice) => choice.label),
    ]);
    texts.push(
      '小安打招呼靠近再招呼幫助關閉幫助再看一次暫停返回安全區繼續重試重新開始結束本次人物動作再聽一次語音',
    );
    for (const text of texts)
      for (const character of text)
        if (/\p{Script=Han}/u.test(character)) expect(READINGS[character], character).toBeTruthy();
  });
  it('本情境多音字及輕聲人工標註正確', () => {
    expect(READINGS['重']).toBe('ㄔㄨㄥˊ');
    expect(READINGS['長']).toBe('ㄔㄤˊ');
    expect(READINGS['了']).toBe('˙ㄌㄜ');
    expect(READINGS['暫']).toBe('ㄗㄢˋ');
  });
});
