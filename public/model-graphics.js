//script for graphics

//note all scale params in draw functions do not work, fix or delete

//defining string rgb values by hashing them
Object.defineProperty(String.prototype, 'rgb', {
  //hashing string
  value: function() {
    var hash = 0, i, chr;
    for (var i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash = (chr << (6 * i)) + hash;
      hash |= 0; // Convert to 32bit integer
    }
    //changing hash into rgb format:
    hash *= ((hash < 0) ? -1: 1);
    if (hash < 65280) {
      hash++;
      hash *= 17777777;
    }
    //16777215 is FFFFFF in base 16
    hash = hash % 16777215;
    color = Math.floor(hash);
    color = color.toString(16);
    var rgb = [];
    for (var i = 0; i < 3; i++) {
      rgb.push(parseInt(color.slice(i, 2 + i), 16));
    }
    //correcting colors too dark
    if (rgb.reduce((a, b) => a + b, 0) < 600) {
      //remainder of 255 and highest rbg chanel
      const buff = 255 - Math.max(rgb[0], rgb[1], rgb[2]);
      //add buff
      for (var i = 0; i < 3; i++) {
        rgb[i] = rgb[i] + buff;
      }
      //find min chanel
      let min = 0;
      for (var i = 1; i < 3; i++) {
        if (rgb[i] < rgb[min]) {
          min = i;
        }
      }
      //equalize far apart channels
      let diff = Math.max(rgb[0], rgb[1], rgb[2]) - rgb[min];
      if (diff > 100) {
        rgb[min] += diff - 50;
      }
      //construct rbg string
      color = '';
      for (var i = 0; i < 3; i++) {
        color += rgb[i].toString(16);
      }
    }
    return (color);
  }
});

//splits string at target character;
function splitString(string, target) {
  list = [];
  lastTagert = 0;
  for (var i = 0; i < string.length; i++) {
    if (string[i] == target) {
      list.push(string.slice(lastTagert, i));
      lastTagert = i + 1;
    }
  }
  list.push(string.slice(lastTagert, string.length));
  return(list);
}


//simple class to hold data from molecule's sites
class Site {
  constructor(name, states, color = null) {
    this.bondName = null;
    //get bond name from states
    for (var i = 0; i < states.length; i++) {
      if (states[i].includes('!')) {
        var pair = splitString(states[i], '!');
        states[i] = pair[0];
        this.bondName = parseInt(pair[1]);
      }
    }
    //get bond name from site name
    if (name.includes('!')) {
      var pair = splitString(name, '!');
      name = pair[0];
      this.bondName = parseInt(pair[1]);
    }
    //init vars
    this.name = name;
    this.states = states; //list of state names
    this.position = null; //x y coords of where to draw bond
    //color from name
    if (color == null) {
      this.color = this.name.rgb();
    } else {
      this.color = color;
    }
  }

  //if any site has a bond
  hasBond() {
    if (this.bondName == null || isNaN(this.bondName)) {
      return false;
    } else {
      return true;
    }
  }
}


