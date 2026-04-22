import leoProfanity from 'leo-profanity';

leoProfanity.loadDictionary('en');

export function isClean(text) {
  return !leoProfanity.check(text);
}
