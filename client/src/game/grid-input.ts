import type { Direction } from "@innocent/shared";
import Phaser from "phaser";

// Keyboard → movement directions with the classic Tibia feel:
// - holding a key walks continuously, one tile step at a time
// - a key tapped mid-step is buffered (one slot) and fires after the step
// - when several keys are held, the most recently pressed wins
export class GridInput {
  private readonly keysByDirection: Record<
    Direction,
    Phaser.Input.Keyboard.Key[]
  >;
  private bufferedTap: Direction | null = null;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is not available");
    const codes = Phaser.Input.Keyboard.KeyCodes;
    this.keysByDirection = {
      up: [keyboard.addKey(codes.UP), keyboard.addKey(codes.W)],
      down: [keyboard.addKey(codes.DOWN), keyboard.addKey(codes.S)],
      left: [keyboard.addKey(codes.LEFT), keyboard.addKey(codes.A)],
      right: [keyboard.addKey(codes.RIGHT), keyboard.addKey(codes.D)],
    };
  }

  // Call once per frame (even while a step is in progress) to catch taps.
  update(): void {
    for (const dir of Object.keys(this.keysByDirection) as Direction[]) {
      for (const key of this.keysByDirection[dir]) {
        if (Phaser.Input.Keyboard.JustDown(key)) {
          this.bufferedTap = dir;
        }
      }
    }
  }

  // Next direction to walk, or null. Consumes the buffered tap if present,
  // otherwise falls back to whichever direction key is currently held.
  consumeNext(): Direction | null {
    if (this.bufferedTap) {
      const dir = this.bufferedTap;
      this.bufferedTap = null;
      return dir;
    }
    return this.heldDirection();
  }

  private heldDirection(): Direction | null {
    let best: Direction | null = null;
    let bestTime = -1;
    for (const dir of Object.keys(this.keysByDirection) as Direction[]) {
      for (const key of this.keysByDirection[dir]) {
        if (key.isDown && key.timeDown > bestTime) {
          best = dir;
          bestTime = key.timeDown;
        }
      }
    }
    return best;
  }
}
