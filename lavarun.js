class LavaRun {
    constructor() {
        this.canvas = document.getElementById('lavaCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('lavaRunHighScore')) || 0;
        
        // Player properties
        this.player = {
            x: 100,
            y: this.canvas.height - 50,
            width: 30,
            height: 35,
            jumping: false,
            velocityY: 0,
            hasWings: false,
            wingsActive: false,
            wingsPower: 0,
            wingsRecharging: false,
            wingsDepletionRate: 0.42,
            wingAngle: 0,
            wingFlapSpeed: 0.15,
            runFrame: 0,
            runAnimationSpeed: 0.2,
            onPlatform: false,
            isInvincible: false
        };
        
        // Game properties
        this.gravity = 0.8;
        this.jumpForce = -15;
        this.superJumpForce = -24.75;
        this.baseGameSpeed = 5;
        this.gameSpeed = this.baseGameSpeed;
        this.obstacles = [];
        this.powerBoosts = [];
        this.platforms = [];  // New array for platforms
        this.minGap = 150;
        this.maxGap = 500;
        this.isGameOver = false;
        this.blockCount = 0;
        this.wingPickups = [];
        this.powerUpGlowAngle = 0; // Add this for animated glow effect
        
        // Add health system
        this.maxHearts = 2;
        this.hearts = this.maxHearts;
        
        // Create heart container element
        this.createHeartContainer();
        
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
        
        // Speed increase every 10 blocks (changed from 15)
        if (this.blockCount % 10 === 0) {
            this.gameSpeed *= 1.05; // 5% increase
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

        // Add power boost every 10 blocks
        if (this.blockCount % 10 === 0) {
            const boostOffset = randomGap * (0.3 + Math.random() * 0.4);
            this.powerBoosts.push({
                x: this.canvas.width + boostOffset,
                y: this.canvas.height - 40,
                width: 25,
                height: 25,
                used: false
            });
        }
    }
    
    update() {
        if (this.isGameOver) return;
        
        // Update powerup glow animation
        this.powerUpGlowAngle += 0.05;
        
        // Update wing animation
        this.player.wingAngle += this.player.wingFlapSpeed;
        
        if (this.player.hasWings) {
            this.updateWings();
        }
        
        // Update player
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Reset platform collision flag
        this.player.onPlatform = false;
        
        // Platform collisions
        let wasOnPlatform = this.player.onPlatform;
        this.player.onPlatform = false;
        
        for (let platform of this.platforms) {
            if (this.checkPlatformCollision(this.player, platform)) {
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.jumping = false;
                this.player.onPlatform = true;
                
                // Add small bounce effect when landing
                if (!wasOnPlatform) {
                    this.createPlatformLandingEffect(platform);
                }
                break;
            }
        }
        
        // Ground collision (only if not on platform)
        if (!this.player.onPlatform && this.player.y > this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            this.player.jumping = false;
            this.player.velocityY = 0;
        }
        
        // Update platforms
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            platform.x -= this.gameSpeed;
            
            // Remove platforms that are off screen
            if (platform.x + platform.width < 0) {
                this.platforms.splice(i, 1);
            }
        }
        
        // Update obstacles
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
                
                // Add a platform after collecting power boost
                this.addPlatform(boost.x + 200, this.canvas.height - 150);
            }
            
            if (boost.x + boost.width < 0) {
                this.powerBoosts.splice(i, 1);
            }
        }
        
        // Change wing acquisition to block 15
        if (this.blockCount === 15 && !this.player.hasWings) {
                this.player.hasWings = true;
                this.player.wingsPower = 100;
                this.showWingPickupMessage();
        }
        
        // Add new obstacles with variable spacing
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        if (this.obstacles.length === 0 || 
            (lastObstacle && this.canvas.width - lastObstacle.x >= lastObstacle.gap)) {
            this.addObstacle();
        }
    }
    
    checkCollision(player, object) {
        if (player.isInvincible) return false;
        return player.x < object.x + object.width &&
               player.x + player.width > object.x &&
               player.y < object.y + object.height &&
               player.y + player.height > object.y;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background with lava effect
        this.drawBackground();
        
        // Draw platforms
        this.drawPlatforms();
        
        // Draw power boosts with enhanced visibility
        this.drawPowerBoosts();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw enhanced player
        if (this.player.isInvincible) {
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
        }
        this.drawPlayer();
        this.ctx.globalAlpha = 1;
        
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
        
        this.drawHearts();
        
        // Draw game over message
        if (this.isGameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press Space to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
        
        // Draw score and high score
        this.drawScores();
    }
    
    drawPlayer() {
        // Save context for transformations
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);

        // Draw body
        this.ctx.fillStyle = '#00FF00';
        this.ctx.strokeStyle = '#008800';
        this.ctx.lineWidth = 2;

        // Body
        this.ctx.beginPath();
        this.ctx.roundRect(0, 0, this.player.width, this.player.height, 5);
        this.ctx.fill();
        this.ctx.stroke();

        // Eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.ellipse(this.player.width * 0.7, this.player.height * 0.3, 4, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupil
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.ellipse(this.player.width * 0.7 + 1, this.player.height * 0.3, 2, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Running animation for legs
        if (!this.player.jumping) {
            this.player.runFrame += this.player.runAnimationSpeed;
            const legOffset = Math.sin(this.player.runFrame) * 5;
            
            // Left leg
            this.ctx.beginPath();
            this.ctx.moveTo(5, this.player.height);
            this.ctx.lineTo(5, this.player.height + legOffset);
            this.ctx.strokeStyle = '#008800';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Right leg
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.width - 5, this.player.height);
            this.ctx.lineTo(this.player.width - 5, this.player.height - legOffset);
            this.ctx.stroke();
        }

        // Draw wings if player has them
        if (this.player.hasWings) {
            this.drawEnhancedWings(
                this.player.width/2,
                this.player.height/2,
                this.player.height * 2  // Larger wings
            );
        }

        this.ctx.restore();
    }

    drawEnhancedWings(x, y, height) {
        // Reduce height by 25%
        const adjustedHeight = height * 0.75;
        const wingSpan = adjustedHeight * 1.8;
        const flapHeight = Math.sin(this.player.wingAngle) * adjustedHeight * 0.3;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Wing glow effect when active
        if (this.player.wingsActive) {
            const glowColor = `rgba(255, 215, 0, ${0.3 + Math.sin(Date.now() / 200) * 0.2})`;
            this.ctx.shadowColor = glowColor;
            this.ctx.shadowBlur = 15;
        }

        // Draw left wing
        this.drawWingHalf(-1, wingSpan, adjustedHeight, flapHeight);
        
        // Draw right wing
        this.drawWingHalf(1, wingSpan, adjustedHeight, flapHeight);
        
        this.ctx.restore();
    }

    drawWingHalf(direction, wingSpan, height, flapHeight) {
        const gradient = this.ctx.createLinearGradient(0, 0, direction * wingSpan, flapHeight);
        gradient.addColorStop(0, '#333333');
        gradient.addColorStop(1, '#000000');
        
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 1;

        // Main wing shape
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.bezierCurveTo(
            direction * wingSpan * 0.5, -height * 0.3 + flapHeight,
            direction * wingSpan * 0.8, -height * 0.2 + flapHeight,
            direction * wingSpan, flapHeight
        );
        this.ctx.lineTo(direction * wingSpan * 0.8, flapHeight + height * 0.2);
        this.ctx.lineTo(0, height * 0.1);
        this.ctx.fill();
        this.ctx.stroke();

        // Wing details
        for (let i = 1; i <= 4; i++) {
            const factor = i / 5;
            this.ctx.beginPath();
            this.ctx.moveTo(direction * wingSpan * factor, flapHeight * factor);
            this.ctx.quadraticCurveTo(
                direction * wingSpan * factor * 0.8,
                -height * 0.1 + flapHeight * factor,
                direction * wingSpan * factor,
                -height * 0.15 + flapHeight * factor
            );
            this.ctx.stroke();
        }
    }

    drawObstacles() {
        for (const obstacle of this.obstacles) {
            // Create lava block effect
            const gradient = this.ctx.createLinearGradient(
                obstacle.x, obstacle.y,
                obstacle.x, obstacle.y + obstacle.height
            );
            gradient.addColorStop(0, '#ff4400');
            gradient.addColorStop(0.5, '#ff0000');
            gradient.addColorStop(1, '#cc0000');
            
            // Main block
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Glowing edge effect
            this.ctx.shadowColor = '#ff6600';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = '#ff8800';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
            
            // Add lava texture
            this.drawLavaTexture(obstacle);
        }
    }

    drawLavaTexture(obstacle) {
        const time = Date.now() / 1000;
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        
        for (let i = 0; i < 5; i++) {
            const x = obstacle.x + Math.sin(time + i) * (obstacle.width * 0.2);
            const y = obstacle.y + ((time * 50 + i * 20) % obstacle.height);
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawPowerBoosts() {
        for (const boost of this.powerBoosts) {
            if (!boost.used) {
                // Outer glow effect
                const glowSize = 20 + Math.sin(this.powerUpGlowAngle) * 5;
                const gradient = this.ctx.createRadialGradient(
                    boost.x + boost.width/2,
                    boost.y + boost.height/2,
                    0,
                    boost.x + boost.width/2,
                    boost.y + boost.height/2,
                    glowSize
                );
                
                // Enhanced teal color scheme
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
                gradient.addColorStop(0.5, 'rgba(0, 200, 200, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 150, 150, 0)');
                
                // Draw the glow
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(
                    boost.x - glowSize,
                    boost.y - glowSize,
                    boost.width + glowSize * 2,
                    boost.height + glowSize * 2
                );
                
                // Main powerup shape
                this.ctx.fillStyle = '#00FFFF'; // Bright teal
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 2;
                
                // Draw diamond shape
                this.ctx.beginPath();
                this.ctx.moveTo(boost.x + boost.width/2, boost.y);
                this.ctx.lineTo(boost.x + boost.width, boost.y + boost.height/2);
                this.ctx.lineTo(boost.x + boost.width/2, boost.y + boost.height);
                this.ctx.lineTo(boost.x, boost.y + boost.height/2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                
                // Add sparkle effect
                this.drawSparkles(boost);
            }
        }
    }

    drawSparkles(boost) {
        const time = Date.now() / 1000;
        this.ctx.fillStyle = '#FFFFFF';
        
        // Draw 4 rotating sparkles
        for (let i = 0; i < 4; i++) {
            const angle = (time * 2 + i * Math.PI/2);
            const distance = 5 + Math.sin(time * 3) * 2;
            const x = boost.x + boost.width/2 + Math.cos(angle) * distance;
            const y = boost.y + boost.height/2 + Math.sin(angle) * distance;
            
            // Draw star shape
            this.ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const starAngle = j * Math.PI * 2/5 - Math.PI/2;
                const length = (j % 2 === 0) ? 3 : 1.5;
                const pointX = x + Math.cos(starAngle) * length;
                const pointY = y + Math.sin(starAngle) * length;
                if (j === 0) this.ctx.moveTo(pointX, pointY);
                else this.ctx.lineTo(pointX, pointY);
            }
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    drawBackground() {
        // Create a dark gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#330000');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    gameLoop = () => {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
    
    updateScoreDisplay() {
        // Update current score
        document.getElementById('lava-score-display').textContent = `Score: ${this.score}`;
        
        // Update high score
        document.getElementById('lava-high-score-display').textContent = `High Score: ${this.highScore}`;
        
        // Visual feedback for new high score
        if (this.score > this.highScore) {
            const highScoreDisplay = document.getElementById('lava-high-score-display');
            highScoreDisplay.style.color = '#00ff00';
            setTimeout(() => {
                highScoreDisplay.style.color = 'white';
            }, 1000);
        }
        
        // Update hearts display in stats panel
        const statsPanel = document.querySelector('.stats-panel');
        let heartsContainer = document.getElementById('hearts-container');
        
        if (!heartsContainer) {
            heartsContainer = document.createElement('div');
            heartsContainer.id = 'hearts-container';
            heartsContainer.className = 'stats-item';
            statsPanel.appendChild(heartsContainer);
        }
        
        heartsContainer.textContent = `Hearts: ${this.hearts}`;
    }
    
    gameOver() {
        this.hearts--;
        this.updateHeartDisplay();
        
        if (this.hearts <= 0) {
            this.isGameOver = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('lavaRunHighScore', this.highScore.toString());
            }
            this.updateScoreDisplay();
        } else {
            this.player.y = this.canvas.height - 50;
            this.player.velocityY = 0;
            this.makePlayerInvincible();
        }
    }
    
    resetGame() {
        this.score = 0;
        this.gameSpeed = this.baseGameSpeed;
        this.player.y = this.canvas.height - 50;
        this.player.velocityY = 0;
        this.player.jumping = false;
        this.player.hasWings = false;
        this.player.wingsPower = 0;
        this.player.wingsActive = false;
        this.player.wingsRecharging = false;
        this.obstacles = [];
        this.powerBoosts = [];
        this.platforms = [];  // Clear platforms
        this.blockCount = 0;
        this.wingPickups = [];
        this.hearts = this.maxHearts;
        this.player.isInvincible = false;
        this.addObstacle();
        this.isGameOver = false;
        this.updateScoreDisplay();
        this.updateHeartDisplay();
    }

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
                size: Math.random() * 4 + 2,
                color: `hsl(${180 + Math.random() * 30}, 100%, ${50 + Math.random() * 50}%)`
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

                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life;
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

    // Update collision detection to be more forgiving for platforms
    checkPlatformCollision(player, platform) {
        const bufferZone = 5; // More forgiving landing zone
        return player.x < platform.x + platform.width &&
               player.x + player.width > platform.x &&
               player.y + player.height >= platform.y - bufferZone &&
               player.y + player.height <= platform.y + 10 &&
               player.velocityY >= 0;
    }

    // Modified addPlatform method to add five platforms total
    addPlatform(x, y) {
        // First (lowest) platform
        this.platforms.push({
            x: x,
            y: y,
            width: 120,
            height: 20
        });

        // Second (middle) platform - higher and further right
        this.platforms.push({
            x: x + 150,
            y: y - 100,
            width: 120,
            height: 20
        });

        // Third (highest) platform - even higher and further right
        const highestY = y - 200; // Store the highest y position for the next platforms
        this.platforms.push({
            x: x + 300,
            y: highestY,
            width: 120,
            height: 20
        });

        // Fourth platform - same height as third
        this.platforms.push({
            x: x + 500, // 200 pixels after the third platform
            y: highestY,
            width: 120,
            height: 20
        });

        // Fifth platform - same height as third
        this.platforms.push({
            x: x + 700, // 200 pixels after the fourth platform
            y: highestY,
            width: 120,
            height: 20
        });
    }

    drawPlatforms() {
        for (const platform of this.platforms) {
            // Create platform gradient
            const gradient = this.ctx.createLinearGradient(
                platform.x, platform.y,
                platform.x, platform.y + platform.height
            );
            gradient.addColorStop(0, '#4488FF');  // Light blue
            gradient.addColorStop(1, '#2244FF');  // Darker blue
            
            // Draw platform with glow effect
            this.ctx.shadowColor = '#6699FF';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Add platform details
            this.ctx.strokeStyle = '#99CCFF';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
            
            // Add platform texture
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < platform.width; i += 20) {
                this.ctx.fillRect(platform.x + i, platform.y, 10, platform.height);
            }

            // Add direction indicators
            this.drawPlatformIndicators(platform);
        }
    }

    // Enhanced platform indicators
    drawPlatformIndicators(platform) {
        this.ctx.save();
        
        // Only draw arrows for platforms that have a next platform
        if (platform.x < this.canvas.width - 300) {
            // Find the next platform
            const nextPlatform = this.platforms.find(p => p.x > platform.x && p.x - platform.x < 300);
            
            if (nextPlatform) {
                // Calculate arrow direction based on height difference
                const heightDiff = nextPlatform.y - platform.y;
                
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 2;
                
                // Draw arrow
                this.ctx.beginPath();
                if (heightDiff < 0) {
                    // Upward arrow for ascending platforms
                    this.ctx.moveTo(platform.x + platform.width + 10, platform.y + platform.height/2);
                    this.ctx.lineTo(platform.x + platform.width + 30, platform.y + platform.height/2 - 20);
                    this.ctx.lineTo(platform.x + platform.width + 30, platform.y + platform.height/2 + 20);
                } else {
                    // Horizontal arrow for same-level platforms
                    this.ctx.moveTo(platform.x + platform.width + 10, platform.y + platform.height/2);
                    this.ctx.lineTo(platform.x + platform.width + 40, platform.y + platform.height/2);
                    this.ctx.lineTo(platform.x + platform.width + 30, platform.y + platform.height/2 - 10);
                    this.ctx.moveTo(platform.x + platform.width + 40, platform.y + platform.height/2);
                    this.ctx.lineTo(platform.x + platform.width + 30, platform.y + platform.height/2 + 10);
                }
                this.ctx.stroke();
            }
        }
        
        // Add distance markers for platforms at the same height
        if (platform.x > 300) {
            const prevPlatform = this.platforms.find(p => p.x < platform.x && p.y === platform.y);
            if (prevPlatform) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.fillRect(platform.x - 2, platform.y + platform.height, 4, 15);
            }
        }
        
        this.ctx.restore();
    }

    // New method for platform landing effect
    createPlatformLandingEffect(platform) {
        const particles = [];
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: this.player.x + this.player.width/2,
                y: platform.y,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2,
                life: 1,
                size: Math.random() * 3 + 1
            });
        }

        const animateParticles = () => {
            if (particles.length === 0) return;

            this.ctx.save();
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.life -= 0.05;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                this.ctx.fillStyle = `rgba(150, 200, 255, ${p.life})`;
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

    drawScores() {
        // Draw score and high score
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 20);
        this.ctx.fillText(`High Score: ${this.highScore}`, 10, 40);
    }

    // Add method for temporary invincibility
    makePlayerInvincible() {
        this.player.isInvincible = true;
        setTimeout(() => {
            this.player.isInvincible = false;
        }, 2000); // 2 seconds of invincibility
    }

    // Add heart drawing method
    drawHearts() {
        const heartSize = 30;
        const startX = this.canvas.width + 20; // Position in stats panel
        const startY = 100; // Below score displays
        
        // Draw heart container
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(startX, startY - 10, heartSize * 2.5, heartSize + 20);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.strokeRect(startX, startY - 10, heartSize * 2.5, heartSize + 20);
        
        // Draw hearts
        for (let i = 0; i < this.maxHearts; i++) {
            if (i < this.hearts) {
                this.drawHeart(startX + 10 + i * (heartSize + 5), startY, heartSize, '#FF0000');
            } else {
                this.drawHeart(startX + 10 + i * (heartSize + 5), startY, heartSize, '#666666');
            }
        }
        this.ctx.restore();
    }

    // Method to draw a single heart
    drawHeart(x, y, size, color) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        const heartPath = new Path2D();
        heartPath.moveTo(x + size/2, y + size/5);
        
        // Left bump
        heartPath.bezierCurveTo(
            x + size/2, y, 
            x, y, 
            x, y + size/3
        );
        
        // Left line to point
        heartPath.bezierCurveTo(
            x, y + size/1.5, 
            x + size/2, y + size/1.25, 
            x + size/2, y + size
        );
        
        // Right line to point
        heartPath.bezierCurveTo(
            x + size/2, y + size/1.25, 
            x + size, y + size/1.5, 
            x + size, y + size/3
        );
        
        // Right bump
        heartPath.bezierCurveTo(
            x + size, y, 
            x + size/2, y, 
            x + size/2, y + size/5
        );
        
        this.ctx.fill(heartPath);
        this.ctx.stroke(heartPath);
        
        // Add shine effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + size/4, 
            y + size/3, 
            size/6, 
            size/8, 
            -Math.PI/4, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.restore();
    }

    // New method to create heart container
    createHeartContainer() {
        // Remove any existing heart container
        const existingContainer = document.getElementById('heart-display-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create new container
        const heartContainer = document.createElement('div');
        heartContainer.id = 'heart-display-container';
        
        // Add hearts
        for (let i = 0; i < this.maxHearts; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart-display';
            heart.id = `heart-${i}`;
            heartContainer.appendChild(heart);
        }

        // Add container after canvas
        const gameContainer = document.querySelector('.game-container');
        gameContainer.appendChild(heartContainer);

        // Initial heart update
        this.updateHeartDisplay();
    }

    // Update heart display
    updateHeartDisplay() {
        for (let i = 0; i < this.maxHearts; i++) {
            const heart = document.getElementById(`heart-${i}`);
            if (heart) {
                heart.className = `heart-display ${i < this.hearts ? 'heart-full' : 'heart-empty'}`;
            }
        }
    }
}

// Add this script tag to your HTML file
let lavaGame;
function initLavaRun() {
    lavaGame = new LavaRun();
} 