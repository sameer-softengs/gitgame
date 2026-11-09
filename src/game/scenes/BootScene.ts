/**
 * BootScene.ts — generates every texture at runtime with Phaser Graphics (parametric
 * pixel art: no image asset files). Then hands off to DungeonScene.
 */

import Phaser from "phaser";
import { TILE } from "../data/dungeon";

function px(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.makeFloor();
    this.makeWall();
    this.makePlayer();
    this.makeBug();
    this.makeGem();
    this.makeShrine();
    this.makeSpark();
    this.scene.start("DungeonScene");
  }

  private makeFloor(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    px(g, 0, 0, TILE, TILE, 0x182238);
    px(g, 0, 0, TILE, 1, 0x1d2942);
    px(g, 0, 0, 1, TILE, 0x1d2942);
    // speckles
    const rng = [3, 11, 7, 19, 15, 5, 21, 9];
    rng.forEach((v, i) => px(g, (v * 7 + i * 5) % (TILE - 2) + 1, (v * 11 + i * 3) % (TILE - 2) + 1, 1, 1, 0x131b2e));
    g.generateTexture("floor", TILE, TILE);
    g.destroy();
  }

  private makeWall(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    px(g, 0, 0, TILE, TILE, 0x0d1322);
    px(g, 0, 0, TILE, 5, 0x2a3a5c);          // lit cap
    px(g, 0, 5, TILE, 2, 0x1a2438);
    px(g, 0, TILE - 2, TILE, 2, 0x080c16);  // dark base
    // brick seams
    px(g, 8, 7, 1, TILE - 9, 0x111a2c);
    px(g, 17, 7, 1, TILE - 9, 0x111a2c);
    px(g, 0, 13, TILE, 1, 0x111a2c);
    g.generateTexture("wall", TILE, TILE);
    g.destroy();
  }

  private makePlayer(): void {
    // frame A / frame B — little hooded hunter, bobbing legs
    const frames: Array<[number, number]> = [[0, 0], [1, -1]];
    frames.forEach(([legShift, _], i) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      // cloak
      px(g, 4, 8, 8, 9, 0x8df0c1);
      px(g, 3, 10, 10, 7, 0x8df0c1);
      px(g, 4, 15, 8, 2, 0x6fd6a6);
      // hood
      px(g, 5, 3, 6, 6, 0x6fd6a6);
      px(g, 4, 4, 8, 4, 0x6fd6a6);
      // face shadow + eyes
      px(g, 5, 6, 6, 3, 0x0d1322);
      px(g, 6, 7, 1, 1, 0xc7fff0);
      px(g, 9, 7, 1, 1, 0xc7fff0);
      // legs
      px(g, 5 + legShift, 17, 2, 3, 0x3f5a4c);
      px(g, 9 - legShift, 17, 2, 3, 0x3f5a4c);
      g.generateTexture(`player${i}`, 16, 20);
      g.destroy();
    });
  }

  private makeBug(): void {
    for (let i = 0; i < 2; i++) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const leg = i === 0 ? 0 : 1;
      // legs
      px(g, 1, 5 + leg, 3, 1, 0xb3324a);
      px(g, 10, 5 + leg, 3, 1, 0xb3324a);
      px(g, 1, 9 - leg, 3, 1, 0xb3324a);
      px(g, 10, 9 - leg, 3, 1, 0xb3324a);
      // body
      px(g, 3, 2, 8, 9, 0xff5d73);
      px(g, 2, 4, 10, 5, 0xff5d73);
      // shell stripe + head
      px(g, 3, 6, 8, 2, 0xd63a55);
      px(g, 5, 0, 4, 3, 0x8f2438);
      // eyes
      px(g, 4, 1, 1, 1, 0xffd7dd);
      px(g, 9, 1, 1, 1, 0xffd7dd);
      g.generateTexture(`bug${i}`, 14, 12);
      g.destroy();
    }
  }

  private makeGem(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    px(g, 5, 0, 2, 1, 0x9ff3ff);
    px(g, 3, 1, 6, 2, 0x6ee7ff);
    px(g, 2, 3, 8, 4, 0x4ecbe8);
    px(g, 3, 7, 6, 2, 0x3aaecf);
    px(g, 5, 9, 2, 1, 0x2b93b3);
    px(g, 4, 1, 1, 2, 0xe6fbff);
    g.generateTexture("gem", 12, 10);
    g.destroy();
  }

  private makeShrine(): void {
    // pedestal (24x18); the gem floats above via a separate tweened sprite
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    px(g, 4, 2, 16, 3, 0x4a5f8c);   // top plate
    px(g, 4, 2, 16, 1, 0x6b83b8);
    px(g, 6, 5, 12, 9, 0x33436a);  // column
    px(g, 2, 14, 20, 4, 0x27334f); // base
    px(g, 2, 14, 20, 1, 0x3d5079);
    // rune glow slot
    px(g, 10, 0, 4, 2, 0x1b2540);
    g.generateTexture("shrine", 24, 18);
    g.destroy();
  }

  private makeSpark(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    px(g, 1, 1, 2, 2, 0xffffff);
    g.generateTexture("spark", 4, 4);
    g.destroy();
  }
}
