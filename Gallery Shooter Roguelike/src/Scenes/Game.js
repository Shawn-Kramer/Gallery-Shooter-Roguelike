class Game extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    preload() {
        this.load.image('ship', './assets/playerShip1_red.png');
        this.load.image('playerLaser', './assets/PlayerLaser.png');
        this.load.image('enemyShooter', './assets/EnemyShooter.png');
        this.load.image('enemyDefender', './assets/EnemyDefender.png');
        this.load.image('enemyLaser', './assets/EnemyLaser.png');
        this.load.image('background', './assets/PurpleBackground.png');
        this.load.image('textBorder', './assets/TextBorder.png');
        this.load.audio('laserSound', './assets/laserSmall_002.ogg');
        this.load.audio('explosionSound', './assets/explosionCrunch_000.ogg');
        
        console.log('Game scene preload complete');
    }

    create() {
        this.initGame();
        
        // Add background
        const bg = this.add.image(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            'background'
        );
        const scaleX = this.sys.game.config.width / bg.width;
        const scaleY = this.sys.game.config.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
        
        // Create sounds
        this.laserSound = this.sound.add('laserSound');
        this.explosionSound = this.sound.add('explosionSound');
        
        // Set up player ship
        this.player = this.physics.add.sprite(
            this.sys.game.config.width / 2,
            this.sys.game.config.height - 50, 
            'ship'
        );
        this.player.setScale(0.5);
        
        // Create keys
        this.leftKey = this.input.keyboard.addKey('A');
        this.rightKey = this.input.keyboard.addKey('D');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        
        // Create groups
        this.playerLasers = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.enemyLasers = this.physics.add.group();
        
        // Collision detection
        this.physics.add.collider(this.playerLasers, this.enemies, this.hitEnemy, null, this);
        this.physics.add.collider(this.enemyLasers, this.player, this.hitPlayer, null, this);
        
        this.createUI();
        
        this.createEnemyWave();
        
        console.log('Game scene creation complete');
    }

    initGame() {
        // Game state variables
        this.gameOver = false;
        this.stage = 1;
        this.playerLives = 3;
        this.playerMaxLives = 3;
        this.enemiesRemaining = 0;
        
        // Player upgradable stats
        this.playerStats = {
            moveSpeed: 5,
            fireRate: 300, 
            damage: 1,
            laserSpeed: 10
        };
        
        // Enemy stats
        this.enemyStats = {
            baseHealth: 1,
            baseMoveSpeed: 2, 
            baseFireRate: 2000, 
            fireChance: 0.002 
        };
        
        this.canFire = true;
        
        // Upgrades
        this.upgrades = [
            { name: 'Fire Rate +', effect: () => { 
                this.playerStats.fireRate = Math.max(100, this.playerStats.fireRate - 50); 
            }},
            { name: 'Damage +', effect: () => { 
                this.playerStats.damage += 1; 
            }},
            { name: 'Move Speed +', effect: () => { 
                this.playerStats.moveSpeed += 1; 
            }},
            { name: 'Max Lives +', effect: () => { 
                this.playerMaxLives += 1; 
                this.playerLives += 1; 
                this.livesText.setText(`Lives: ${this.playerLives}/${this.playerMaxLives}`);
            }},
            { name: 'Laser Speed +', effect: () => { 
                this.playerStats.laserSpeed += 2; 
            }},
            { name: 'Full Heal', effect: () => { 
                this.playerLives = this.playerMaxLives; 
                this.livesText.setText(`Lives: ${this.playerLives}/${this.playerMaxLives}`);
            }}
        ];
    }

    createUI() {
        // Create stage counter text
        this.stageText = this.add.text(20, 20, `Stage: ${this.stage}`, { 
            fontSize: '24px', 
            fill: '#FFFFFF' 
        });
        
        // Create lives counter with max lives
        this.livesText = this.add.text(this.sys.game.config.width - 150, 20, `Lives: ${this.playerLives}/${this.playerMaxLives}`, { 
            fontSize: '24px', 
            fill: '#FFFFFF' 
        });
    }

    createEnemyWave() {
        // Clear any existing enemies
        this.enemies.clear(true, true);
        this.enemyLasers.clear(true, true);
        
        const rows = Math.min(3 + Math.floor(this.stage / 3), 6); 
        const cols = 6;
        const enemyWidth = 40;
        const enemyHeight = 40;
        const startX = (this.sys.game.config.width - (cols * enemyWidth * 1.5)) / 2 + enemyWidth;
        const startY = 80;
        
        this.enemiesRemaining = 0;
        
        // Create grid of enemies
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Determine enemy type
                let enemyType = 'enemyShooter';
                let health = this.enemyStats.baseHealth;
                
                if (row === rows - 1) {
                    enemyType = 'enemyDefender';
                    health = this.enemyStats.baseHealth * 2;
                }
                
                const enemy = this.enemies.create(
                    startX + col * enemyWidth * 1.5,
                    startY + row * enemyHeight * 1.5,
                    enemyType
                );
                
                enemy.setScale(0.5);
                enemy.health = health;
                enemy.enemyType = enemyType;
                enemy.value = enemyType === 'enemyDefender' ? 2 : 1; 
                enemy.direction = 1; 
                
                this.enemiesRemaining++;
            }
        }
    }

    showUpgradeMenu() {
        // Create menu overlay
        const overlay = this.add.rectangle(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            this.sys.game.config.width,
            this.sys.game.config.height,
            0x000000,
            0.7
        );
        
        const titleText = this.add.text(
            this.sys.game.config.width / 2,
            100,
            'Select an Upgrade',
            { fontSize: '32px', fill: '#FFFFFF' }
        ).setOrigin(0.5);
        
        // Get 3 random unique upgrades
        const upgradeOptions = [];
        const availableUpgrades = [...this.upgrades];
        
        for (let i = 0; i < Math.min(3, availableUpgrades.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
            upgradeOptions.push(availableUpgrades.splice(randomIndex, 1)[0]);
        }
        
        // Create upgrade buttons
        const buttons = [];
        const buttonWidth = 200;
        const buttonHeight = 80;
        const startX = (this.sys.game.config.width - (upgradeOptions.length * buttonWidth + (upgradeOptions.length - 1) * 20)) / 2;
        
        upgradeOptions.forEach((upgrade, index) => {
            const x = startX + index * (buttonWidth + 20);
            const y = this.sys.game.config.height / 2;
            
            const button = this.add.image(x + buttonWidth / 2, y, 'textBorder').setDisplaySize(buttonWidth, buttonHeight);
            const text = this.add.text(x + buttonWidth / 2, y, upgrade.name, { 
                fontSize: '24px', 
                fill: '#FFFFFF' 
            }).setOrigin(0.5);
            
            button.setInteractive();
            button.on('pointerdown', () => {
                upgrade.effect();
                
                overlay.destroy();
                titleText.destroy();
                buttons.forEach(b => b.forEach(element => element.destroy()));
                
                this.startNextStage();
            });
            
            buttons.push([button, text]);
        });
    }
    
    startNextStage() {
        this.stage++;
        
        this.stageText.setText(`Stage: ${this.stage}`);
        
        // Scale enemy stats with stage
        this.enemyStats.baseHealth = Math.ceil(this.stage / 3);
        this.enemyStats.baseMoveSpeed = 1 + (this.stage * 0.1);
        this.enemyStats.baseFireRate = Math.max(500, 2000 - (this.stage * 100));
        this.enemyStats.fireChance = 0.002 + (this.stage * 0.0005);
        
        this.createEnemyWave();
    }

    showGameOver() {
        // Game over text
        const gameOverText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 - 50,
            'GAME OVER',
            { fontSize: '64px', fill: '#FF0000' }
        ).setOrigin(0.5);
        
        const scoreText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 + 20,
            `You reached Stage: ${this.stage}`,
            { fontSize: '32px', fill: '#FFFFFF' }
        ).setOrigin(0.5);
        
        // Restart button
        const restartButton = this.add.image(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 + 100,
            'textBorder'
        ).setDisplaySize(200, 60);
        
        const restartText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 + 100,
            'Restart',
            { fontSize: '24px', fill: '#FFFFFF' }
        ).setOrigin(0.5);
        
        restartButton.setInteractive();
        restartButton.on('pointerdown', () => {
            // Reset game state
            this.initGame();
            
            // Update UI
            this.stageText.setText(`Stage: ${this.stage}`);
            this.livesText.setText(`Lives: ${this.playerLives}/${this.playerMaxLives}`);
            
            this.createEnemyWave();
            
            // Clean up game over screen
            gameOverText.destroy();
            scoreText.destroy();
            restartButton.destroy();
            restartText.destroy();
            
            this.gameOver = false;
        });
    }

    fireLaser() {
        // Create laser
        const laser = this.playerLasers.create(this.player.x, this.player.y - this.player.height/2, 'playerLaser');
        laser.setScale(0.5);
        laser.damage = this.playerStats.damage;
        
        this.laserSound.play({ volume: 0.5 });
        
        this.canFire = false;
        this.time.delayedCall(this.playerStats.fireRate, () => {
            this.canFire = true;
        });
    }

    enemyFireLaser(enemy) {
        if (this.gameOver) return;
        
        const laser = this.enemyLasers.create(enemy.x, enemy.y + enemy.height/2, 'enemyLaser');
        laser.setScale(0.5);
        laser.setVelocityY(200);
    }

    hitEnemy(laser, enemy) {
        enemy.health -= laser.damage;
        
        laser.destroy();
        
        if (enemy.health <= 0) {
            this.explosionSound.play({ volume: 0.5 });
            
            enemy.destroy();
            
            this.enemiesRemaining--;
            
            if (this.enemiesRemaining <= 0) {
                this.showUpgradeMenu();
            }
        }
    }

    hitPlayer(player, laser) {
        laser.destroy();
        
        this.playerLives--;
        this.livesText.setText(`Lives: ${this.playerLives}/${this.playerMaxLives}`);
        
        this.explosionSound.play({ volume: 0.7 });
        
        this.tweens.add({
            targets: player,
            alpha: 0,
            duration: 100,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                player.alpha = 1;
                player.y = this.sys.game.config.height - 50;
            }
        });
        
        // Check if game over
        if (this.playerLives <= 0) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    moveEnemies() {
        if (this.gameOver) return;
        
        let changeDirection = false;
        let lowestEnemy = 0;
        
        // Check if any enemy has reached the edge
        this.enemies.getChildren().forEach(enemy => {
            // Track the lowest enemy for game over condition
            lowestEnemy = Math.max(lowestEnemy, enemy.y + enemy.height/2);
            
            if ((enemy.x >= this.sys.game.config.width - enemy.width/2 && enemy.direction > 0) || 
                (enemy.x <= enemy.width/2 && enemy.direction < 0)) {
                changeDirection = true;
            }
        });
        
        // Check if enemies have reached the player
        if (lowestEnemy >= this.player.y - this.player.height) {
            this.gameOver = true;
            this.showGameOver();
            return;
        }
        
        // Move all enemies
        this.enemies.getChildren().forEach(enemy => {
            enemy.x += enemy.direction * (this.enemyStats.baseMoveSpeed + 1.5);
            
            if (changeDirection) {
                enemy.direction *= -1;
                enemy.y += 30 + (this.stage * 2);
            }
            
            // Random chance for shooter enemies to fire
            if (enemy.enemyType === 'enemyShooter' && Math.random() < this.enemyStats.fireChance) {
                this.enemyFireLaser(enemy);
            }
        });
    }

    update() {
        if (this.gameOver) return;
        
        if (this.leftKey.isDown && this.player.x > 0 + this.player.width/4) {
            this.player.x -= this.playerStats.moveSpeed;
        }
        
        if (this.rightKey.isDown && this.player.x < this.sys.game.config.width - this.player.width/4) {
            this.player.x += this.playerStats.moveSpeed;
        }
        
        this.player.y = this.sys.game.config.height - 50;
        
        if (this.spaceKey.isDown && this.canFire) {
            this.fireLaser();
        }
        
        this.playerLasers.getChildren().forEach(laser => {
            laser.y -= this.playerStats.laserSpeed;
            
            if (laser.y < 0) {
                laser.destroy();
            }
        });
        
        this.enemyLasers.getChildren().forEach(laser => {
            if (laser.y > this.sys.game.config.height) {
                laser.destroy();
            }
        });
        
        this.moveEnemies();
    }
}