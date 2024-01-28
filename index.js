const COLLISION_ENERGY_LOSS = 0.15;
const FRAME_RATE = 100;
const ELASTIC_COLLISIONS = true;
const BALL_DIAMETER = 4; 
const BALL_RADIUS = BALL_DIAMETER / 2;
const GRID_SIZE = 100; 
let gravityEnabled = true; 
let collisionsEnabled = true;
let lastFrameTime = Date.now();
let frameCount = 0;
let fps = 0;
let canvas, ctx;
let grid = [];
const universe = [];

class Vector {
  velocity;
  direction;

  constructor(m, d) {
    m ? (this.velocity = m) : (this.velocity = 0);
    d ? (this.direction = d) : (this.direction = 0);
  }
}

class Ball {
  xPos;
  yPos;
  mass;
  vector;
  htmlElement;

  constructor(x, y, m, v, e) {
    this.xPos = x;
    this.yPos = y;
    this.mass = m;
    this.vector = v;
    this.htmlElement = e;
  }
}

const setupGrid = () => {
  grid = [];
  for (let i = 0; i < Math.ceil(canvas.width / GRID_SIZE); i++) {
    grid[i] = [];
    for (let j = 0; j < Math.ceil(canvas.height / GRID_SIZE); j++) {
      grid[i][j] = [];
    }
  }
}

const basicSetup = () => {
  canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext("2d");
  
  document.documentElement.style.setProperty(
    "--ball-diameter",
    `${BALL_DIAMETER}px`,
  );
  
  addClickHandler();

  document
    .getElementById("gravityToggle")
    .addEventListener("change", (event) => {
      gravityEnabled = event.target.checked;
    });

  document
    .getElementById("collisionToggle")
    .addEventListener("change", (event) => {
      collisionsEnabled = event.target.checked;
    });

  window.addEventListener("resize", resizeCanvas);
};

const addClickHandler = () => {
  canvas.addEventListener("click", (e) => {
    const NUM_BALLS = 100; // Number of balls to create
    const RADIUS = 200; // Radius of the circle of balls

    for (let i = 0; i < NUM_BALLS; i++) {
      const angle = (i / NUM_BALLS) * Math.PI * 2; // Divide the circle into 100 parts
      const x = e.clientX + RADIUS * Math.cos(angle) - BALL_RADIUS;
      const y = e.clientY + RADIUS * Math.sin(angle) - BALL_RADIUS;

      // Create a new Ball object
      const newBallObject = new Ball(x, y, 100, new Vector(0, 0));
      universe.push(newBallObject);
    }
  });
};

const tick = () => {
  move();
  render();
  frameCount++;

  const now = Date.now();
  const delta = now - lastFrameTime;

  if (delta >= 1000) {
    // Update FPS every second
    fps = frameCount;
    frameCount = 0;
    lastFrameTime = now;
    document.getElementById("fpsLabel").innerText = "FPS: " + fps;
  }
};

const applyGravity = (ball, gravitationalConstant, timeStep) => {
  // The velocity in X remains the same, as gravity only affects the Y component
  const velocityX = ball.vector.velocity * Math.cos(ball.vector.direction);

  // Gravity affects the velocity in Y. It should always pull down, hence adding the force.
  // Assuming downwards is the positive direction in Y-axis.
  const velocityY =
    ball.vector.velocity * Math.sin(ball.vector.direction) +
    gravitationalConstant * timeStep;

  // Update the ball's velocity vector with the new values
  ball.vector = new Vector(
    Math.sqrt(velocityX ** 2 + velocityY ** 2),
    Math.atan2(velocityY, velocityX),
  );
}

const detectCollision = (ball1, ball2) => {
  const dx = ball1.xPos - ball2.xPos;
  const dy = ball1.yPos - ball2.yPos;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < BALL_DIAMETER; 
}

