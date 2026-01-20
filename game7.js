const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: 0,
    speed: 2,
    size: 20
};

let treasure = {
    x: Math.random() * (canvas.width - 50) + 25,
    y: Math.random() * (canvas.height - 50) + 25,
    size: 30,
    collected: false
};

// Define walls
const walls = [
    { x: 100, y: 100, width: 200, height: 20 },
    { x: 400, y: 200, width: 20, height: 200 },
    { x: 200, y: 400, width: 200, height: 20 },
    { x: 600, y: 100, width: 20, height: 300 }
];

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.moveTo(0, -player.size);
    ctx.lineTo(-player.size, player.size);
    ctx.lineTo(player.size, player.size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawTreasure() {
    if (!treasure.collected) {
        ctx.fillStyle = 'gold';
        ctx.fillRect(treasure.x - treasure.size / 2, treasure.y - treasure.size / 2, treasure.size, treasure.size);
    }
}

function drawWalls() {
    ctx.fillStyle = 'gray';
    walls.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
}

function drawLight() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 100, player.y + Math.sin(player.angle) * 100);
    ctx.lineTo(player.x + Math.cos(player.angle + Math.PI / 6) * 50, player.y + Math.sin(player.angle + Math.PI / 6) * 50);
    ctx.lineTo(player.x + Math.cos(player.angle - Math.PI / 6) * 50, player.y + Math.sin(player.angle - Math.PI / 6) * 50);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.restore();
}

function illuminateWalls() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    walls.forEach(wall => {
        const wallCenterX = wall.x + wall.width / 2;
        const wallCenterY = wall.y + wall.height / 2;

        const dx = wallCenterX - player.x;
        const dy = wallCenterY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 200) {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
    });
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLight();
    illuminateWalls();
    drawWalls();
    drawTreasure();
    drawPlayer();

    // Check for treasure collection
    if (!treasure.collected && 
        player.x > treasure.x - treasure.size / 2 && 
        player.x < treasure.x + treasure.size / 2 && 
        player.y > treasure.y - treasure.size / 2 && 
        player.y < treasure.y + treasure.size / 2) {
        treasure.collected = true;
        alert("Treasure collected!");
    }

    requestAnimationFrame(update);
}

function handleKeyDown(event) {
    switch (event.key) {
        case 'ArrowUp':
            player.x += Math.cos(player.angle) * player.speed;
            player.y += Math.sin(player.angle) * player.speed;
            break;
        case 'ArrowDown':
            player.x -= Math.cos(player.angle) * player.speed;
            player.y -= Math.sin(player.angle) * player.speed;
            break;
        case 'ArrowLeft':
            player.angle -= 0.1; // Rotate left
            break;
        case 'ArrowRight':
            player.angle += 0.1; // Rotate right
            break;
    }
}

document.add