/**
 * Pure 2D steering behaviours (Reynolds / Yuka model), ported to keep the sim
 * deterministic — Yuka itself is 3D and uses Math.random in some helpers, which
 * would break replays and trip the gates ban if run inside src/sim. These are
 * the force-based seek/flee/arrive formulas Yuka uses, in pure x/y math.
 *
 * A behaviour returns a steering FORCE; the caller integrates it into velocity
 * (clamped to maxSpeed). Driven by the fixed sim dt — no wall-clock.
 *
 * Reference: ~/src/reference-codebases/yuka (Seek/Flee/ArriveBehavior).
 */
import type { Vec2 } from "@sim/math/vec2.ts";
import { length, scale, sub } from "@sim/math/vec2.ts";

const limit = (v: Vec2, max: number): Vec2 => {
  const len = length(v);
  return len > max && len > 0 ? scale(v, max / len) : v;
};

const desiredToForce = (desired: Vec2, current: Vec2, maxForce: number): Vec2 =>
  limit(sub(desired, current), maxForce);

/** Steer straight toward `target` at full speed. */
export function seek(pos: Vec2, vel: Vec2, target: Vec2, maxSpeed: number, maxForce: number): Vec2 {
  const toTarget = sub(target, pos);
  const len = length(toTarget);
  const desired = len > 0 ? scale(toTarget, maxSpeed / len) : { x: 0, y: 0 };
  return desiredToForce(desired, vel, maxForce);
}

/** Steer directly away from `target` at full speed. */
export function flee(pos: Vec2, vel: Vec2, target: Vec2, maxSpeed: number, maxForce: number): Vec2 {
  const away = sub(pos, target);
  const len = length(away);
  const desired = len > 0 ? scale(away, maxSpeed / len) : { x: 0, y: 0 };
  return desiredToForce(desired, vel, maxForce);
}

/**
 * Like seek, but slow down within a deceleration radius so the body settles on
 * the target instead of overshooting/orbiting it.
 */
export function arrive(
  pos: Vec2,
  vel: Vec2,
  target: Vec2,
  maxSpeed: number,
  maxForce: number,
  deceleration = 3,
  tolerance = 0.5,
): Vec2 {
  const toTarget = sub(target, pos);
  const distance = length(toTarget);
  if (distance <= tolerance) return desiredToForce({ x: 0, y: 0 }, vel, maxForce);
  const speed = Math.min(distance / deceleration, maxSpeed);
  const desired = scale(toTarget, speed / distance);
  return desiredToForce(desired, vel, maxForce);
}

/** Integrate a steering force into velocity for one step, clamped to maxSpeed. */
export function applySteering(vel: Vec2, force: Vec2, dt: number, maxSpeed: number): Vec2 {
  return limit({ x: vel.x + force.x * dt, y: vel.y + force.y * dt }, maxSpeed);
}
