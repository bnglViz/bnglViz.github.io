window.BNGLExtractor = class BNGLExtractor {

  isWhitespace(s) {
    return /\s/.test(s);
  }

  isNotWhitespace(s) {
    return !/\s/.test(s);
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

  //might need to add case for when comment immdiatley follows conc
  //^ I do, see toy1 (1).bngl
  extractSingleLineBNGL(s, type="") {
    //initialize vars
    let c = 0;
    let len = s.length;
    let char;
    let bngl, conc, comm, observType;
    let readType = ((type == "observable") ? false : true);
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
      //is observable type
      if ((!readType) && (!bngl) && this.isNotWhitespace(char) && (char != "#")) {
        let n = this.nextOccur(s, c, this.isWhitespace);
        observType = s.slice(c, n);
        readType = true;
        c = n;
        continue;
      }
      //is non-whitespace and non-comment
      if ((!bngl) && this.isNotWhitespace(char) && (char != "#")) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        bngl = s.slice(c, n + 1);
        c = n + 1;
        continue;
      }
      //start concentration
      if (bngl && this.isNotWhitespace(char) && (char != "#")) {
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
      ((comm == null) ? "" : comm),
      ((observType == null) ? "" : observType),
    ];
  }

  extractSingleLineReaction(s) {
    //initialize vars
    let c = 0;
    let len = s.length;
    let char;
    let bngls = [];
    let concs = [];
    let comment = "";
    //parse
    while (c < len) {
      char = s[c];
      //is comment
      if (char == "#") {
        comment = s.slice(c + 1, len);
        break;
      }
      //starts with number
      if ((bngls.length == 0) && (!isNaN(parseFloat(char)))) {
        c = this.nextOccur(s, c, this.isWhitespace);
        continue;
      }
      //is whitespace
      if (this.isWhitespace(char)) {
        c = this.nextOccur(s, c, this.isNotWhitespace);
        continue;
      }
      //is non-whitespace and non-comment
      if ((bngls.length == 0) && this.isNotWhitespace(char) && (char != "#")) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        bngls.push(s.slice(c, n + 1));
        c = n + 1;
        continue;
      }
      //start concentration
      if ((bngls.length != 0) && this.isNotWhitespace(char) && (char != "#")) {
        let n = this.nextOccur(s, c, this.isWhitespace, false, -1);
        concs.push(s.slice(c, n + 1));
        c = n;
      }
      //if at end
      if (c == len - 1) {
        break;
      }
      c++;
    }
    return [
      bngls.toString(),
      concs.toString(),
      comment
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

  //extract bngl element
  extractBNGL(bnglStr, elmStrList, type="") {
    let bngls = [];
    let toDelete = [];
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
        //do actual extraction for each line
        for (let u = 0; u < bngls.length; u++) {
          let bnglConcPair;
          if (type == "reaction") {
            bnglConcPair = this.extractSingleLineReaction(bngls[u]);
          } else {
            bnglConcPair = this.extractSingleLineBNGL(bngls[u], type);
          }
          bngls[u] = bnglConcPair;
          //mark empty strings for deletion
          let isEmpty = true;
          let onlyComment = false;
          for (let y = 0; y < bnglConcPair.length; y++) {
            //if string has content
            if (bnglConcPair[y].trim()) {
              //if comment is only content
              if (y == 2) {
                isEmpty = false;
                onlyComment = true;
              } else {
                //if there is non comment content
                isEmpty = false;
              }
              break;
            }
          };
          if (isEmpty) {
            toDelete.push(bngls[u]);
          }
          if (onlyComment) {
            bngls[u] = bngls[u][2];
          }
        }
        //if begin token not found
        } else {
          continue;
        }
      }
    //delete empty strings
    for (let u = 0; u < toDelete.length; u++) {
      arrayRemove(bngls, toDelete[u]);
    }
    return bngls;
  }
}