//class for molecules
window.Molecule = class Molecule {
  constructor(def, mode = 'normal') {
    //draw compact / normal
    this.mode = mode;
    //bionetgen definition
    this.def = def;
    //6 digit rgb hex
    this.color = '';
    //name of molecule
    this.name = '';
    //this.sites, list of Site() instances, initialized in this.process()
    if (this.def) {
      this.process();
    }
    //colors used to draw states
    this.stateColors = ['#FBC6D0', '#00FDFF', '#FA26A0', '#99F3BD'];
    //list of {drawFunction, parameterList} objects
    this.drawList = [];
    //dimentions, calculated later
    this.x = 0;
    this.y = 0;
  }

  //initialize this.color, sites, name from bionetgen def
  process() {
    //notice bond info is kept in this.sites and removed later
    var temp = splitString(this.def, '(');
    this.name = temp[0];
    this.color = this.name.rgb();
    var sites = temp[1].slice(0, -1);
    //sites = sites.slice(sites.length - 2);
    sites = splitString(sites, ',');
    var siteList = [];
    var temp = '';
    for (var i = 0; i < sites.length; i++) {
      if (sites[i].includes(')')) {
        sites[i] = sites[i].replace(')', '');
      }
      if (sites[i].includes('~')) {
        //if sites have states
        temp = splitString(sites[i], '~');
        var states = temp.slice(1);
        if (this.mode == 'normal') {
          siteList.push(new Site(temp[0], states));
        } else {
          //if compact mode slice to only first letter
          for (let u = 0; u < states.length; u++) {
            let state = states[u];
            //if state has bond
            if (state.includes('!')) {
              let temp = states[u].split('!');
              let stateName = temp[0];
              let bond = temp[1];
              stateName = stateName.slice(0, 1);
              states[u] = stateName + '!' + bond;
            }
            else {
              states[u] = state.slice(0, 1);
            }
          }
          let originalName = temp[0];
          siteList.push(new Site(
            originalName.slice(0, 1),
            states,
            originalName.rgb())
          );
        }
        //if there are sites but no states
      } else if (sites[i].length != 0) {
        //compact vs normal
        if (this.mode == 'normal') {
          siteList.push(new Site(sites[i], []));
        } else {
          //if site has bond
          let site = sites[i];
          let originalName = sites[i];
          if (site.includes('!')) {
            let temp = site.split('!');
            let siteName = temp[0];
            let bond = temp[1];
            siteName = siteName.slice(0, 1);
            sites[i] = siteName + '!' + bond;
            siteList.push(new Site(sites[i], [], originalName.rgb()));
          } else {
            siteList.push(new Site(site.slice(0, 1), [], originalName.rgb()));
          }
        }
      } else {
        //if there are no sites
        siteList = null;
      }
    }
    if (siteList == null) {
      this.sites = [];
    } else {
      this.sites = siteList;
    }
  }

  hasBond() {
    let answer = false;
    this.sites.forEach((item) => {
      if (item.hasBond()) {
        answer = true;
      }
    });
    return answer;
  }

  //evaluate all draw list functions
  doDrawList() {
    if (this.def) {
      let list = this.drawList;
      for (let i = 0; i < list.length; i++) {
        let elm = list[i];
        let func = elm.func;
        let params = elm.params;
        func(params);
      }
    }
  }

  //draw rounded rect
  drawRoundRect(canvas, x, y, radius, length, rgb) {
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + rgb;
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, Math.PI / 2, Math.PI * (3/2));
    ctx.arc(
      x + radius + length,
      y + radius, radius,
      Math.PI * (3/2),
      Math.PI / 2
    );
    ctx.lineTo(x + radius, y + 2 * radius);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.stroke();
    ctx.closePath();
  }

  //draw bionetgen sites with states labeled
  drawSitesComplex(canvas, x, y, radius, scale = 1, initX = 0, visible = true) {
    var ctx = canvas.getContext('2d');
    const siteRadius = 8;
    var siteLength = 0;
    var stateLength = 0;
    var longestState = 0;
    var tallestState = 0;
    var hasStates = false;
    //adding sites
    let dx = radius - 2 * siteRadius;
    for (var i = 0; i < this.sites.length; i++) {
      //bottom line of sites
      let dy = 2 * radius + 2;
      dx = dx + 2 * siteRadius + siteLength;
      if (longestState > 2 * siteRadius + siteLength) {
        dx = dx - siteLength + longestState - 2 * siteRadius;
      }
      //drawing sites
      siteLength = 4.9 * this.sites[i].name.length;
      let colorParam = this.sites[i].color;
      let xParam = x + dx - radius / 2;
      let yParam = y + dy - radius / 2;
      if (visible) {
        this.drawList.push({func: (params) => {
          this.drawRoundRect(
            canvas,
            params[0],
            params[1],
            params[3],
            params[4],
            params[2]
          );
        }, params: [xParam, yParam, colorParam, siteRadius, siteLength]});
      }
      //drawing site names
      let nameParam = this.sites[i].name;
      xParam = x + dx - siteRadius / 2;
      yParam = y + dy + siteRadius / 2 + 1;
      if (visible) {
        this.drawList.push({func: (params) => {
          ctx.fillStyle = '#000000';
          ctx.font = "12px Arial";
          ctx.fillText(
            params[2],
            params[0],
            params[1]
          );
        }, params: [xParam, yParam, nameParam]});
      }
      //drawing states of sites
      var states = this.sites[i].states;
      if (states.length == 0) {
        longestState = 0;
      } else if (!hasStates) {
        hasStates = true;
      }
      //add bonds to stateless sites
      if (this.sites[i].bondName != null) {
        if (this.sites[i].states.length == 0) {
          this.sites[i].position = [x + dx - initX, y + dy + siteRadius];
        }
      }
      for (var u = 0; u < states.length; u++) {
        var sx = x + dx - siteRadius + 2;
        var sy = y + dy + u * 13 + siteRadius;
        //fix lengths
        stateLength = ctx.measureText(this.sites[i].states[u]).width;
        if (this.sites[i].states[u].length <= 10) {
          stateLength += 3;
        }
        if (longestState < stateLength) {longestState = stateLength;}
        //add bonds to sites with states
        if (this.sites[i].bondName != null) {
          this.sites[i].position = [sx + stateLength / 2 - initX, sy + 13];
        }
        //draw states
        var colorIndex = u;
        let stateParam = this.sites[i].states[u];
        xParam = sx;
        yParam = sy;
        if (colorIndex > 3) {colorIndex = colorIndex % 3;}
        if (visible) {
          this.drawList.push({func: (params) => {
            ctx.fillStyle = params[3];
            ctx.beginPath();
            ctx.rect(params[0], params[1], params[4], 13);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.stroke();
            ctx.closePath();
            //naming states
            ctx.fillStyle = '#000000';
            ctx.fillText(params[2], params[0] + 1.5, params[1] + 10.5);
          }, params: [
            xParam,
            yParam,
            stateParam,
            this.stateColors[colorIndex],
            stateLength
          ]});
        }
        if (sy + 13 > tallestState) {
          tallestState = sy + 13;
        }
      }
    }
    //return total [length, height] to compare to default dimensions
    var dims = [];
    //use either end of site, state, or molecule for x component
    var possibleLengths = [
      dx - radius / 2 + siteLength,
      dx,
      sx + stateLength - x
    ];
    for (var i = 0; i < 3; i++) {
      if (isNaN(possibleLengths[i])) {
        possibleLengths[i] = 0;
      }
    }
    dims.push(possibleLengths.reduce(function (a, b) {
      return (Math.max(a, b));
    }));
    if (hasStates) {
      dims.push(tallestState);
    } else {
      dims.push(radius * 2 + siteRadius + 2);
    }
    return (dims);
  }

  //draw molecule with states and sites labled
  initDrawList(canvas, x, y, scale = 1, initX = 0) {
    if (this.def) {
      var ctx = canvas.getContext('2d');
      const radius = 15;
      var length = ctx.measureText(this.name).width;
      if (length < 0) {length *= -1;}
      var dims = this.drawSitesComplex(canvas, x, y, radius, 1, initX, false);
      if (length < dims[0]) {
        length = dims[0];
      }
      let numSites = Object.keys(this.sites).length;
      //add main molecule to draw list
      this.drawList.push({func: (params) => {
        ctx.font = "15px Arial";
        //drawing pill shape
        this.drawRoundRect(
          canvas,
          params[0],
          params[1],
          params[2],
          params[3],
          params[4]
        );
        //drawing sites
        this.drawSitesComplex(
          canvas,
          params[0],
          params[1],
          params[2],
          1,
          params[5]
        );
        //drawing name
        ctx.fillStyle = '#000000';
        ctx.font = "15px Arial";
        ctx.fillText(
          params[6],
          params[0] + params[2] / 2,
          params[1] + params[2] + 5
        );
      }, params: [x, y, radius, length, this.color, initX, this.name]});
      //return [length, height] of molecule for Graphic class
      this.x = dims[0];
      this.y = dims[1];
      return ([radius * 2 + length, dims[1]]);
    }
  }
}


