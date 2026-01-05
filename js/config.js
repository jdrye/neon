/**
 * Game Configuration Constants
 * Central configuration file for all game settings
 * Last updated: 2026-01-05 12:22:42 UTC
 */

const CONFIG = {
  // Synchronization and Networking
  syncIntervalMs: 50,           // Sync interval in milliseconds (20 times per second)
  boardIntervalMs: 33,          // Board update interval in milliseconds (~30 FPS)
  maxPeers: 8,                  // Maximum number of peer connections
  
  // Pulse Settings
  pulse: {
    enabled: true,
    frequency: 0.5,             // Pulse frequency in Hz
    amplitude: 0.1,             // Pulse amplitude (0-1 scale)
    damping: 0.95,              // Damping factor for pulse decay
  },

  // Powerups Configuration
  powerups: {
    enabled: true,
    spawnRate: 0.02,            // Probability of powerup spawn per frame (0-1)
    maxActive: 5,               // Maximum active powerups on board
    lifetime: 10000,            // Powerup lifetime in milliseconds
    types: {
      shield: {
        duration: 5000,         // Duration in milliseconds
        cooldown: 10000,        // Cooldown between uses
        rarity: 0.3,            // Relative rarity (0-1)
      },
      speedBoost: {
        duration: 3000,
        cooldown: 8000,
        rarity: 0.4,
        multiplier: 1.5,        // Speed multiplier
      },
      doublePoints: {
        duration: 4000,
        cooldown: 15000,
        rarity: 0.25,
        multiplier: 2.0,
      },
      slowTime: {
        duration: 2000,
        cooldown: 12000,
        rarity: 0.35,
        multiplier: 0.5,        // Time slowdown multiplier
      },
      invincibility: {
        duration: 3000,
        cooldown: 20000,
        rarity: 0.1,            // Rare powerup
      },
    },
  },

  // Spawn Rates and Spawning
  spawn: {
    playerSpawnInterval: 2000,  // Milliseconds between respawns
    enemySpawnRate: 0.03,       // Probability of enemy spawn per frame
    maxEnemies: 20,             // Maximum enemies on board
    waves: {
      enabled: true,
      waveInterval: 30000,      // Milliseconds between waves
      enemiesPerWave: 3,        // Base enemies per wave
      difficultyScaling: 1.1,   // Multiplier per wave
    },
  },

  // Board/Arena Settings
  board: {
    width: 800,                 // Board width in pixels
    height: 600,                // Board height in pixels
    backgroundColor: '#0a0e27', // Dark background
    gridEnabled: true,
    gridSize: 50,               // Grid cell size in pixels
  },

  // Player Settings
  player: {
    startHealth: 100,
    maxHealth: 100,
    speed: 200,                 // Pixels per second
    acceleration: 800,          // Pixels per second squared
    deceleration: 600,
    size: 15,                   // Player radius in pixels
    color: '#00ff88',           // Neon green
    fireRate: 200,              // Milliseconds between shots
  },

  // Enemy Settings
  enemy: {
    baseHealth: 50,
    baseSpeed: 100,
    baseSize: 12,
    color: '#ff0055',           // Neon pink
    spawnDistance: 150,         // Min distance from player spawn
    types: {
      basic: {
        health: 30,
        speed: 80,
        size: 12,
        points: 10,
      },
      fast: {
        health: 20,
        speed: 150,
        size: 10,
        points: 25,
      },
      tank: {
        health: 80,
        speed: 50,
        size: 18,
        points: 50,
      },
      scout: {
        health: 15,
        speed: 120,
        size: 8,
        points: 15,
      },
    },
  },

  // Projectile Settings
  projectile: {
    speed: 350,                 // Pixels per second
    size: 4,                    // Projectile radius
    damage: 10,
    lifetime: 5000,             // Milliseconds before despawn
    color: '#00ff88',
  },

  // Game Mechanics
  mechanics: {
    gravity: 0,                 // Gravity acceleration (0 for space-like)
    friction: 0.98,             // Friction multiplier
    collisionDamage: 10,        // Damage from enemy collision
    scoringMultiplier: 1.0,
    difficultyScaling: 1.02,    // Difficulty increase per minute
  },

  // Audio Settings
  audio: {
    enabled: true,
    masterVolume: 0.8,          // 0-1 scale
    effects: {
      gunshot: 0.6,
      explosion: 0.7,
      powerup: 0.5,
      hit: 0.4,
    },
    music: {
      enabled: true,
      volume: 0.5,
      fadeTime: 1000,            // Milliseconds
    },
  },

  // UI Settings
  ui: {
    hud: {
      enabled: true,
      position: 'top-left',
    },
    minimap: {
      enabled: true,
      width: 150,
      height: 150,
    },
    healthBar: {
      enabled: true,
      height: 8,
      color: '#ff0055',
      backgroundColor: '#1a1a2e',
    },
  },

  // Performance Settings
  performance: {
    maxParticles: 500,
    particleLifetime: 1000,
    renderScale: 1.0,           // For canvas scaling
    enableShaders: true,
    vsyncEnabled: true,
  },

  // Debug Settings
  debug: {
    enabled: false,
    showCollisionBounds: false,
    showNetworkInfo: false,
    logFrameRate: false,
    slowMotion: 1.0,            // 0-1 scale, 1.0 = normal speed
  },
};

// Export for use in Node.js or module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
