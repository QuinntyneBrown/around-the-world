import { parseModelDecision } from './model-decision';

describe('parseModelDecision (L2-021 criterion 2, ADR 0030)', () => {
  it.each([
    ['{"answer":56,"afterMs":1500}', { answer: 56, afterMs: 1500 }],
    ['{"afterMs":1,"answer":0}', { answer: 0, afterMs: 1 }],
    ['{"answer":999,"afterMs":10000}', { answer: 999, afterMs: 10000 }],
    [' {"answer": 7, "afterMs": 900}\n', { answer: 7, afterMs: 900 }],
  ])('reads %s as a decision', (text, decision) => {
    expect(parseModelDecision(text)).toEqual(decision);
  });

  it.each([
    ['text', 'Kenji says 56!'],
    ['an empty reply', ''],
    ['a number alone', '56'],
    ['an array', '[56, 1500]'],
    ['null', 'null'],
    ['an answer below 0', '{"answer":-1,"afterMs":1500}'],
    ['an answer above 999', '{"answer":1000,"afterMs":1500}'],
    ['an answer that is not whole', '{"answer":5.5,"afterMs":1500}'],
    ['an answer as text', '{"answer":"56","afterMs":1500}'],
    ['a time of 0', '{"answer":56,"afterMs":0}'],
    ['a time above 10 seconds', '{"answer":56,"afterMs":10001}'],
    ['a time that is not whole', '{"answer":56,"afterMs":1500.5}'],
    ['no time', '{"answer":56}'],
    ['no answer', '{"afterMs":1500}'],
    ['a further field', '{"answer":56,"afterMs":1500,"say":"Got it!"}'],
  ])('discards %s', (_, text) => {
    expect(parseModelDecision(text)).toBeNull();
  });
});
