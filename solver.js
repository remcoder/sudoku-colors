'use strict';

var cycles = 0;

function SudokuSolver(table)
{
  this.table = table;
  this.delay = 150; // timeout between steps in animation 
  this._rendered = false;
}



SudokuSolver.prototype = {
  parse: function(input) {
    var mapped = input.split("").map(function(el) { return el == "_" ? null : parseInt(el); });
    var result = [];
    for (var r = 0; r < 9; r++) 
      result.push( mapped.slice(r*9,r*9+9) );

    return result;
  },

  init: function(sudokuString) {
    var prevSudoku = this.sudokuString;
    solver.reset();
    this.sudokuString = sudokuString || prevSudoku;
    this.matrix = this.parse(this.sudokuString);
    
    for ( var r=0 ; r<9 ; r++ ) {
      for ( var c=0 ; c<9 ; c++ ) {
        var value = this.matrix[r][c];
        if (value) {
          Set.add(this.fixed, [r, c]);
          this.allocate(value, r, c);
        }
      }
    }
    this._updateAllOptions();

    if (!this._rendered++)
      this.renderTable();
    
    this.table.offsetHeight;

    this.renderNumbers();
  },

  _numbers: function() {
    return Set.make(1,2,3,4,5,6,7,8,9);
  },
  
  // calculates the quadrant number [0..8]
  _getQuadrantNumber: function(row, column) {
    return Math.floor(row/3) * 3 + Math.floor(column/3);
  },
  
  _getRowOptions: function(row) {
    return this.row[row];
  },
  
  _getColumnOptions: function(column) {
    return this.column[column];
  },
  
  _getQuadrantOptions: function(row, column) {
    return this.quadrant[ this._getQuadrantNumber(row,column) ];
  },
  
  _calcOptions: function(row, column) {
    return Set.intersection(
      this._getRowOptions(row), 
      this._getColumnOptions(column),
      this._getQuadrantOptions(row,column) ); 
  },
  
  // only recalculate the row, column and quadrant that is affected by this cell
  // TODO: maybe get rid of the exception if we use this functions again?
  _calcNecessaryOptions: function(row, column) { 
    for (var r in this.allOptions) {
      for (var c in this.allOptions[r]) {
        if ( r == row || c == column || this._getQuadrantNumber(r,c) == this._getQuadrantNumber(row, column) )
          if (! this.isFixed(r,c)) {
            var newOptions = this._calcOptions(r,c);
            
            if (! this.matrix[row][column] && Set.count(newOptions) == 0)
              throw "OutOfOptionsException";
            this.allOptions[r][c] = newOptions;
          }
      }
    }
  },
  
  _updateAllOptions: function() { 
    for (var r in this.allOptions) {
      for (var c in this.allOptions[r]) {
        if (! this.isFixed(r,c) )
          this.updateOptions(r,c);
      }
    }
  },
  
  forEachCell: function(fun) {
    for (var r = 0; r < 9; r++)
      for (var c = 0; c < 9; c++)
        fun.bind(this)(this.matrix[r][c],r,c);
  },

  getQuadrant: function(row, column) {
    var quadrant = this._getQuadrantNumber(row, column);
    var result = [];
    this.forEachCell(function(number, r,c) {
      if (quadrant == this._getQuadrantNumber(r,c))
        result.push(number);
    });
    return result;
  },

  solve: function() {
      return this.solveCell();
  },
  
  solveCell: function() {  
    var next = this.determineNextCell();
    var row = next.row;
    var column = next.column;
    
    
    for (var number in this._calcOptions(row,column)) {
      try {
        this.allocate(number, row, column);
      }
      catch(e) { // solved 
        this.solution.push({number: number, row: row, column: column});
        return true;
      }

      if (this.solveCell()) { // build the path to the solution when unwinding the tail of the recursion
        this.solution.push({number: number, row: row, column: column});
        return true;
      }
      else {
        this.unallocate(number, row, column);
      }
    }
    return false;
  },
  
  // TODO: take into account that a solution may not exist
  determineNextCell: function() {
    var min = 10;
    var best = {};
    
    for ( var r in this.matrix ) {
      for ( var c in this.matrix[r] ) {
        if (!this.isFixed(r,c) && this.matrix[r][c] == null) {
          var countOptions = Set.count(this._calcOptions(r,c));
          if (countOptions < min && countOptions > 0) {
            best.row = r;
            best.column = c;
          }
          if (countOptions == 1)
            break;
        }
      }
      if (countOptions == 1)
            break;
    }
    
    return best;
  },
  
  isFixed: function(row, column) {
    return [row,column] in this.fixed;
  },
  
  getOptions: function(row, column) {
    return this.allOptions[row][column];
  },
  
  allocate: function(number, row, column) {
    cycles++;
  
    this.matrix[row][column] = number;
    this.allocated++;
    if (this.allocated == 81)
      throw "SolvedException";
      
    this.updateOptions(number, row, column);
  },
  
  updateOptions: function(number, row, column) {
    var rowOptions = this._getRowOptions(row);
    var columnOptions = this._getColumnOptions(column);
    
    if (number in rowOptions)
      Set.remove(rowOptions, number);
    if ( number in columnOptions)
      Set.remove(columnOptions, number);
    
    var quadrantOptions = this._getQuadrantOptions(row, column);
    if (number in quadrantOptions)
      Set.remove(quadrantOptions, number);
  },
  
  unallocate: function(number, row, column) {
    this.matrix[row][column] = null;
    this.allocated--;
    
    if(this.matrix[row].indexOf(number) == -1)
      Set.add(this.row[row], number);

    if(this.matrix.map(function(r){return r[column];}).indexOf(number) == -1)
      Set.add(this.column[column], number);
    
    var quadrant = this._getQuadrantNumber(row, column);
    if (this.getQuadrant(row,column).indexOf(number) == -1)
      Set.add(this.quadrant[quadrant], number);
  },
  
  renderTable: function() {
    for ( var r=0 ; r<9 ; r++ ) {
      var row = this.table.insertRow(this.table.rows.length);
      for ( var c=0 ; c<9 ; c++ ) {
        var cell = row.insertCell(row.cells.length);
        cell.style.backgroundColor = "transparent";
      }
    }
  },

  renderNumbers: function() {
    for ( var r=0 ; r<9 ; r++ ) {
      for ( var c=0 ; c<9 ; c++ ) {
        var value = this.matrix[r][c];
        var cell = this.table.rows[r].cells[c];
        if (this.isFixed(r,c))
          cell.innerHTML = "<span class='fixed'>"+value+"</span>"; 
        else
          cell.innerHTML = "<input class='variable' value='" + (value ? value : "") + "' maxlength='1' />";
      }
    }
    
    this.colorFixed();
  },

  // not just a solution matrix but rather a sequence of allocations leading up to the solution
  animate:function(complete) {
    var sudoku = this;
    // reset options
    this.row = fill([], function() { return sudoku._numbers();}, 9);
    this.column = fill([], function() { return sudoku._numbers();}, 9);
    this.quadrant = fill([], function() { return sudoku._numbers();}, 9);
    this.colorFixed();

    // add fixed numbers
    var that = this;
    complete = complete || function() {};

    function animateLoop(s) {
      
      that.timeout = setTimeout(function() {
        var step, value, cell;
        if (s >= 0) {
          step = that.solution[s];
          that.doStep(step);
          s--;
          animateLoop(s);
        } else {
          complete();
        }
      }, that.delay);
    }

    animateLoop(this.solution.length-1);
  },
  
  colorFixed: function() {
    // pre-fill fixed numbers
    for (var f in this.fixed)
    {
      var row = f[0];
      var column = f[2];
      var number = this.matrix[row][column];
      this.updateOptions(number, row, column);
      this.colorRelatedCells({row:row, column: column});
      // uncomment to start animation with pre-analysis
      //this.solution.push({number: number, row: row, column: column});
    }
  },
  
  stopAnimation: function() {
    window.clearTimeout(this.timeout);
  },
  
  doStep: function(step) {
    // fill in the number
    var number = this.matrix[step.row][step.column];
    var cell = this.table.rows[step.row].cells[step.column];
    cell.getElementsByTagName("input")[0].value = number;
    
    // update options & colors
    this.updateOptions(step.number, step.row, step.column); 
    this.colorRelatedCells(step, true);
  },
  
  colorRelatedCells: function(step, highlightSelf) {
    var quadrant = this._getQuadrantNumber(step.row, step.column);
    for (var r in this.matrix)
      for (var c in this.matrix[r])
        if ( r == step.row || c == step.column || this._getQuadrantNumber(r,c) == quadrant )
            this.colorCell(r, c, this._getQuadrantNumber(r,c), highlightSelf && r == step.row && c == step.column );
  },
  
  colorCell: function(row, column, quadrant, highlight) {
    var cell = this.table.rows[row].cells[column];
    var color = this.mergeColors([ Set.count(this.row[row]), 
      Set.count(this.column[column]), Set.count(this.quadrant[quadrant]) ]);

    if (highlight) {
      cell.className = ""; // removes 'smooth' and disbles the transition temporarily
      cell.style.backgroundColor = "yellow";
      cell.offsetHeight;
    }

    cell.className = "smooth";
    cell.style.backgroundColor = color;
    //cell.title= Set.toString(this.row[row]) + ", " + Set.toString(this.column[column]) + ", " + Set.toString(this.quadrant[quadrant]) + " " + color;
  },
  
  mergeColors: function(options) {
    var colors = map( function(count) { return 255 - 255 * count/10 ; } , options);
    return "#" + map( Math2.dec2hex, colors ).join("");
  },

  reset: function() {
    this.stopAnimation();
    this.sudokuString = '';
    this.solution = [];
    this.matrix = null;
    this.allocated = 0;
    
    // a set of coordinates to keep track of the slots that were pre-allocaed from the start. we use this data
    // to check which slots may never be changed
    this.fixed = {} // empty set
    
    // these 3 arrays of sets keep track of the available numbers per row/column/quadrant
    this.row = fill([], this._numbers, 9);
    this.column = fill([], this._numbers, 9);
    this.quadrant = fill([], this._numbers, 9);
  },

  updateCell: function(number, row, column) {
    if (this.matrix[row][column] != null)
      solver.unallocate(this.matrix[row][column], row, column);
    
    if (number != null)
      solver.allocate(number, row, column);
    
    solver.colorRelatedCells({ number: number, row: row, column: column }, !!number );
  }
}
