# Daly BMS Bluetooth Monitor

![Tested Daly 100A BMS](daly-bms.png)

Tested Daly 100A BMS used for the Raspberry Pi 4 deployment described in this repository.

If this project helps you monitor your Daly BMS, consider supporting its maintenance and future improvements.

<p align="center">
  <a href="https://lunacode22.github.io/luna-labs/">
    <img src="https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="Donate with PayPal style button">
  </a>
</p>

Node.js service that connects to a Daly BMS over Bluetooth and exposes battery metrics as JSON through a small REST API. This project was tested and deployed on a Raspberry Pi 4, making it a practical base for continuous local monitoring and Home Assistant integrations.

## What This Project Is For

This service is useful when you want to:

- read Daly BMS data from a Raspberry Pi 4 over Bluetooth,
- expose the decoded values through HTTP for local dashboards or automations,
- integrate battery data into Home Assistant using a simple REST endpoint,
- keep a lightweight monitor running in Docker on a Linux host.

## How It Works

The application does three things:

1. Connects to a Daly BMS over Bluetooth using `@abandonware/noble`.
2. Sends the Daly status command and decodes the binary response.
3. Exposes the decoded values through:
   - `GET /bms`
   - `GET /status`

The API response is JSON, which makes it easy to consume from Home Assistant, scripts, dashboards, or another backend.

## Tested Environment

This setup was tested on:

- Raspberry Pi 4
- Linux-based host with Bluetooth enabled
- Docker and Docker Compose

It may work on other Linux systems, but Raspberry Pi 4 is the known tested target for this repository.

## Requirements

Before deploying, make sure you have:

- Raspberry Pi 4 or another Linux host with Bluetooth support
- Docker installed
- Docker Compose available as `docker compose`
- Access to the host D-Bus socket at `/run/dbus`
- The Bluetooth MAC address of your Daly BMS

## Project Structure

```text
.
├── app.js
├── domain/
│   └── Daly2Bt.js
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Configuration

The current Bluetooth target is hardcoded in `domain/Daly2Bt.js`:

```js
const ADDRESS = 'd0:25:11:3b:42:1a';
```

Before deployment, update that value to match the MAC address of your own Daly BMS.

## Deploy With Docker Compose

From the repository root:

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

Useful follow-up commands:

```bash
docker compose -f docker/docker-compose.yml logs -f
docker compose -f docker/docker-compose.yml down
```

### Why This Compose File Uses Host Networking

Bluetooth access from containers is easier on Raspberry Pi and Linux when the container uses:

- `/run/dbus:/run/dbus`
- `network_mode: host`

Those settings are already included in `docker/docker-compose.yml`.

## API Endpoints

### `GET /status`

Returns the current Bluetooth connection state.

Example response:

```json
{
  "status": "Connected"
}
```

### `GET /bms`

Requests data from the Daly BMS and returns decoded values as JSON.

Example request:

```bash
curl http://localhost:3000/bms
```

Example JSON response:

```json
{
  "voltages": [3.448, 3.5, 3.455, 3.533, 3.493, 3.484, 3.487, 3.479],
  "temperatures": [-40, -40, -40, -40, -40, -40, -40, -40],
  "num_temperature_sensors": 2,
  "temp_one": 26,
  "temp_two": 31,
  "total_voltage_v": 27.8,
  "current_amp": -0.1,
  "remaining_capacity": 84.7,
  "max_cell_voltage": 3.533,
  "minimum_cell_voltage": 3.448,
  "average_cell_voltage": 3.483,
  "voltage_difference": 0.085,
  "soc_ah": 84.7,
  "num_cells": 8,
  "cycles": 272,
  "balancing_state": true,
  "cd_load_status": true,
  "fd_status_discharge": true,
  "power_w": 5
}
```

## What The Data Is Useful For

With this service you can monitor:

- per-cell voltages,
- total pack voltage,
- charge or discharge current,
- remaining capacity,
- cell imbalance,
- charge and discharge status,
- temperature probe readings,
- cycle count,
- estimated battery power.

This is especially useful for:

- solar battery systems,
- off-grid monitoring,
- RV or mobile power systems,
- local dashboards,
- Home Assistant energy and battery views.

## Home Assistant Integration

Once the container is running, Home Assistant can pull data from the `/bms` endpoint with REST sensors.

Example configuration:

```yaml
rest:
  - resource: http://RASPBERRY_PI_IP:3000/bms
    scan_interval: 30
    sensor:
      - name: BMS Daly Total Voltage
        value_template: "{{ value_json.total_voltage_v }}"
        unit_of_measurement: "V"
        device_class: voltage

      - name: BMS Daly Current
        value_template: "{{ value_json.current_amp }}"
        unit_of_measurement: "A"
        device_class: current

      - name: BMS Daly Remaining Capacity
        value_template: "{{ value_json.remaining_capacity }}"
        unit_of_measurement: "Ah"

      - name: BMS Daly Cycle Count
        value_template: "{{ value_json.cycles }}"
        unit_of_measurement: "cycles"
```

### Notes For Home Assistant

- Replace `RASPBERRY_PI_IP` with the IP address of the Raspberry Pi running this service.
- If Home Assistant runs on the same host, you can use `http://localhost:3000/bms`.
- The backend returns JSON data only. Friendly names, units, and device classes are defined in Home Assistant.
- The `temperatures` array may contain `-40` placeholders when those indexed values are not used by your BMS. The direct probe values are exposed separately as `temp_one` and `temp_two`.

## Maintenance Notes

For long-term use, keep these points in mind:

- confirm the BMS Bluetooth MAC address whenever hardware changes,
- review container logs after reboots or Bluetooth failures,
- keep Docker and the Raspberry Pi OS updated,
- avoid changing the host networking and D-Bus mounts unless you test Bluetooth access again.

## Troubleshooting

If the service does not return BMS data:

1. Confirm Bluetooth is enabled on the Raspberry Pi 4.
2. Check that the BMS MAC address in `domain/Daly2Bt.js` is correct.
3. Verify the container is running:

```bash
docker compose -f docker/docker-compose.yml ps
```

4. Inspect logs:

```bash
docker compose -f docker/docker-compose.yml logs -f
```

5. Test the endpoints manually:

```bash
curl http://localhost:3000/status
curl http://localhost:3000/bms
```

## Spanish Documentation

If you prefer the same guide in Spanish, see `README-ES.md`.
