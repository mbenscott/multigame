class LavaRun {
    constructor() {
        this.canvas = document.getElementById('lavaCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('lavaHighScore')) || 0;
        
        // Player properties
        this.player = {
            x: 100,
            y: this.canvas.height - 50,
            width: 25,
            height: 25,
            jumping: false,
            velocityY: 0,
            hasWings: false,     // Start without wings
            wingsActive: false,
            wingsPower: 0,       // Start with no wing power
            wingsRecharging: false,
            wingsDepletionRate: 0.42,
            wingAngle: 0,        // For wing animation
            wingFlapSpeed: 0.15  // Speed of wing flapping
        };
        
        // Game properties
        this.gravity = 0.8;
        this.jumpForce = -15;
        this.superJumpForce = -24.75;
        this.baseGameSpeed = 5;
        this.gameSpeed = this.baseGameSpeed;
        this.obstacles = [];
        this.powerBoosts = [];
        this.minGap = 150;  // Reduced minimum gap
        this.maxGap = 500;  // Increased maximum gap
        this.isGameOver = false;
        this.blockCount = 0; // Counter for blocks to place power boosts
        this.wingPickups = [];   // Array to store wing pickups
        
        // Initialize the first obstacle
        this.addObstacle();
        
        // Update high score display immediately
        this.updateScoreDisplay();
        
        // Event listeners
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        document.addEventListener('touchstart', () => this.jump());
        
        // Start the game loop
        this.gameLoop();
    }
    
    handleKeyDown(e) {
        if (e.code === 'ArrowUp' && !this.player.jumping) {
            this.jump();
        }
        
        if (e.code === 'Space') {
            if (this.isGameOver) {
                this.resetGame();
            } else if (this.player.wingsPower > 0 && !this.player.wingsRecharging) {
                this.activateWings();
            }
        }
    }
    
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.deactivateWings();
        }
    }
    
    activateWings() {
        this.player.wingsActive = true;
    }
    
    deactivateWings() {
        this.player.wingsActive = false;
    }
    
    updateWings() {
        if (this.player.wingsActive && this.player.wingsPower > 0) {
            // Adjusted depletion rate for 4 seconds duration
            this.player.wingsPower = Math.max(0, this.player.wingsPower - this.player.wingsDepletionRate);
            this.player.velocityY = -5; // Gentle upward force
            
            if (this.player.wingsPower === 0) {
                this.player.wingsRecharging = true;
                this.deactivateWings();
            }
        } else if (!this.player.wingsActive && this.player.wingsPower < 100) {
            this.player.wingsPower += 0.2;
            if (this.player.wingsPower >= 100) {
                this.player.wingsPower = 100;
                this.player.wingsRecharging = false;
            }
        }
    }
    
    jump(isSuperJump = false) {
        if (!this.player.jumping) {
            this.player.jumping = true;
            this.player.velocityY = isSuperJump ? this.superJumpForce : this.jumpForce;
        }
    }
    
    addObstacle() {
        this.blockCount++;
        const width = 30;
        const height = 15 + Math.random() * 45;
        
        // Add wing pickup at block 20
        if (this.blockCount === 20) {
            this.wingPickups.push({
                x: this.canvas.width,
                y: this.canvas.height - 100, // Float higher than obstacles
                width: 30,
                height: 30,
                collected: false
            });
        }
        
        // Speed increase every 15 blocks
        if (this.blockCount % 15 === 0) {
            this.gameSpeed *= 1.05;
            this.showSpeedIncreaseMessage();
        }
        
        const randomGap = Math.random() * (this.maxGap - this.minGap) + this.minGap;
        
        this.obstacles.push({
            x: this.canvas.width,
            y: this.canvas.height - height,
            width: width,
            height: height,
            passed: false,
            gap: randomGap
        });

        if (this.blockCount % 10 === 0) {
            const boostOffset = randomGap * (0.3 + Math.random() * 0.4);
            this.powerBoosts.push({
                x: this.canvas.width + boostOffset,
                y: this.canvas.height - 40,
                width: 20,
                height: 20,
                used: false
            });
        }
    }
    
    update() {
        if (this.isGameOver) return;
        
        // Update wing animation
        this.player.wingAngle += this.player.wingFlapSpeed;
        
        if (this.player.hasWings) {
            this.updateWings();
        }
        
        // Update player
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground collision
        if (this.player.y > this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            this.player.jumping = false;
            this.player.velocityY = 0;
        }
        
        // Update obstacles with variable spacing
        let lastObstacleX = 0;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameSpeed;
            
            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
            }
            
            if (!obstacle.passed && obstacle.x + obstacle.width < this.player.x) {
                obstacle.passed = true;
                this.score++;
                this.updateScoreDisplay();
            }
            
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
            } else {
                lastObstacleX = Math.max(lastObstacleX, obstacle.x);
            }
        }
        
        // Update power boosts
        for (let i = this.powerBoosts.length - 1; i >= 0; i--) {
            const boost = this.powerBoosts[i];
            boost.x -= this.gameSpeed;
            
            if (!boost.used && this.checkCollision(this.player, boost)) {
                boost.used = true;
                this.player.velocityY = this.superJumpForce;
                this.player.jumping = true;
                this.createPowerBoostEffect(boost.x, boost.y);
            }
            
            if (boost.x + boost.width < 0) {
                this.powerBoosts.splice(i, 1);
            }
        }
        
        // Update wing pickups
        for (let i = this.wingPickups.length - 1; i >= 0; i--) {
            const pickup = this.wingPickups[i];
            pickup.x -= this.gameSpeed;
            
            if (!pickup.collected && this.checkCollision(this.player, pickup)) {
                pickup.collected = true;
                this.player.hasWings = true;
                this.player.wingsPower = 100;
                this.showWingPickupMessage();
            }
            
            if (pickup.x + pickup.width < 0) {
                this.wingPickups.splice(i, 1);
            }
        }
        
        // Add new obstacles with variable spacing
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        if (this.obstacles.length === 0 || 
            (lastObstacle && this.canvas.width - lastObstacle.x >= lastObstacle.gap)) {
            this.addObstacle();
        }
    }
    
    checkCollision(player, object) {
        return player.x < object.x + object.width &&
               player.x + player.width > object.x &&
               player.y < object.y + object.height &&
               player.y + player.height > object.y;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw wing pickups
        this.ctx.fillStyle = '#333333';
        for (const pickup of this.wingPickups) {
            if (!pickup.collected) {
                // Draw wing pickup with animation
                const hoverOffset = Math.sin(Date.now() / 500) * 5;
                this.drawWings(
                    pickup.x + pickup.width/2,
                    pickup.y + hoverOffset,
                    pickup.height
                );
            }
        }
        
        // Draw player
        this.ctx.fillStyle = '#00FF00';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw wings if player has them and they're active
        if (this.player.hasWings && this.player.wingsActive) {
            this.drawWings(
                this.player.x + this.player.width/2,
                this.player.y,
                this.player.height
            );
        }
        
        // Draw wings power bar only if player has wings
        if (this.player.hasWings) {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(this.canvas.width - 120, 20, 100, 20);
            this.ctx.fillStyle = this.player.wingsRecharging ? '#ff6666' : '#000000';
            this.ctx.fillRect(this.canvas.width - 120, 20, this.player.wingsPower, 20);
            
            // Add percentage text
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `${Math.round(this.player.wingsPower)}%`,
                this.canvas.width - 70,
                35
            );
        }
        
        // Draw obstacles
        this.ctx.fillStyle = '#FF0000';
        for (const obstacle of this.obstacles) {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
        
        // Draw power boosts with enhanced visual effect
        for (const boost of this.powerBoosts) {
            if (!boost.used) {
                // Pulsing glow effect
                const pulseSize = Math.sin(Date.now() / 200) * 5;
                
                // Outer glow
                const gradient = this.ctx.createRadialGradient(
                    boost.x + boost.width/2, boost.y + boost.height/2, 0,
                    boost.x + boost.width/2, boost.y + boost.height/2, boost.width + pulseSize
                );
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(
                    boost.x - 10 - pulseSize,
                    boost.y - 10 - pulseSize,
                    boost.width + 20 + pulseSize * 2,
                    boost.height + 20 + pulseSize * 2
                );
                
                // Main power boost
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.fillRect(boost.x, boost.y, boost.width, boost.height);
            }
        }
        
        // Draw game over message
        if (this.isGameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press Space to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }
    
    gameLoop = () => {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
    
    updateScoreDisplay() {
        // Update current score
        document.getElementById('lava-score-display').textContent = `Score: ${this.score}`;
        
        // Update high score if beaten
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('lavaHighScore', this.highScore.toString());
            document.getElementById('lava-high-score-display').textContent = `High Score: ${this.highScore}`;
            
            // Add visual feedback for new high score
            const highScoreDisplay = document.getElementById('lava-high-score-display');
            highScoreDisplay.style.color = '#00ff00'; // Green color
            setTimeout(() => {
                highScoreDisplay.style.color = 'white'; // Reset color after 1 second
            }, 1000);
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('lavaHighScore', this.highScore.toString());
        }
    }
    
    resetGame() {
        this.score = 0;
        this.gameSpeed = this.baseGameSpeed; // Reset speed to base speed
        this.player.y = this.canvas.height - 50;
        this.player.velocityY = 0;
        this.player.jumping = false;
        this.player.hasWings = false;
        this.player.wingsPower = 0;
        this.player.wingsActive = false;
        this.player.wingsRecharging = false;
        this.obstacles = [];
        this.powerBoosts = [];
        this.blockCount = 0;
        this.wingPickups = [];
        this.addObstacle();
        this.isGameOver = false;
        this.updateScoreDisplay();
    }

    // Enhanced power boost effect
    createPowerBoostEffect(x, y) {
        const particles = [];
        // Create more particles for a more dramatic effect
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: x + 10,
                y: y + 10,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 1,
                size: Math.random() * 4 + 2
            });
        }

        const animateParticles = () => {
            if (particles.length === 0) return;

            this.ctx.save();
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;
                p.size *= 0.99;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                this.ctx.fillStyle = `rgba(0, 255, 255, ${p.life})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();

            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };

        animateParticles();
    }

    showSpeedIncreaseMessage() {
        const speedMessage = document.createElement('div');
        speedMessage.style.position = 'absolute';
        speedMessage.style.top = '50%';
        speedMessage.style.left = '50%';
        speedMessage.style.transform = 'translate(-50%, -50%)';
        speedMessage.style.color = '#ffff00';
        speedMessage.style.fontSize = '24px';
        speedMessage.style.fontWeight = 'bold';
        speedMessage.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        speedMessage.textContent = `Speed Increased! (${Math.round((this.gameSpeed / this.baseGameSpeed - 1) * 100)}% faster)`;
        document.body.appendChild(speedMessage);

        // Fade out and remove the message
        let opacity = 1;
        const fadeOut = setInterval(() => {
            opacity -= 0.05;
            speedMessage.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(fadeOut);
                document.body.removeChild(speedMessage);
            }
        }, 50);
    }

    showWingPickupMessage() {
        const message = document.createElement('div');
        message.style.position = 'absolute';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.color = '#ffffff';
        message.style.fontSize = '24px';
        message.style.fontWeight = 'bold';
        message.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        message.textContent = 'Wings Acquired! Press SPACE to use';
        document.body.appendChild(message);

        setTimeout(() => {
            let opacity = 1;
            const fadeOut = setInterval(() => {
                opacity -= 0.05;
                message.style.opacity = opacity;
                if (opacity <= 0) {
                    clearInterval(fadeOut);
                    document.body.removeChild(message);
                }
            }, 50);
        }, 2000);
    }

    drawWings(x, y, height) {
        const wingSpan = height * 1.5;
        const flapHeight = Math.sin(this.player.wingAngle) * height * 0.3;
        
        this.ctx.save();
        this.ctx.translate(x, y + height/2);
        
        // Draw left wing
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        // Main wing shape
        this.ctx.bezierCurveTo(
            -wingSpan * 0.5, -height * 0.3 + flapHeight,
            -wingSpan * 0.8, -height * 0.2 + flapHeight,
            -wingSpan, flapHeight
        );
        // Wing detail lines
        for (let i = 1; i <= 3; i++) {
            const factor = i / 4;
            this.ctx.moveTo(-wingSpan * factor, flapHeight * factor);
            this.ctx.lineTo(-wingSpan * factor, -height * 0.2 + flapHeight * factor);
        }
        this.ctx.stroke();
        
        // Draw right wing
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.bezierCurveTo(
            wingSpan * 0.5, -height * 0.3 + flapHeight,
            wingSpan * 0.8, -height * 0.2 + flapHeight,
            wingSpan, flapHeight
        );
        for (let i = 1; i <= 3; i++) {
            const factor = i / 4;
            this.ctx.moveTo(wingSpan * factor, flapHeight * factor);
            this.ctx.lineTo(wingSpan * factor, -height * 0.2 + flapHeight * factor);
        }
        this.ctx.stroke();
        
        this.ctx.restore();
    }
}

// Add this script tag to your HTML file
let lavaGame;
function initLavaRun() {
    lavaGame = new LavaRun();
} 