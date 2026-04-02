import "./styles.css";

import { GameApp } from "./game/GameApp";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root not found.");
}

new GameApp(root);

