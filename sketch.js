let particles = [];
let grid;
let numParticles = 1000;
let canvasSize = 600;
let gridSize = 10;
let pressure = 0;
let temperature = 0;
let avgEnergy = 0;
let velocities = [];
let energies = [];
let histogramBins = 20;
let particleRadius = 1;
let maxVelocity = 5;

let pressureHistory = [];
let temperatureHistory = [];
let avgEnergyHistory = [];
let maxHistoryLength = 100;

let exp;
let prevMaxE = 0;
let prevMaxV = 0;
let gravityCheckbox; // Gravity checkbox
let gravityEnabled = false; // Flag for gravity

function setup() {
  createCanvas(canvasSize, canvasSize);
  grid = new Grid(canvasSize, gridSize);
  // Initialize particles with no overlap

  // Create a checkbox for gravity
  textFont('Courier New');
  experimentSelection();
  initSwarm();
  gravityCheckbox = createCheckbox('Enable Gravity', false);
  gravityCheckbox.position(10, canvasSize + 10);
  gravityCheckbox.changed(() => {
    gravityEnabled = gravityCheckbox.checked();
  });


  function experimentSelection() {
    exp = createSelect();
    exp.position(150, height + 12);
    exp.option("Random gas");
    exp.option("Brazilian Nut");
    exp.option("All right brazilian nut");
    exp.option("All right");
    exp.option("Bullet");
    exp.changed(initExperiment);
  }

  function initExperiment() {
    particles = [];
    let val=exp.value()
    if (val == "Brazilian Nut") {
      let newParticle = new Particle(width/2, height/2, 2, 0, 50);
      particles.push(newParticle); // Add particle if valid
      initSwarm();
    }
    else if (val == "All right") {
      initSwarm({ x: maxVelocity, y: 0 });
    }
    else if (val == "Random gas") {
      initSwarm();
    }
    else if (val == "All right brazilian nut") {
      let newParticle = new Particle(width/2, height/2, 2, 0, 50);
      particles.push(newParticle);
      initSwarm({ x: maxVelocity, y: 0 });
    }
    else if (val == "Bullet") {
      let newParticle = new Particle(width / 2, height / 2, 3*maxVelocity,  3*maxVelocity, particleRadius, "red");
      particles.push(newParticle);
      initSwarm({ x: 0, y: 0 });
    }

  }

  function initSwarm(velocity = null) {

    for (let i = 0; i < numParticles; i++) {
      let newParticle;
      let isValid;

      do {
        isValid = true;

        // Use the specified velocity or generate a random velocity
        let vx = velocity !== null ? velocity.x : random(-maxVelocity, maxVelocity);
        let vy = velocity !== null ? velocity.y : random(-maxVelocity, maxVelocity);

        newParticle = new Particle(random(width), random(height), vx, vy, particleRadius);

        // Check against all existing particles
        for (let other of particles) {
          let dx = newParticle.x - other.x;
          let dy = newParticle.y - other.y;
          let distance = sqrt(dx ** 2 + dy ** 2);

          if (distance <= 2.1 * newParticle.radius) {
            isValid = false; // Too close, retry
            break;
          }
        }
      } while (!isValid);

      particles.push(newParticle); // Add particle if valid
    }


  }






}

function draw() {
  background(220);

  // Reset values
  pressure = 0;
  velocities = [];
  energies = [];
  grid.clear();

  // Update and check collisions
  for (let particle of particles) {
    grid.add(particle);
    particle.move(gravityEnabled);
    particle.checkWallCollision();
    grid.checkCollisions(particle);

    let speed = particle.getVelocityMagnitude();  // Renamed function here
    velocities.push(speed);
    energies.push(0.5 * particle.mass * speed ** 2);
  }

  // Compute physical properties
  temperature = velocities.reduce((sum, v) => sum + v ** 2, 0) / numParticles;
  avgEnergy = energies.reduce((sum, e) => sum + e, 0) / numParticles;

  // Store the last 10 frames' values for averaging
  pressureHistory.push(pressure);
  temperatureHistory.push(temperature);
  avgEnergyHistory.push(avgEnergy);

  // Keep only the last 10 values
  if (pressureHistory.length > maxHistoryLength) {
    pressureHistory.shift();
    temperatureHistory.shift();
    avgEnergyHistory.shift();
  }

  // Average over the last 10 frames
  let avgPressure = pressureHistory.reduce((sum, val) => sum + val, 0) / pressureHistory.length;
  let avgTemp = temperatureHistory.reduce((sum, val) => sum + val, 0) / temperatureHistory.length;
  let avgEnergyVal = avgEnergyHistory.reduce((sum, val) => sum + val, 0) / avgEnergyHistory.length;

  // Display particles
  for (let particle of particles) {
    particle.display();
  }

  // Display histograms
  prevMaxV = plotHistogram(velocities, 50, 10, height - 100, 200, 80, 'Velocity', prevMaxV);
  prevMaxE = plotHistogram(energies, 50, 220, height - 100, 200, 80, 'Energy', prevMaxE);

  // Display text
  textSize(14);
  fill(255);
  stroke(0);
  strokeWeight(4);
  textAlign(LEFT);
  text(`Instantaneous Pressure: ${pressure.toFixed(3) * 1000} mPa`, 10, 20);
  text(`Instantaneous Temperature: ${temperature.toFixed(2)} K`, 10, 40);
  text(`Instantaneous Average Energy: ${avgEnergy.toFixed(2)} J`, 10, 60);
  text(`Averaged Pressure (last ${maxHistoryLength} frames): ${avgPressure.toFixed(3) * 1000} mPa`, 10, 80);
  text(`Averaged Temperature (last ${maxHistoryLength} frames): ${avgTemp.toFixed(2)} K`, 10, 100);
  text(`Averaged Average Energy (last ${maxHistoryLength} frames): ${avgEnergyVal.toFixed(2)} J`, 10, 120);
}

