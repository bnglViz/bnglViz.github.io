function cringe(s) {
  function isNewLine(s, c) {
    if (c == s.length - 1) {
      return false;
    } else {
      return (s[c] == "\\" && /\s/.test(s[c + 1]));
    }
  }
  let c = 0;
  let newLineIndexes = [];
  while (c < s.length - 2) {
    if (isNewLine(s, c)) {
      newLineIndexes.push(c);
    }
    c++;
  }
  for (let n = 0; n < newLineIndexes.length; n++) {
    //s = s.slice(0, n) + "\\\n" + s.slice(n + 1);
  }
  return s;
}

console.log("abc\\ d");
console.log("after:");
console.log(cringe("abc\\ d"));
