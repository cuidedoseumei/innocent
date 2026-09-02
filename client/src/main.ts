import Phaser from "phaser";
import { WorldScene } from "./game/scenes/world-scene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 480,
  height: 360,
  zoom: 2,
  backgroundColor: "#111111",
  pixelArt: true,
  roundPixels: true,
  scene: [WorldScene],
});