//each bionetgen should have own Graphic instance
window.Graphic = class Graphic {
  constructor(def, mode = 'normal') {
    //draw normal / compact
    this.mode = mode;
    //bionetgen definition
    this.def = def;
    //compartment name
    if (mode && mode != 'normal' && mode != 'compact') {
      this.comp = this.mode;
      //abreviate compratment name
      this.comp = this.comp.slice(0, 3) + '...';
    }
    //list of instances of molecule classes
    this.molecules = [];
    //initializing this.molecules
    this.process();
    //list of {drawFunction, parameterList} objects
    this.drawList = [];
    //dimesntions, calcutlated later
    this.x = 0;
    this.y = 0;
  }

  process() {
    var defs = splitString(this.def, '.');
    if (this.mode == 'normal') {
      for (var i = 0; i < defs.length; i++) {
        this.molecules.push(new Molecule(defs[i]));
      }
    } else {
      for (var i = 0; i < defs.length; i++) {
        this.molecules.push(new Molecule(defs[i], 'compact'));
      }
    }
  }

  //evaluate all draw list functions
  doDrawList() {
    //graphics draw functions
    let list = this.drawList;
    for (let i = 0; i < list.length; i++) {
      let elm = list[i];
      let func = elm.func;
      let params = elm.params;
      func(params);
    }
    //molecules draw functions
    for (let i = 0; i < this.molecules.length; i++) {
      this.molecules[i].doDrawList();
    }
  }

  //draw membrane, only for species
  drawMembrane(canvas) {
    if (this.comp) {
      //init context
      let ctx = canvas.getContext('2d');
      //box dims
      let textWidth = ctx.measureText(this.comp).width;

      //change height, width
      let membraneHeight = 12;
      this.y += membraneHeight;

      //add to draw list
      this.drawList.push({func: (params) => {
        //draw membrane at top right corner, filling canvas
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, 0, params[0] + 9, this.y);
        ctx.fillStyle = '#000000';
        ctx.font = "11px Arial";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        //left line
        ctx.lineTo(0, this.y);
        //bottom line
        ctx.lineTo(params[0] + 9, this.y);
        //right line
        ctx.lineTo(params[0] + 9, 0);
        //top line
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.closePath();
        ctx.fillText(this.comp, 2, this.y - 5);
      }, params: [textWidth]});
    }
  }

  //only works for species with two molecules or less, fix this
  draw(canvas, initX, initY, scale = 1) {
    if (this.def) {
      let length = 0;
      let height = 0;
      let names = new Set();
      let pairs = [];//list of pairs of xy coords for each bond
      //drawing the graphics on the canvas
      let ctx = canvas.getContext('2d');
      //draw membrane
      this.drawMembrane(canvas);
      //extracting bonds
      for (let i = 0; i < this.molecules.length; i++) {
        let thisX = scale * (2 + length + initX);
        let thisY = scale * (2 + initY);
        let dims = this.molecules[i].initDrawList(canvas, thisX, thisY, scale, initX);
        length += dims[0];
        if (dims[1] > height) {
          height = dims[1];
        }
      }
      //each molecule
      for (let i = 0; i < this.molecules.length; i++) {
        //each site
        for (let y = 0; y < this.molecules[i].sites.length; y++) {
          let m1 = this.molecules[i].sites[y];
          //if unique bond m1 exists
          if (m1.bondName != null && !names.has(m1.bondName)) {
            names.add(m1.bondName);
            let newPair = [m1.position];
            //check all sites in species for matching bond type
            for (let u = 0; u < this.molecules.length; u++) {
              for (let z = 0; z < this.molecules[u].sites.length; z++) {
                //ensure a molecule doesnt bond to itself
                if (z != y || u != i) {
                  let m2 = this.molecules[u].sites[z];
                  if (m2.bondName == m1.bondName) {
                    newPair.push(m2.position);
                    newPair.push(m2.bondName);
                    pairs.push(newPair);
                  }
                }
              }
            }
          }
        }
      }
      //drawing bonds
      var maxHeight = 0;
      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i][0][1] > maxHeight) {
          maxHeight = pairs[i][0][1];
        }
        if (pairs[i][1][1] > maxHeight) {
          maxHeight = pairs[i][1][1];
        }
        let x1 = pairs[i][0][0] + initX;
        let x2 = pairs[i][1][0] + initX;
        let y0 = scale * pairs[i][0][1] + initY;
        let y1 = (pairs[i][0][1] + 5 * i + 5) + initY;
        let y2 = pairs[i][1][1] + initY;
        let textParam = pairs[i][2];
        let textParamX = pairs[i][0][0] - 7 + initX;
        let textParamY = pairs[i][0][1] + 8.5 + initY;
        this.drawList.push({func: (params) => {
          ctx.fillStyle = '#000000';
          ctx.font = "10px Arial";
          ctx.beginPath();
          ctx.moveTo(params[0], params[2]);
          //functioning code for bond labels below, omitted for style
          //ctx.fillText(params[5], params[6], params[7]);
          ctx.lineTo(params[0], params[3]);
          ctx.lineTo(params[1], params[3]);
          ctx.lineTo(params[1], params[4]);
          ctx.stroke();
        }, params: [x1, x2, y0, y1, y2, textParam, textParamX, textParamY]});
      }
      if (maxHeight + 10 > height + 5) {
        this.x += length + 5;
        this.y += maxHeight + 10;
        return ([length + 5, maxHeight + 10]);
      } else {
        this.x += length + 5;
        this.y += height + 5;
        return ([length + 5, height + 5]);
      }
    }
  }
}