const handleCollision = (ball1, ball2) => {
  // Calculate the difference in position
  const dx = ball2.xPos - ball1.xPos;
  const dy = ball2.yPos - ball1.yPos;

  // Calculate the distance between balls
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normal vector
  const nx = dx / distance;
  const ny = dy / distance;

  // Tangential vector
  const tx = -ny;
  const ty = nx;

  // Dot product tangent direction
  const dpTan1 =
    ball1.vector.velocity * Math.cos(ball1.vector.direction) * tx +
    ball1.vector.velocity * Math.sin(ball1.vector.direction) * ty;
  const dpTan2 =
    ball2.vector.velocity * Math.cos(ball2.vector.direction) * tx +
    ball2.vector.velocity * Math.sin(ball2.vector.direction) * ty;

  // Dot product normal direction
  const dpNorm1 =
    ball1.vector.velocity * Math.cos(ball1.vector.direction) * nx +
    ball1.vector.velocity * Math.sin(ball1.vector.direction) * ny;
  const dpNorm2 =
    ball2.vector.velocity * Math.cos(ball2.vector.direction) * nx +
    ball2.vector.velocity * Math.sin(ball2.vector.direction) * ny;

  // Conservation of momentum in 1D
  const m1 =
    (dpNorm1 * (ball1.mass - ball2.mass) + 2 * ball2.mass * dpNorm2) /
    (ball1.mass + ball2.mass);
  const m2 =
    (dpNorm2 * (ball2.mass - ball1.mass) + 2 * ball1.mass * dpNorm1) /
    (ball1.mass + ball2.mass);

  // Update ball velocities
  ball1.vector.velocity = Math.sqrt(m1 * m1 + dpTan1 * dpTan1);
  ball1.vector.direction = Math.atan2(
    m1 * ny + dpTan1 * ty,
    m1 * nx + dpTan1 * tx,
  );

  ball2.vector.velocity = Math.sqrt(m2 * m2 + dpTan2 * dpTan2);
  ball2.vector.direction = Math.atan2(
    m2 * ny + dpTan2 * ty,
    m2 * nx + dpTan2 * tx,
  );

  // Separate the balls slightly to avoid sticking

  if (distance < BALL_DIAMETER) {
    const overlap = 0.5 * (BALL_DIAMETER - distance);
    const nx = (ball2.xPos - ball1.xPos) / distance;
    const ny = (ball2.yPos - ball1.yPos) / distance;

    ball1.xPos -= overlap * nx;
    ball1.yPos -= overlap * ny;
    ball2.xPos += overlap * nx;
    ball2.yPos += overlap * ny;
  }
}

const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

const move = () => {
  setupGrid();
  const seconds = 1 / FRAME_RATE;

  for (let object of universe) {
    if (gravityEnabled) {
      const gravitationalConstant = 900.81; // m/s^2
      applyGravity(object, gravitationalConstant, seconds);
    }

    const distance = object.vector.velocity * seconds;
    let x2 = object.xPos + distance * Math.cos(object.vector.direction);
    let y2 = object.yPos + distance * Math.sin(object.vector.direction);

    // Check for wall collisions
    const rightEdge = x2 >= canvas.width - BALL_DIAMETER;
    const leftEdge = x2 <= 0;
    const topEdge = y2 <= 0;
    const bottomEdge = y2 >= canvas.height - BALL_DIAMETER;

    if (rightEdge || leftEdge) {
      object.vector.velocity *= 1 - COLLISION_ENERGY_LOSS; // Reduce velocity
      object.vector.direction = Math.PI - object.vector.direction;
      // Adjust ball position to stay within canvas
      x2 = rightEdge ? canvas.width - BALL_DIAMETER : leftEdge ? 0 : x2;
    }

    if (topEdge || bottomEdge) {
      object.vector.velocity *= 1 - COLLISION_ENERGY_LOSS; // Reduce velocity
      object.vector.direction = -object.vector.direction;
      // Adjust ball position to stay within canvas
      y2 = bottomEdge ? canvas.height - BALL_DIAMETER : topEdge ? 0 : y2;
    }

    // Assign new position to object
    object.xPos = x2;
    object.yPos = y2;

    if (collisionsEnabled) {
      let gridX = Math.floor(object.xPos / GRID_SIZE);
      let gridY = Math.floor(object.yPos / GRID_SIZE);

      if (gridX && gridY) grid[gridX][gridY].push(object);

      // Check collisions in grid
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
          let cell = grid[i][j];
          for (let k = 0; k < cell.length; k++) {
            for (let l = k + 1; l < cell.length; l++) {
              if (detectCollision(cell[k], cell[l])) {
                handleCollision(cell[k], cell[l]);
              }
            }
          }
        }
      }  
    }
  }
};

const render = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let ob of universe) {
    ctx.beginPath();
    ctx.arc(
      ob.xPos + BALL_RADIUS,
      ob.yPos + BALL_RADIUS,
      BALL_RADIUS,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#cb475b"; // Ball color
    ctx.fill();
    ctx.closePath();
  }

  document.getElementById("obs-label").innerText =
    `Objects: ${universe.length}`;
};

const start = () => {
  basicSetup();
  setupGrid();
  setInterval(tick, 1000 / FRAME_RATE);
};

start();