// Particle class
class Particle {
  constructor(x, y, vx, vy, radius, color="DodgerBlue") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.mass = 1; // Assume unit mass for simplicity
    this.color = color;
  }

  move(gravity) {
    if (gravity) {
      this.vy += 0.1; // Apply downward gravitational acceleration
    }
    this.x += this.vx;
    this.y += this.vy;
  }

  checkWallCollision() {
    // Check for collision with the left and right walls
    if (this.x - this.radius < 0 || this.x + this.radius > width) {
      this.vx *= -1;
      this.x = constrain(this.x, this.radius, width - this.radius); // Prevent particle from getting stuck in the wall
      pressure += 2 * this.mass * abs(this.vx) / (height * 2);
    }

    // Check for collision with the top and bottom walls
    if (this.y - this.radius < 0 || this.y + this.radius > height) {
      this.vy *= -1;
      this.y = constrain(this.y, this.radius, height - this.radius); // Prevent particle from getting stuck in the wall
      pressure += 2 * this.mass * abs(this.vy) / (width * 2);
    }
  }

  checkCollision(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let dist = sqrt(dx ** 2 + dy ** 2);
    if (dist < this.radius + other.radius) {
      let nx = dx / dist;
      let ny = dy / dist;
      let p = 2 * (this.vx * nx + this.vy * ny - other.vx * nx - other.vy * ny) /
        (this.mass + other.mass);

      this.vx -= p * other.mass * nx;
      this.vy -= p * other.mass * ny;
      other.vx += p * this.mass * nx;
      other.vy += p * this.mass * ny;
    }
  }

  getVelocityMagnitude() {
    return sqrt(this.vx ** 2 + this.vy ** 2);
  }

  display() {
    fill(this.color);
    noStroke();
    ellipse(this.x, this.y, this.radius * 2);
  }
}

// Grid class for spatial partitioning
class Grid {
  constructor(size, cellSize) {
    this.size = size;
    this.cellSize = cellSize;
    this.cells = [];
    for (let i = 0; i < size / cellSize; i++) {
      this.cells[i] = [];
      for (let j = 0; j < size / cellSize; j++) {
        this.cells[i][j] = [];
      }
    }
  }

  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = 0; j < this.cells[i].length; j++) {
        this.cells[i][j] = [];
      }
    }
  }

  add(particle) {
    // Ensure particle's grid cell is within bounds
    let col = Math.floor(particle.x / this.cellSize);
    let row = Math.floor(particle.y / this.cellSize);

    // Check if the calculated indices are within the grid bounds
    if (col >= 0 && col < this.cells.length && row >= 0 && row < this.cells[0].length) {
      this.cells[col][row].push(particle);
    }
  }

  checkCollisions(particle) {
    let col = Math.floor(particle.x / this.cellSize);
    let row = Math.floor(particle.y / this.cellSize);

    for (let i = Math.max(0, col - 1); i <= Math.min(col + 1, this.cells.length - 1); i++) {
      for (let j = Math.max(0, row - 1); j <= Math.min(row + 1, this.cells[0].length - 1); j++) {
        for (let other of this.cells[i][j]) {
          if (other !== particle) {
            particle.checkCollision(other);
          }
        }
      }
    }
  }
}

// Plot histogram
function plotHistogram(data, bins, x, y, w, h, label, prevMax) {
  let hist = new Array(bins).fill(0);
  let minVal = 0;
  let maxVal;
  if (max(data) > prevMax) {
    maxVal = max(data)
  }
  else {
    maxVal = prevMax
  }
  let binWidth = (maxVal - minVal) / bins;

  for (let val of data) {
    let bin = Math.floor((val - minVal) / binWidth);
    hist[Math.min(bin, bins - 1)]++;
  }

  let maxHist = Math.max(...hist);

  // Draw histogram
  fill(200);
  rect(x, y - h, w, h);
  fill(0);
  textAlign(CENTER);
  text(label, x + w / 2, y + 20);

  for (let i = 0; i < bins; i++) {
    let binHeight = map(hist[i], 0, maxHist, 0, h);
    rect(x + (i * w) / bins, y - binHeight, w / bins, binHeight);
  }
  return maxVal
}