//drawing graphics in html
window.drawGraphics = function drawGraphics(tableID, BngColumn, CanvasColumn, drawType) {
    //get table html elements
    var speciesTable = document.getElementById(tableID);
    const rowsLen = speciesTable.rows.length;

    //loop over each canvas
    for (y = 1; y < rowsLen; y++) {
        //get canvas and bionetgen html elements
        var canvasElm = speciesTable.rows.item(y).cells.item(CanvasColumn).children[0];
        if (canvasElm) {
            let compartment = canvasElm.innerHTML;
            const canvasID = canvasElm.id;
            var bioNetGen = speciesTable.rows.item(y).cells.item(BngColumn).innerHTML;

            //remove bng trailing syntax leftover from mustache templating
            bioNetGen = bioNetGen.replace(/,\)/g, ')');
            bioNetGen = bioNetGen.replace(/-\)/g, ')');
            bioNetGen = bioNetGen.replace(/!\)/g, ')');
            if (bioNetGen[bioNetGen.length - 1] == '.') {
              bioNetGen = bioNetGen.slice(0, bioNetGen.length - 1);
            }
            speciesTable.rows.item(y).cells.item(BngColumn).innerHTML = bioNetGen;

            //get canvas dimensions based on draw type
            if (drawType == 'g') {
                var drawObj = new Graphic(bioNetGen, compartment);
                drawObj.draw(canvasElm, 0, 0);
                dims = [drawObj.x, drawObj.y];

                //resize canvas
                canvasElm.width = dims[0];
                canvasElm.height = dims[1];

                //draw graphic
                drawObj.doDrawList();
            } else if (drawType == 'm') {
                var drawObj = new Molecule(bioNetGen);
                dims = drawObj.initDrawList(canvasElm, 0.5, 0.5);

                //resize canvas
                canvasElm.width = dims[0] + 5;
                canvasElm.height = dims[1] + 5;

                //draw graphic
                drawObj.doDrawList();
            } else {
                throw 'drawType ' + drawType + ' is not valid, use only m or g';
            }
        }
    }
}

