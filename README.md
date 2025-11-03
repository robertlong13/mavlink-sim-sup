# ArduPilot Simulation Supervisor (mavlink-sim-sup)

## 🚧WARNING: WIP🚧

This does absolutely nothing useful yet. Come back later.

## Purpose

**mavlink-sim-sup** (pronounced "sim soup") is a web-based tool for building and
running simulated failure scenarios for ArduPilot. The project draws inspiration
from NASA's Simulation Supervisors (SimSups), who were responsible for crafting
and executing complex failure simulations to prepare crews and controllers for
missions. The goal is to train pilots and validate autonomous failsafes under
realistic failure conditions.

The design is MAVLink-generic, but early development focuses on ArduPilot
compatibility first. PX4 or other MAVLink-compatible systems might simply work
out-of-the-box, but they aren't the initial target and may require additional
tweaks and testing.

## Current progress

**Done:**

- Vite + TypeScript project scaffold
- WebSocket connection to Mission Planner
- Console UI for debugging/status

**Next:**

- MAVLink parsing and basic state tracking
- Add lightweight UI panels for connection state and message monitor
- Support message subscription or filtering
- Create classes for defining custom failures, and a scenario runner which
  randomly injects them with configurable frequency/conditions
