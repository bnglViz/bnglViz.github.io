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

  isNewLine(s, c) {
    if (c == s.length - 1) {
      return false;
    } else {
      return (s[c] == "\\" && /\s/.test(s[c + 1]));
    }
  }

  wordHasChar(s, index, char) {
    if (this.isWhitespace(s[index])) {
      return false;
    }
    let end = this.nextOccur(s, index, this.isWhitespace);
    let word = s.slice(index, end);
    return word.includes(char);
  }

  wordHasParenthesis(s, index) {
    return this.wordHasChar(s, index, ")");
  }

  isReactionTitle(s, index) {
    if (index === undefined) {
      return s.includes(":") && !s.includes("@");
    } else {
      let hasAt = this.wordHasChar(s, index, "@");
      let hasColon = this.wordHasChar(s, index, ":");
      return !hasAt && hasColon;
    }
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
      if (c >= len - 1) {
        break;
      }
      c++;
    }
    return {
      bngl: (bngl == null) ? "" : bngl,
      conc: (conc == null) ? "" : conc,
      comment: (comm == null) ? "" : comm
    };
  }

  //used for both reactions and observables
  extractSingleLineReaction(s, line, type = "") {
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
        comment = s.slice(c, len);
        break;
      }
      //starts with number
      if ((!isNaN(parseFloat(char))) && c <= this.nextOccur(s, 0, this.isNotWhitespace)) {
        c = this.nextOccur(s, c, this.isWhitespace);
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
      //is title
      if (this.isReactionTitle(s, c)) {
        c = this.nextOccur(s, c, this.isWhitespace);
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
        if (observType.toLowerCase() != "molecules" && observType.toLowerCase() != "species") {
          return {comment: "Error in line " + line + ". Observable has no type."}
        }
        hasReadType = true;
        c = n;
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
      //is rate
      if (this.isNotWhitespace(char) && !wasPlus) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        rate += " " + s.slice(c, n + 1);
        c = n;
      }
      //if at end
      if (c >= len - 1) {
        break;
      }
      c++;
    }
    //handle observables special cases
    if (isObservable) {
      if (reactants.length > 1) {
        //use rate to hold observable unique data
        let name = reactants.splice(0, 1)[0];
        rate = {type: observType, name: name};
      } else {
        rate = {type: "", name: observType};
      }
    } else if (!rate) {
      rate = "";
    }
    return {
      reactants: (reactants) ? reactants : [],
      products: (products) ? products : [],
      sign: (sign) ? sign : "",
      rate: rate,
      comment: (comment.trim()) ? comment.trim() : "",
      newLines: (newLines) ? newLines : []
    };
  }

  extractCompartments(s) {
    //initialize vars
    let c = 0;
    let len = s.length;
    let char;
    let name, dimension, size, comment;
    //parse
    while (c < len) {
      char = s[c];
      //is comment
      if (char == "#") {
        comment = s.slice(c, len);
        break;
      }
      //starts with number
      if ((!name) && (!isNaN(parseFloat(char)))) {
        c = this.nextOccur(s, c, this.isWhitespace);
        continue;
      }
      //is whitespace
      if (this.isWhitespace(char)) {
        c = this.nextOccur(s, c, this.isNotWhitespace);
        continue;
      }
      //is non-whitespace and non-comment
      if (this.isNotWhitespace(char)) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        if (!name) {
          name = s.slice(c, n + 1);
        } else if(!dimension) {
          dimension = s.slice(c, n + 1);
        } else if(!size) {
          size = s.slice(c, n + 1);
        }
        c = n + 1;
        continue;
      }
      //if at end
      if (c >= len - 1) {
        break;
      }
      c++;
    }
    return {
      name: (name == null) ? "" : name,
      dimension: (dimension == null) ? "" : dimension,
      size: (size == null) ? "" : size,
      comment: (comment == null) ? "" : comment,
    };
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
    let isCompartment = type == "compartments";
    for (let i = 0; i < elmStrList.length; i++) {
      let elmStr = elmStrList[i];
      let beginToken = "begin " + elmStr;
      let startIndex = bnglStr.indexOf(beginToken);
      if (startIndex >= 0) {
        //get line number
        let cutBNGLStr = bnglStr.slice(0, startIndex);
        let startingLine = cutBNGLStr.split("\n").length;
        //standerdize new lines
        let c = 0;
        let newLineIndexes = [];
        while (c < bnglStr.length - 2) {
          if (this.isNewLine(bnglStr, c)) {
            newLineIndexes.push(c);
          }
          c++;
        }
        for (let n = 0; n < newLineIndexes.length; n++) {
          bnglStr = bnglStr.slice(0, n) + "\\\n" + bnglStr.slice(n + 1);
        }
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
        //manage reaction titles
        for (let u = 0; u < bngls.length; u++) {
          let bngl = bngls[u];
          let title;
          if (this.isReactionTitle(bngl)) {
            [title, bngl] = bngl.split(":");
          }
          //manage polymer lengths
          if (type == "observable") {
            bngl = bngl.replace(/</g, "#<");
            bngl = bngl.replace(/>/g, "#>");
          }
          bngls[u] = bngl;
        }
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
          let data;
          if (specialType) {
            bngls[u] = ((type == "observable") ? bngls[u].replace(/\n/g, "").replace(/\\/g, ""): bngls[u]);
            data = this.extractSingleLineReaction(bngls[u], startingLine + u + 1, type);
          } else if (isCompartment) {
            data = this.extractCompartments(bngls[u]);
          } else {
            data = this.extractSingleLineBNGL(bngls[u]);
          }
          bngls[u] = data;
          //mark empty strings for deletion
          let isEmpty = true;
          let onlyComment = false;
          let dataAsList = Object.entries(data);
          let len = dataAsList.length;
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
            let pair = dataAsList[y];
            let key, elm;
            [key, elm] = pair;
            //if string has content
            if (elm && hasContent(elm)) {
              //if comment is only content
              if (key == "comment") {
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
              bngls[u] = bngls[u].comment;
            } else {
              bngls[u] = bngls[u].comment;
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
  compileBNGL(data, type = "", observType = "") {
    let reactants, products, sign, newLines;
    let list = Object.values(data);
    [reactants, products, sign] = list;
    if (type == "observables") {
      return list[0].join(" ");
    }
    newLines = data.newLines;
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
    let output = condensedList.join("");
    //remove reaction trailing "+" sign
    output = output.replace("+<", "<");
    output = output.replace("+-", "-");
    return output;
  }
}