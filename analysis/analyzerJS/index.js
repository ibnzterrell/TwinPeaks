class TwinPeaksAnalyzer {
    constructor() {}
  
    static peaks(data, sort, x, y) {
      this.validateXY(data, x, y);
  
      data = this.vSort(data, x);
      let peaksIndex = this.indexPeaks(data, x, y);
  
      switch (sort) {
        case "x":
          return this.peaksAll(data, peaksIndex);
          break;
        case "y":
          let peaks = this.peaksAll(data, peaksIndex);
          return this.vSort(peaks, y).reverse();
          break;
        case "prominence":
          return this.peaksProminence(data, peaksIndex, x, y);
          break;
        case "persistence":
          return this.peaksPersistence(data, peaksIndex, x, y);
          break;
        default:
          throw new Error(`${sort} is not a valid sort method.`);
          break;
      }
    }
  
    static valleys(data, sort, x, y) {
      this.validateXY(data, x, y);
  
      data = this.vSort(data, x);
      let valleysIndex = this.indexValleys(data, x, y);
  
      switch (sort) {
        case "x":
          return this.valleysAll(data, valleysIndex, x, y);
          break;
        case "y":
          let valleys = this.valleysAll(data, valleysIndex, x, y);
          return this.vSort(valleys, y);
          break;
        case "drop":
          return this.valleysDrop(data, valleysIndex, x, y);
          break;
        case "persistence":
          return this.valleysPersistence(data, valleysIndex, x, y);
          break;
        default:
          throw new Error(`${sort} is not a valid sort method.`);
          break;
      }
    }
  
    static indexPeaks(data, x, y) {
      let peaks = [];
  
      for (let i = 1; i < data.length - 1; ++i) {
        if (this.isPeak(data, i, y)) {
          peaks.push(i);
        }
      }
      return peaks;
    }
  
    static indexValleys(data, x, y) {
      let valleys = [];
  
      for (let i = 1; i < data.length - 1; ++i) {
        if (this.isValley(data, i, y)) {
          valleys.push(i);
        }
      }
      return valleys;
    }
  
    static getDataByIndex(data, index, x) {
      let indexData = [];
  
      for (let i of index) {
        indexData.push(data[i]);
      }
      return indexData;
    }
  
    static peaksAll(data, peaksIndex, x, y) {
      return this.getDataByIndex(data, peaksIndex, x);
    }
  
    static valleysAll(data, valleysIndex, x, y) {
      return this.getDataByIndex(data, valleysIndex, x);
    }
  
    static peaksProminence(data, peaksIndex, x, y) {
      let prominences = [];
  
      for (let i = 0; i < peaksIndex.length; ++i) {
        let p = this.calculateProminence(data, peaksIndex, i, y);
        prominences.push(p);
        // data[peaksIndex[i]]["prominence"] = p;
      }
      // console.log(prominences);
  
      peaksIndex.sort((a, b) =>
        prominences[peaksIndex.indexOf(a)] > prominences[peaksIndex.indexOf(b)]
          ? -1
          : 1
      );
      return this.getDataByIndex(data, peaksIndex, x);
    }
  
    static valleysDrop(data, valleysIndex, x, y) {
      let drops = [];
  
      for (let i = 0; i < valleysIndex.length; ++i) {
        let d = this.calculateDrop(data, valleysIndex, i, y);
        drops.push(d);
        data[valleysIndex[i]]["drop"] = d;
      }
      // console.log(drops);
  
      valleysIndex.sort((a, b) =>
        drops[valleysIndex.indexOf(a)] > drops[valleysIndex.indexOf(b)] ? -1 : 1
      );
      return this.getDataByIndex(data, valleysIndex, x, y);
    }
  
    static peaksPersistence(data, x, y) {
        throw new Error("Persistent Topology Not Implemented Yet");
    }
  
    static valleysPersistence(data, x, y) {
        throw new Error("Persistent Topology Not Implemented Yet");
    }
    // Utility Functions
    static vSort(data, x) {
      return data.sort((a, b) => (a[x] > b[x] ? 1 : -1));
    }
    static isPeak(data, i, y) {
      return data[i][y] > data[i - 1][y] && data[i][y] > data[i + 1][y];
    }
    static isValley(data, i, y) {
      return data[i][y] < data[i - 1][y] && data[i][y] < data[i + 1][y];
    }
    static calculateProminence(data, peaksIndex, p, y) {
      let leftPeak = 0;
      let rightPeak = data.length - 1;
  
      // Get Left Peak Index > Peak
      for (let i = p - 1; i >= 0; --i) {
        if (data[peaksIndex[i]][y] > data[peaksIndex[p]][y]) {
          leftPeak = peaksIndex[i];
          break;
        }
      }
  
      // Get Right Peak Index > Peak
      for (let i = p + 1; i < peaksIndex.length; ++i) {
        if (data[peaksIndex[i]][y] > data[peaksIndex[p]][y]) {
          rightPeak = peaksIndex[i];
        }
      }
  
      let leftMin = data[peaksIndex[p]][y];
      let rightMin = data[peaksIndex[p]][y];
  
      // Get Left Minimum between Peaks
      for (let i = peaksIndex[p] - 1; i >= leftPeak; --i) {
        if (data[i][y] < leftMin) {
          leftMin = data[i][y];
        }
      }
  
      // Get Right Minimum between Peaks
      for (let i = peaksIndex[p] + 1; i < data.length; ++i) {
        if (data[i][y] < rightMin) {
          rightMin = data[i][y];
        }
      }
  
      // Get Lowest Contour Line (Greater of Left / Right Mins)
      let low = leftMin > rightMin ? leftMin : rightMin;
      // Prominece is Peak Height - Lowest Countour
      let prominence = data[peaksIndex[p]][y] - low;
      return prominence;
    }
  
    static calculateDrop(data, valleysIndex, v, y) {
      let leftValley = 0;
      let rightValley = data.length - 1;
  
      // Get Left Valley < Valley
      for (let i = v - 1; i >= 0; --i) {
        if (data[valleysIndex[i]][y] < data[valleysIndex[v]][y]) {
          leftValley = valleysIndex[i];
        }
      }
  
      // Get Right Valley < Valley
      for (let i = v + 1; i < valleysIndex.length; ++i) {
        if (data[valleysIndex[i]][y] < data[valleysIndex[v]][y]) {
          rightValley = valleysIndex[i];
        }
      }
  
      let leftMax = data[valleysIndex[v]][y];
      let rightMax = data[valleysIndex[v]][y];
  
      // Get Left Max Between Valleys
      for (let i = valleysIndex[v] - 1; i >= leftValley; --i) {
        if (data[i][y] > data[valleysIndex[v]][y]) {
          leftMax = data[i][y];
        }
      }
  
      // Right Max Between Valleys
      for (let i = valleysIndex[v] + 1; i <= rightValley; ++i) {
        if (data[i][y] > data[valleysIndex[v]][y]) {
          rightMax = data[i][y];
        }
      }
  
      //Get Highest Contour Line (Smaller of Left / Right Max)
      let high = leftMax < rightMax ? leftMax : rightMax;
  
      let drop = high - data[valleysIndex[v]][y];
      return drop;
    }
    static validateXY(data, x, y) {
      if (data[0][x] === undefined) {
        throw new Error(`${x} is not a valid x`);
      }
      if (data[0][y] === undefined) {
        throw new Error(`${y} is not a valid y`);
      }
    }
  }