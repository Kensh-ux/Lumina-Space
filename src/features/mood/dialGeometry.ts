export const DIAL_ANGLES = [0, 45, 90] as const;
export const DIAL_RADIUS = 78;

export interface DialPosition {
  left: number;
  top: number;
}

// 以圆盘中心为原点：0° 向右、45° 向右下、90° 向下。
export function getDialPosition(index: number): DialPosition {
  const radians = (DIAL_ANGLES[index] * Math.PI) / 180;
  return {
    left: Math.cos(radians) * DIAL_RADIUS,
    top: Math.sin(radians) * DIAL_RADIUS,
  };
}
