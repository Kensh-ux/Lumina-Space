export interface SceneRenderer {
  resize: (width: number, height: number) => void;
  draw: (
    ctx: CanvasRenderingContext2D,
    time: number,
    width: number,
    height: number,
    reduced: boolean,
  ) => void;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
