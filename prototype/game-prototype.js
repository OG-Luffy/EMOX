// Lightweight prototype data for the Android open-world game.
export const GAME_CONFIG = {
  title: 'EMOX: Open World', platform: 'Android', camera: 'third-person',
  targetFps: { low: 30, high: 60 }, worldStreaming: true,
  physics: { fixedStep: 1 / 60, vehicleTraction: 0.92, suspensionDamping: 0.72, airResistance: 0.18 }
};

export function integrateVehicle(state, input, dt) {
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  const steer = Math.max(-1, Math.min(1, input.steer));
  const speed = Math.max(0, state.velocity.length);
  const traction = Math.max(0.15, 1 - speed / 90) * GAME_CONFIG.physics.vehicleTraction;
  const driveForce = throttle * 14.0 * traction;
  const drag = speed * speed * GAME_CONFIG.physics.airResistance * 0.01;
  state.velocity.length = Math.max(0, speed + (driveForce - drag) * dt);
  state.yaw += steer * (1.6 - Math.min(speed / 120, 1.0)) * dt;
  state.position.x += Math.cos(state.yaw) * state.velocity.length * dt;
  state.position.z += Math.sin(state.yaw) * state.velocity.length * dt;
  return state;
}
