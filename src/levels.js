export const LEVELS = [
  {
    id: 1,
    name: "Emerald Meadow",
    requirements: {
      apples: 0,
      coins: 0,
      rank: 0,
      snakeId: "normal-garden-snake"
    },
    goal: 50,
    speedMs: 150,
    theme: "Classic open field",
    description: "A calm arena to learn the rhythm. No obstacles, just pure snake.",
    palette: {
      bgA: "#12231f",
      bgB: "#091210",
      accent: "#8cffb7",
      glow: "rgba(140, 255, 183, 0.45)"
    },
    hazardType: "stone",
    obstacleMode: { type: "none" }
  },
  {
    id: 2,
    name: "Amber Ruins",
    requirements: {
      apples: 25,
      coins: 25,
      rank: 50,
      snakeId: "king-cobra"
    },
    goal: 75,
    speedMs: 140,
    theme: "Random stone traps",
    description: "Collect 25 apples overall to unlock. Broken pillars appear in different places every run.",
    palette: {
      bgA: "#2a170f",
      bgB: "#100a08",
      accent: "#ffb36a",
      glow: "rgba(255, 179, 106, 0.42)"
    },
    hazardType: "stone",
    obstacleMode: { type: "random", count: 18, spacing: 2 }
  },
  {
    id: 3,
    name: "Cobalt Canyon",
    requirements: {
      apples: 50,
      coins: 50,
      rank: 100,
      snakeId: "green-anaconda"
    },
    goal: 100,
    speedMs: 132,
    theme: "Split-lane pressure",
    description: "Thin rock lanes cut the map into risky channels.",
    palette: {
      bgA: "#112237",
      bgB: "#09111d",
      accent: "#7fd1ff",
      glow: "rgba(127, 209, 255, 0.42)"
    },
    hazardType: "stone",
    obstacleMode: { type: "lanes" }
  },
  {
    id: 4,
    name: "Ruby Nest",
    requirements: {
      apples: 75,
      coins: 75,
      rank: 150,
      snakeId: "burmese-python"
    },
    goal: 125,
    speedMs: 124,
    theme: "Tight corner traps",
    description: "The borders squeeze inward with dangerous rocky nests.",
    palette: {
      bgA: "#38141a",
      bgB: "#14070b",
      accent: "#ff7f92",
      glow: "rgba(255, 127, 146, 0.45)"
    },
    hazardType: "stone",
    obstacleMode: { type: "corners" }
  },
  {
    id: 5,
    name: "Ivory Spiral",
    requirements: {
      apples: 100,
      coins: 100,
      rank: 200,
      snakeId: "black-mamba"
    },
    goal: 150,
    speedMs: 118,
    theme: "Spiral labyrinth",
    description: "A coiled maze that rewards patience and smooth turning.",
    palette: {
      bgA: "#312a1e",
      bgB: "#110f0b",
      accent: "#ffe7a0",
      glow: "rgba(255, 231, 160, 0.4)"
    },
    hazardType: "stone",
    obstacleMode: { type: "spiral" }
  },
  {
    id: 6,
    name: "Violet Marsh",
    requirements: {
      apples: 125,
      coins: 125,
      rank: 250,
      snakeId: "coral-snake"
    },
    goal: 175,
    speedMs: 112,
    theme: "Broken islands",
    description: "Staggered bog islands make every recovery turn harder.",
    palette: {
      bgA: "#251636",
      bgB: "#0d0815",
      accent: "#c39bff",
      glow: "rgba(195, 155, 255, 0.4)"
    },
    hazardType: "stone",
    obstacleMode: { type: "islands" }
  },
  {
    id: 7,
    name: "Solar Forge",
    requirements: {
      apples: 150,
      coins: 150,
      rank: 300,
      snakeId: "boa-constrictor"
    },
    goal: 200,
    speedMs: 106,
    theme: "Crossfire core",
    description: "A blazing central forge splits the arena into hot escape routes.",
    palette: {
      bgA: "#341c0c",
      bgB: "#140904",
      accent: "#ffcf68",
      glow: "rgba(255, 207, 104, 0.42)"
    },
    hazardType: "stone",
    obstacleMode: { type: "cross" }
  },
  {
    id: 8,
    name: "Glacier Pulse",
    requirements: {
      apples: 175,
      coins: 175,
      rank: 350,
      snakeId: "rattlesnake"
    },
    goal: 225,
    speedMs: 100,
    theme: "Frozen checkpoints",
    description: "Cold crystal walls force fast pivots and clean planning.",
    palette: {
      bgA: "#102a32",
      bgB: "#071117",
      accent: "#95f2ff",
      glow: "rgba(149, 242, 255, 0.42)"
    },
    hazardType: "stone",
    obstacleMode: { type: "gates" }
  },
  {
    id: 9,
    name: "Obsidian Crown",
    requirements: {
      apples: 200,
      coins: 200,
      rank: 400,
      snakeId: "green-tree-python"
    },
    goal: 250,
    speedMs: 94,
    theme: "Royal gauntlet",
    description: "The crown chambers create sharp reversals and narrow survival lines.",
    palette: {
      bgA: "#21171f",
      bgB: "#09070b",
      accent: "#ffa3de",
      glow: "rgba(255, 163, 222, 0.42)"
    },
    hazardType: "stone",
    obstacleMode: { type: "crown" }
  },
  {
    id: 10,
    name: "Dragon Eclipse",
    requirements: {
      apples: 225,
      coins: 225,
      rank: 450,
      snakeId: "sea-krait"
    },
    goal: 275,
    speedMs: 88,
    theme: "Ultimate maze",
    description: "A brutal final arena with layered chambers worthy of a serpent king.",
    palette: {
      bgA: "#1f170d",
      bgB: "#080603",
      accent: "#ff8d4e",
      glow: "rgba(255, 141, 78, 0.45)"
    },
    hazardType: "stone",
    obstacleMode: { type: "labyrinth" }
  },
  {
    id: 11,
    name: "Inferno Orbits",
    requirements: {
      apples: 250,
      coins: 250,
      rank: 500,
      snakeId: "bushmaster"
    },
    goal: 300,
    speedMs: 84,
    theme: "Fireball ring",
    description: "Burning fireballs guard a circular route and punish lazy turning.",
    palette: {
      bgA: "#311109",
      bgB: "#0f0402",
      accent: "#ff9257",
      glow: "rgba(255, 146, 87, 0.46)"
    },
    hazardType: "fireball",
    obstacleMode: { type: "orbit" }
  },
  {
    id: 12,
    name: "Frostbite Drift",
    requirements: {
      apples: 275,
      coins: 275,
      rank: 550,
      snakeId: "gaboon-viper"
    },
    goal: 325,
    speedMs: 82,
    theme: "Snowball funnels",
    description: "Rolling-looking snowball traps tighten the board into cold channels.",
    palette: {
      bgA: "#123348",
      bgB: "#07131a",
      accent: "#b5f2ff",
      glow: "rgba(181, 242, 255, 0.46)"
    },
    hazardType: "snowball",
    obstacleMode: { type: "funnel" }
  },
  {
    id: 13,
    name: "Thunder Coil",
    requirements: {
      apples: 300,
      coins: 300,
      rank: 600,
      snakeId: "normal-garden-snake"
    },
    goal: 350,
    speedMs: 80,
    theme: "Lightning lanes",
    description: "Charged nodes cut the arena with electric columns and sharp escape gaps.",
    palette: {
      bgA: "#161437",
      bgB: "#07060f",
      accent: "#c7a2ff",
      glow: "rgba(199, 162, 255, 0.48)"
    },
    hazardType: "lightning",
    obstacleMode: { type: "columns" }
  },
  {
    id: 14,
    name: "Toxic Bloom",
    requirements: {
      apples: 325,
      coins: 325,
      rank: 650,
      snakeId: "king-cobra"
    },
    goal: 375,
    speedMs: 78,
    theme: "Poison flower field",
    description: "Green toxic spores form deadly islands that bait risky apple paths.",
    palette: {
      bgA: "#102815",
      bgB: "#071108",
      accent: "#96ff7a",
      glow: "rgba(150, 255, 122, 0.42)"
    },
    hazardType: "poison",
    obstacleMode: { type: "flowers" }
  },
  {
    id: 15,
    name: "Crystal Teeth",
    requirements: {
      apples: 350,
      coins: 350,
      rank: 700,
      snakeId: "green-anaconda"
    },
    goal: 400,
    speedMs: 76,
    theme: "Shattered jaw",
    description: "Rows of crystal fangs leave only narrow bites of safe space.",
    palette: {
      bgA: "#14293a",
      bgB: "#060b12",
      accent: "#7ce5ff",
      glow: "rgba(124, 229, 255, 0.44)"
    },
    hazardType: "crystal",
    obstacleMode: { type: "teeth" }
  },
  {
    id: 16,
    name: "Meteor Basin",
    requirements: {
      apples: 375,
      coins: 375,
      rank: 750,
      snakeId: "burmese-python"
    },
    goal: 425,
    speedMs: 74,
    theme: "Crater clusters",
    description: "Meteor pits break the arena into crater pockets with tiny recovery windows.",
    palette: {
      bgA: "#251711",
      bgB: "#090504",
      accent: "#ffb782",
      glow: "rgba(255, 183, 130, 0.4)"
    },
    hazardType: "meteor",
    obstacleMode: { type: "craters" }
  },
  {
    id: 17,
    name: "Blizzard Spine",
    requirements: {
      apples: 400,
      coins: 400,
      rank: 800,
      snakeId: "black-mamba"
    },
    goal: 450,
    speedMs: 72,
    theme: "Snow wall spine",
    description: "Frozen spikes slice the map into a hard central blizzard route.",
    palette: {
      bgA: "#163541",
      bgB: "#071218",
      accent: "#dcfbff",
      glow: "rgba(220, 251, 255, 0.44)"
    },
    hazardType: "snowball",
    obstacleMode: { type: "spine" }
  },
  {
    id: 18,
    name: "Lava Crown",
    requirements: {
      apples: 425,
      coins: 425,
      rank: 850,
      snakeId: "coral-snake"
    },
    goal: 475,
    speedMs: 70,
    theme: "Crowned magma chambers",
    description: "Molten fireball nests ring the board and force royal precision.",
    palette: {
      bgA: "#3a1208",
      bgB: "#110402",
      accent: "#ff6f41",
      glow: "rgba(255, 111, 65, 0.5)"
    },
    hazardType: "fireball",
    obstacleMode: { type: "crownmaze" }
  },
  {
    id: 19,
    name: "Aurora Circuit",
    requirements: {
      apples: 450,
      coins: 450,
      rank: 900,
      snakeId: "boa-constrictor"
    },
    goal: 500,
    speedMs: 68,
    theme: "Energy gates",
    description: "Electric prisms create glowing routes that reward fast reading of space.",
    palette: {
      bgA: "#0c2636",
      bgB: "#040d12",
      accent: "#87ffd7",
      glow: "rgba(135, 255, 215, 0.44)"
    },
    hazardType: "plasma",
    obstacleMode: { type: "vault" }
  },
  {
    id: 20,
    name: "Venom Delta",
    requirements: {
      apples: 475,
      coins: 475,
      rank: 950,
      snakeId: "rattlesnake"
    },
    goal: 525,
    speedMs: 66,
    theme: "Poison river split",
    description: "Venom pools divide the map into delta branches with very little room to breathe.",
    palette: {
      bgA: "#18321b",
      bgB: "#060e07",
      accent: "#b6ff57",
      glow: "rgba(182, 255, 87, 0.45)"
    },
    hazardType: "poison",
    obstacleMode: { type: "rivers" }
  },
  {
    id: 21,
    name: "Storm Citadel",
    requirements: {
      apples: 500,
      coins: 500,
      rank: 1000,
      snakeId: "green-tree-python"
    },
    goal: 550,
    speedMs: 64,
    theme: "Thunder fortress",
    description: "A charged fortress of lightning towers forces tiny, exact rotations.",
    palette: {
      bgA: "#1b1c42",
      bgB: "#05060d",
      accent: "#9ca7ff",
      glow: "rgba(156, 167, 255, 0.46)"
    },
    hazardType: "lightning",
    obstacleMode: { type: "fortress" }
  },
  {
    id: 22,
    name: "Comet Corridor",
    requirements: {
      apples: 525,
      coins: 525,
      rank: 1050,
      snakeId: "sea-krait"
    },
    goal: 575,
    speedMs: 62,
    theme: "Meteor raceway",
    description: "Comet stones line a brutal corridor challenge with almost no wasted moves.",
    palette: {
      bgA: "#20160f",
      bgB: "#070503",
      accent: "#ffd38f",
      glow: "rgba(255, 211, 143, 0.4)"
    },
    hazardType: "meteor",
    obstacleMode: { type: "corridors" }
  },
  {
    id: 23,
    name: "Glacial Halo",
    requirements: {
      apples: 550,
      coins: 550,
      rank: 1100,
      snakeId: "bushmaster"
    },
    goal: 600,
    speedMs: 60,
    theme: "Frozen orbit ring",
    description: "Snowball halos build a cold rotating feeling around the safe center.",
    palette: {
      bgA: "#143547",
      bgB: "#050d11",
      accent: "#c4fcff",
      glow: "rgba(196, 252, 255, 0.48)"
    },
    hazardType: "snowball",
    obstacleMode: { type: "halo" }
  },
  {
    id: 24,
    name: "Prism Catacomb",
    requirements: {
      apples: 575,
      coins: 575,
      rank: 1150,
      snakeId: "gaboon-viper"
    },
    goal: 625,
    speedMs: 58,
    theme: "Crystal dungeon",
    description: "Prism shards and mirror turns create a final maze of sharp decisions.",
    palette: {
      bgA: "#181b37",
      bgB: "#05060d",
      accent: "#ffb6ff",
      glow: "rgba(255, 182, 255, 0.44)"
    },
    hazardType: "crystal",
    obstacleMode: { type: "catacomb" }
  },
  {
    id: 25,
    name: "Apocalypse Core",
    requirements: {
      apples: 600,
      coins: 600,
      rank: 1200,
      snakeId: "king-cobra"
    },
    goal: 650,
    speedMs: 56,
    theme: "All hazard endgame",
    description: "Fire, frost, poison, plasma, and meteor traps fuse into one brutal serpent trial.",
    palette: {
      bgA: "#241313",
      bgB: "#050505",
      accent: "#ffd96b",
      glow: "rgba(255, 217, 107, 0.5)"
    },
    hazardType: "apocalypse",
    obstacleMode: { type: "apocalypse" }
  }
];
