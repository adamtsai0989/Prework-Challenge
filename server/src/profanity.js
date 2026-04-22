const leoProfanity = require('leo-profanity');

leoProfanity.loadDictionary('en');

function isClean(text) {
  return !leoProfanity.check(text);
}

module.exports = { isClean };
