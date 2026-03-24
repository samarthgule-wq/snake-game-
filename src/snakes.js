const SNAKE_THEMES = [
  { name: "Normal Garden Snake", region: "Starter", colors: ["#efffd8", "#95ff8d", "#2b7b2e"], stripe: "#d5ff94", pattern: "smooth", portrait: "garden" },
  { name: "King Cobra", region: "India", colors: ["#ffe0a8", "#9d6d33", "#2f1d0a"], stripe: "#f7cf6a", pattern: "hood", portrait: "cobra" },
  { name: "Green Anaconda", region: "Amazon", colors: ["#d7ffb1", "#557d37", "#1b2a12"], stripe: "#bfe469", pattern: "rosettes", portrait: "anaconda" },
  { name: "Burmese Python", region: "Southeast Asia", colors: ["#f9e0b6", "#8c6548", "#3f2518"], stripe: "#d9b67f", pattern: "patches", portrait: "python" },
  { name: "Black Mamba", region: "Africa", colors: ["#d4d8db", "#4d585f", "#13181c"], stripe: "#8c969e", pattern: "sleek", portrait: "mamba" },
  { name: "Coral Snake", region: "Americas", colors: ["#ffe8a6", "#d62828", "#111111"], stripe: "#ffcd57", pattern: "rings", portrait: "coral" },
  { name: "Boa Constrictor", region: "South America", colors: ["#f0ddc2", "#8c5f3b", "#332014"], stripe: "#cda277", pattern: "saddle", portrait: "boa" },
  { name: "Rattlesnake", region: "North America", colors: ["#f1ddaf", "#84724e", "#342617"], stripe: "#d0ba79", pattern: "diamond", portrait: "rattlesnake" },
  { name: "Green Tree Python", region: "Oceania", colors: ["#d5ffc1", "#4bd86e", "#14682b"], stripe: "#baff8c", pattern: "neon", portrait: "treepython" },
  { name: "Sea Krait", region: "Pacific Ocean", colors: ["#fff8c2", "#2846b8", "#101b44"], stripe: "#f8da6e", pattern: "bands", portrait: "seakrait" },
  { name: "Bushmaster", region: "Rainforest", colors: ["#ffe6b8", "#8b4b2a", "#2d1208"], stripe: "#d99458", pattern: "chevron", portrait: "bushmaster" },
  { name: "Gaboon Viper", region: "Central Africa", colors: ["#f0e0b8", "#8e7a57", "#392c1d"], stripe: "#ceb78a", pattern: "mosaic", portrait: "gaboon" }
];

export const SNAKES = SNAKE_THEMES.map((theme, index) => ({
  id: theme.name.toLowerCase().replaceAll(" ", "-"),
  name: theme.name,
  region: theme.region,
  description:
    index === 0
      ? "The default snake. Ready from the start."
      : `Unlock this world snake with rank ${index * 50}, ${index * 25} apples, and ${index * 25} coins.`,
  colors: theme.colors,
  stripe: theme.stripe,
  pattern: theme.pattern,
  portrait: theme.portrait,
  requirements:
    index === 0
      ? { rank: 0, apples: 0, coins: 0 }
      : { rank: index * 50, apples: index * 25, coins: index * 25 }
}));
