export const LEVELS = [
  {
    id: 1,
    name: "Emerald Meadow",
    unlockApples: 0,
    goal: 12,
    speedMs: 150,
    theme: "Classic open field",
    description: "A calm arena to learn the rhythm. No obstacles, just pure snake.",
    palette: {
      bgA: "#12231f",
      bgB: "#091210",
      accent: "#8cffb7",
      glow: "rgba(140, 255, 183, 0.45)"
    },
    obstacleMode: { type: "none" }
  },
  {
    id: 2,
    name: "Amber Ruins",
    unlockApples: 25,
    goal: 16,
    speedMs: 140,
    theme: "Random stone traps",
    description: "Collect 25 apples overall to unlock. Broken pillars appear in different places every run.",
    palette: {
      bgA: "#2a170f",
      bgB: "#100a08",
      accent: "#ffb36a",
      glow: "rgba(255, 179, 106, 0.42)"
    },
    obstacleMode: { type: "random", count: 18, spacing: 2 }
  },
  {
    id: 3,
    name: "Cobalt Canyon",
    unlockApples: 50,
    goal: 18,
    speedMs: 132,
    theme: "Split-lane pressure",
    description: "Thin rock lanes cut the map into risky channels.",
    palette: {
      bgA: "#112237",
      bgB: "#09111d",
      accent: "#7fd1ff",
      glow: "rgba(127, 209, 255, 0.42)"
    },
    obstacleMode: { type: "lanes" }
  },
  {
    id: 4,
    name: "Ruby Nest",
    unlockApples: 80,
    goal: 20,
    speedMs: 124,
    theme: "Tight corner traps",
    description: "The borders squeeze inward with dangerous rocky nests.",
    palette: {
      bgA: "#38141a",
      bgB: "#14070b",
      accent: "#ff7f92",
      glow: "rgba(255, 127, 146, 0.45)"
    },
    obstacleMode: { type: "corners" }
  },
  {
    id: 5,
    name: "Ivory Spiral",
    unlockApples: 115,
    goal: 22,
    speedMs: 118,
    theme: "Spiral labyrinth",
    description: "A coiled maze that rewards patience and smooth turning.",
    palette: {
      bgA: "#312a1e",
      bgB: "#110f0b",
      accent: "#ffe7a0",
      glow: "rgba(255, 231, 160, 0.4)"
    },
    obstacleMode: { type: "spiral" }
  },
  {
    id: 6,
    name: "Violet Marsh",
    unlockApples: 150,
    goal: 24,
    speedMs: 112,
    theme: "Broken islands",
    description: "Staggered bog islands make every recovery turn harder.",
    palette: {
      bgA: "#251636",
      bgB: "#0d0815",
      accent: "#c39bff",
      glow: "rgba(195, 155, 255, 0.4)"
    },
    obstacleMode: { type: "islands" }
  },
  {
    id: 7,
    name: "Solar Forge",
    unlockApples: 190,
    goal: 26,
    speedMs: 106,
    theme: "Crossfire core",
    description: "A blazing central forge splits the arena into hot escape routes.",
    palette: {
      bgA: "#341c0c",
      bgB: "#140904",
      accent: "#ffcf68",
      glow: "rgba(255, 207, 104, 0.42)"
    },
    obstacleMode: { type: "cross" }
  },
  {
    id: 8,
    name: "Glacier Pulse",
    unlockApples: 235,
    goal: 28,
    speedMs: 100,
    theme: "Frozen checkpoints",
    description: "Cold crystal walls force fast pivots and clean planning.",
    palette: {
      bgA: "#102a32",
      bgB: "#071117",
      accent: "#95f2ff",
      glow: "rgba(149, 242, 255, 0.42)"
    },
    obstacleMode: { type: "gates" }
  },
  {
    id: 9,
    name: "Obsidian Crown",
    unlockApples: 285,
    goal: 30,
    speedMs: 94,
    theme: "Royal gauntlet",
    description: "The crown chambers create sharp reversals and narrow survival lines.",
    palette: {
      bgA: "#21171f",
      bgB: "#09070b",
      accent: "#ffa3de",
      glow: "rgba(255, 163, 222, 0.42)"
    },
    obstacleMode: { type: "crown" }
  },
  {
    id: 10,
    name: "Dragon Eclipse",
    unlockApples: 340,
    goal: 34,
    speedMs: 88,
    theme: "Ultimate maze",
    description: "A brutal final arena with layered chambers worthy of a serpent king.",
    palette: {
      bgA: "#1f170d",
      bgB: "#080603",
      accent: "#ff8d4e",
      glow: "rgba(255, 141, 78, 0.45)"
    },
    obstacleMode: { type: "labyrinth" }
  }
];
