class BNGLNewLineIndex {
  constructor(index, afterSymbol, stringLength) {
    this.index = index;
    this.afterSymbol = afterSymbol;
    this.stringLength = stringLength;
  }
}

//assumes:
//nothing starts with a number except first term
//"\" is only used to denote multi line definitions
//there is some whitespace before all "\" newline declarations
//there is only 1 "\" newline declaration per BNGL definition
//no molecule definitions include "-" or "<"
window.BNGLExtractor = class BNGLExtractor {

  //name is misleading, returns index of first whitespace OR # character
  isWhitespace(s) {
    return (/\s/.test(s) || s === "#");
  }

  //doen't include special case for comments like isWhitespace
  isNotWhitespace(s) {
    return !/\s/.test(s);
  }

  isCommaOrWhitespace(s) {
    return (/\s/.test(s) || s === ",");
  }

  wordHasParenthesis(s, index) {
    if (this.isWhitespace(s[index])) {
      return false;
    }
    let end = this.nextOccur(s, index, this.isWhitespace);
    let word = s.slice(index, end);
    return word.includes(")");
  }

  getNewLineIndex(reactants, products, sign) {
    return  ((sign != undefined) ? 1: 0) + reactants.length + products.length;
  }

  //next occurance of char in string
  nextOccur(string, index, boolExpr, backwards = false, mod = 0) {
    let len = string.length;
    let direction;
    if (backwards) {
      direction = -1;
    } else {
      direction = 1;
    }
    while (index < len && index >= 0) {
      if (boolExpr(string[index])) {
        return index + mod;
      }
      index += direction;
    }
    return ((backwards) ? -1: len);
  }

  //used for all cases except reactions and observables
  //might need to add case for when comment immediately follows conc
  //^ I do, see toy1 (1).bngl
  extractSingleLineBNGL(s) {
    //initialize vars
    let c = 0;
    let len = s.length;
    let char;
    let bngl, conc, comm;
    //parse
    while (c < len) {
      char = s[c];
      //is comment
      if (char == "#") {
        comm = s.slice(c, len);
        break;
      }
      //starts with number
      if ((!bngl) && (!isNaN(parseFloat(char)))) {
        c = this.nextOccur(s, c, this.isWhitespace);
        continue;
      }
      //is whitespace
      if (this.isWhitespace(char)) {
        c = this.nextOccur(s, c, this.isNotWhitespace);
        continue;
      }
      //is non-whitespace and non-comment
      if ((!bngl) && this.isNotWhitespace(char)) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        bngl = s.slice(c, n + 1);
        c = n + 1;
        continue;
      }
      //start concentration
      if (bngl && this.isNotWhitespace(char)) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        conc = s.slice(c, n + 1);
        c = n;
      }
      //if at end
      if (c == len - 1) {
        break;
      }
      c++;
    }
    return [
      ((bngl == null) ? "" : bngl),
      ((conc == null) ? "" : conc),
      ((comm == null) ? "" : comm)
    ];
  }

  //used for both reactions and observables
  extractSingleLineReaction(s, type = "") {
    //initialize vars
    let c = 0;
    let len = s.length;
    let char, sign;
    let products = [];
    let reactants = [];
    let rate = "";
    let comment = "";
    let observType = "";
    let newLines = [];
    let wasPlus = true;
    let isObservable = type == "observable";
    let hasReadType = !isObservable;
    //parse
    while (c < len) {
      char = s[c];
      //is comment
      if (char == "#") {
        comment = s.slice(c + 1, len);
        break;
      }
      //starts with number
      if (!isNaN(parseFloat(char))) {
        c = this.nextOccur(s, c, this.isWhitespace);
        wasPlus = false;
        continue;
      }
      //is plus
      if (char === "+") {
        c = this.nextOccur(s, c, this.isWhitespace);
        wasPlus = true;
        continue;
      }
      //is new line
      if (char === "\\") {
        c++;
        newLines.push(
          new BNGLNewLineIndex(
            this.getNewLineIndex(reactants, products, sign),
            wasPlus,
            len
          )
        );
        continue;
      }
      //is whitespace
      if (this.isWhitespace(char)) {
        c = this.nextOccur(s, c, this.isNotWhitespace);
        continue;
      }
      //is observable type
      if (!hasReadType && reactants.length == 0 && sign == undefined && this.isNotWhitespace(char)) {
        let n = this.nextOccur(s, c, this.isWhitespace);
        observType = s.slice(c, n);
        hasReadType = true;
        c = n;
        continue;
      }
      //is product or reactant
      if (this.isNotWhitespace(char) && wasPlus || isObservable) {
        if (isObservable && reactants.length > 1) {
          newLines.push(
            new BNGLNewLineIndex(
              this.getNewLineIndex(reactants, products, sign) - 1,
              wasPlus,
              len
            )
          );
        } else {
          wasPlus = false;
        }
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        if (!sign) {
          reactants.push(s.slice(c, n + 1));
        } else {
          products.push(s.slice(c, n + 1));
        }
        c = n + 1;
        continue;
      }
      //is sign
      if ((char === "-" || char === "<") && !this.wordHasParenthesis(s, c)) {
        let n = this.nextOccur(s, c, this.isWhitespace);
        sign = s.slice(c, n);
        c = n;
        wasPlus = true;
        continue;
      }
      //is rate
      if (this.isNotWhitespace(char) && !wasPlus) {
        rate = s.slice(c, len).trim();
        break;
      }
      //if at end
      if (c == len - 1) {
        break;
      }
      c++;
    }
    //handle observables special cases
    if (isObservable) {
      //use rate to hold observable unique data
      let name = reactants.splice(0, 1)[0];
      rate = {type: observType, name: name};
    } else if (!rate) {
      rate = "";
    }
    return [
      ((reactants) ? reactants : []),
      ((products) ? products : []),
      ((sign) ? sign : ""),
      rate,
      ((comment.trim()) ? comment.trim() : ""),
      ((newLines) ? newLines : [])
    ];
  }

  //extract comments
  extractComment(s) {
    let c = this.nextOccur(s, 0, (s)=>{return (s === "#")});
    if (c >= 0) {
      return s.slice(c).trim();
    } else {
      return "";
    }
  }

  extractComments(bnglStr) {
    let header = bnglStr.slice(0, bnglStr.indexOf("begin"));
    let lines = header.split("\n");
    let output = [];
    lines.forEach((line, i) => {
      let comment = this.extractComment(line);
      if (comment) {
        output.push(comment);
      }
    });
    return output;
  }

  //combine separated mutiline defintions
  combineArrays(array) {
    function evaluateCombinations(index, list, indexMod = 0) {
      let elm = list[index];
      let str = elm.str;
      let toAppend = elm.toAppend;
      if (!toAppend) {
        return {
          str: str,
          indexMod: indexMod
        };
      } else {
        let cutIndex = elm.cutIndex;
        indexMod++;
        let recursiveResult = evaluateCombinations(index + 1, list, indexMod);
        return {
          str: str.slice(0, cutIndex + 1) + recursiveResult.str,
          indexMod: recursiveResult.indexMod
        };
      }
    }
    let output = [];
    for (let i = 0; i < array.length; i++) {
      let result = evaluateCombinations(i, array);
      output.push(result.str);
      i += result.indexMod;
    }
    return output;
  }

  //extract bngl element
  extractBNGL(bnglStr, elmStrList, type = "") {
    let bngls = [];
    let toDelete = [];
    let specialType = type == "reaction" || type == "observable";
    for (let i = 0; i < elmStrList.length; i++) {
      let elmStr = elmStrList[i];
      let beginToken = "begin " + elmStr;
      let startIndex = bnglStr.indexOf(beginToken);
      if (startIndex >= 0) {
        //find first new line
        let nlDist = 0;
        while (bnglStr[startIndex + beginToken.length + nlDist] != "\n") {
          nlDist += 1;
        }
        //split by line
        let endIndex = bnglStr.indexOf("\n" + "end " + elmStr);
        let sliced = bnglStr.slice(
          startIndex + nlDist + beginToken.length + 1,
          endIndex
        );
        bngls = bngls.concat(sliced.split("\n"));
        //manage multi line definitions
        let newArr = [];
        for (let u = 0; u < bngls.length; u++) {
          let bngl = bngls[u];
          let cutIndex = bngl.indexOf("\\");
          if (cutIndex >= 0) {
            newArr.push(
              {str: bngl, toAppend: true, cutIndex: cutIndex}
            );
            continue;
          }
          newArr.push({str: bngl, toAppend: false});
        }
        bngls = this.combineArrays(newArr);
        //do actual extraction for each line
        for (let u = 0; u < bngls.length; u++) {
          let bnglConcPair;
          if (specialType) {
            bngls[u] = ((type == "observable") ? bngls[u].replace(/\n/g, "").replace(/\\/g, ""): bngls[u]);
            bnglConcPair = this.extractSingleLineReaction(bngls[u], type);
          } else {
            bnglConcPair = this.extractSingleLineBNGL(bngls[u]);
          }
          bngls[u] = bnglConcPair;
          //mark empty strings for deletion
          let isEmpty = true;
          let onlyComment = false;
          let len = bnglConcPair.length;
          let hasContent;
          if (specialType) {
            hasContent = (elm)=> {
              //if not empty string, or not empty list
              return ((typeof elm === "string" && elm.trim() != "") || elm.length > 0);
            };
          } else {
            hasContent = (elm)=>{return (!!elm.trim());};
          }
          for (let y = 0; y < len; y++) {
            let elm = bnglConcPair[y];
            //if string has content
            if (elm && hasContent(elm)) {
              //if comment is only content
              if ((!specialType && y == len - 1) || (specialType && y == len - 2)) {
                isEmpty = false;
                onlyComment = true;
              } else {
                //if there is non comment content
                isEmpty = false;
              }
              break;
            }
          }
          if (isEmpty) {
            toDelete.push(bngls[u]);
          }
          if (onlyComment) {
            if (type == "reaction" || type == "observable") {
              bngls[u] = bngls[u][4];
            } else {
              bngls[u] = bngls[u][len - 1];
            }
          }
        }
        //if begin token not found
        } else {
          continue;
        }
      }
    //delete empty strings
    this.arrayRemoveAll(bngls, toDelete);
    return bngls;
  }

  //remove item from array
  arrayRemove(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
  }

  //remove list of items from array
  arrayRemoveAll(arr, toDelete) {
    for (let u = 0; u < toDelete.length; u++) {
      this.arrayRemove(arr, toDelete[u]);
    }
  }

  //compile reaction extraction output into bngl string
  compileBNGL(reactionList, type = "", observType = "") {
    let reactants, products, sign, newLines;
    [reactants, products, sign] = reactionList;
    if (type == "observables") {
      return reactionList[0].join(" ");
    }
    newLines = reactionList[5];
    let condensedList = reactants.concat([sign]).concat(products);
    //add new lines
    for (let i = 0; i < newLines.length; i++) {
      condensedList.splice(newLines[i].index + i, 0, "\\\n");
    }
    //add "+" signs
    let len = condensedList.length;
    for (let i = 0; i < len; i++) {
      let elm = condensedList[i];
      if (!(elm.includes("-") || elm === "\\\n")) {
        condensedList.splice(i + 1, 0, "+");
        i++;
      }
      //remove trailing "+" signs
      if (elm.includes("-")) {
        condensedList.splice(i - 1, 1);
        i--;
      }
    }
    //remove last "+" sign
    if (condensedList[condensedList.length - 1] == "+") {
      condensedList.pop();
    }
    return condensedList.join("");
  }
}