//get color of single pixle on canvas
function pixleAlpha(ctx, x, y) {
  return ctx.getImageData(x, y, 1, 1).data[3];
}

//find the size of drawing in canvas
window.getCanvasDimentions = function getCanvasDimentions(canvas) {
  const ctx = canvas.getContext('2d');
  let dims = [null, null];
  //find initial furthest visible pixle right
  let x = 500;
  let y = 1;
  let a = 0;
  while (a == 0 && x >= 0) {
    x--;
    a = pixleAlpha(ctx, x, 1);
  }
  x++;
  //find absolute furthest visible pixle right
  while (y <= 180) {
    y++;
    a = pixleAlpha(ctx, x, y);
    while (a != 0) {
      x++;
      a = pixleAlpha(ctx, x, y);
    }
  }
  let right;
  right = dims[0] = x;
  //find initial furthest visible pixle down
  x = 1;
  y = 180;
  a = 0;
  while (a == 0 && y >= 0) {
    y--;
    a = pixleAlpha(ctx, x, y);
  }
  y++
  //find absolute furthest visible pixle right
  while (x <= right) {
    x++;
    a = pixleAlpha(ctx, x, y);
    while (a != 0) {
      y++;
      a = pixleAlpha(ctx, x, y);
    }
  }
  dims[1] = y;
  return dims;
}
