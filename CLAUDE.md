# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Home Assistant configuration for a solar-energy-focused smart home. The primary focus is managing a solar PV system with battery storage, EV charging, and tariff optimization. The `custom_components/daikin_onecta/` directory is actively developed (locally modified); all other custom components are third-party HACS installs.

## Key Commands

```bash
# Validate HA configuration before applying changes
ha core check

# Restart Home Assistant
ha core restart

# View recent logs
ha core logs 2>&1 | tail -100

# Filter logs for a specific integration
ha core logs 2>&1 | grep -i daikin_onecta

# Check HA version
ha core info
```

## Configuration Structure

| File | Purpose |
|------|---------|
| `configuration.yaml` | Main config — includes automations/scripts/scenes, defines template sensors and binary sensors |
| `automations.yaml` | All 11 automations (Solcast polling, battery status LED, Octopus Intelligent, occupancy, etc.) |
| `scripts.yaml` | One script: `export_entity_list` |
| `scenes.yaml` | Scene definitions |
| `secrets.yaml` | API keys and credentials — gitignored |
| `SolisAC_data.json`, `SolaX_data.json`, `solis_1_data.json` | Persistent state for solax_modbus inverter registers (timed charge/discharge schedules) — written by the integration at runtime |

## Energy System Architecture

The installation has:
- **Solis AC inverter** — controlled via `solax_modbus` custom component (Modbus TCP, local polling). Entity prefix: `sensor.solisac_*`
- **Seplos BMS** (16-cell LiFePO4 battery) — monitored via `bms_ble` (Bluetooth LE). Entity: `sensor.sp18b2311040070_*`; template sensors expose individual cell voltages as `sensor.seplos_cell_N_voltage`
- **myenergi Zappi** EV charger — cloud polling. Entity prefix: `sensor.myenergi_bath_zappi_*`
- **Octopus Energy** tariff + **Octopus Intelligent** — cloud polling for tariff/slot data
- **Solcast** — solar forecast, polled 5× daily via automation
- **Daikin Onecta** — Daikin HVAC cloud API (OAuth2), rate-limited

### Key Template Sensors (in `configuration.yaml`)

- `sensor.total_grid_load` — grid import/export in W (from Zappi grid power)
- `sensor.battery_charge_phase` — bulk / absorption / top_balance / complete (derived from battery voltage)
- `sensor.seplos_cell_0_voltage` … `sensor.seplos_cell_15_voltage` — individual BMS cell voltages

## Actively Modified: `daikin_onecta`

This integration is locally patched (diverged from upstream). Key files:

- `daikin_api.py` — OAuth2 bearer token management, serialized HTTP requests via `_cloud_lock` asyncio lock; skips GET after PATCH (tracks `_last_patch_call`)
- `coordinator.py` — `OnectaDataUpdateCoordinator` extends `DataUpdateCoordinator`; skips poll if within `scan_ignore` seconds of last PATCH
- `device.py` — `DaikinOnectaDevice` wraps raw JSON from the Daikin cloud API
- `climate.py`, `water_heater.py`, `sensor.py`, etc. — platform entities

When modifying this component, reload it via **Developer Tools → YAML → Reload All YAML** or restart HA. Debug logging:

```yaml
logger:
  logs:
    custom_components.daikin_onecta: debug
```

## `solax_modbus` Persistence Pattern

The `solax_modbus` integration writes inverter register values to JSON files in `/homeassistant/` (e.g., `SolisAC_data.json`). These files persist timed charge/discharge schedule settings across HA restarts. Do not delete them — they are the source of truth for inverter schedule state and will trigger a warning if missing.

## Automations Summary

| Alias | Trigger |
|-------|---------|
| Solcast - API Poll Schedule | 5 fixed times daily |
| Battery Status Indicator | `sensor.solisac_battery_soc` state change → RGB LED |
| dehumidifier on / off | Binary sensor device triggers |
| Toothbrush Battery Low | Low battery notification |
| NSPanel Hall/NSPanel Configuration | NSPanel panel config pushes |
| House Occupation State | Presence detection → `input_boolean` |
| Turn solis on / Solis off | Inverter on/off control |
| Octopus Energy - Manual Intelligent Refresh | Manual tariff slot refresh |
