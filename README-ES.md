# Monitor Bluetooth para Daly BMS

![Daly BMS de 100A probado](daly-bms.png)

Daly BMS de 100A usado en las pruebas y en el despliegue sobre Raspberry Pi 4 descrito en este repositorio.

Si este proyecto te ayuda a monitorear tu Daly BMS, considera apoyar su mantenimiento y futuras mejoras.

<p align="center">
  <a href="https://lunacode22.github.io/luna-labs/">
    <img src="https://img.shields.io/badge/Donar-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="Boton de donacion estilo PayPal">
  </a>
</p>

Servicio en Node.js que se conecta por Bluetooth a un BMS Daly y expone las métricas de la batería en formato JSON mediante una API REST pequeña. Este proyecto fue probado y desplegado en una Raspberry Pi 4, por lo que sirve como base práctica para mantener un monitoreo local continuo e integrarlo con Home Assistant.

## Para Qué Sirve Este Proyecto

Este servicio te ayuda a:

- leer datos de un BMS Daly desde una Raspberry Pi 4 por Bluetooth,
- exponer los valores decodificados por HTTP para dashboards o automatizaciones,
- integrar la batería con Home Assistant usando un endpoint REST simple,
- mantener un monitor liviano corriendo en Docker sobre Linux.

## Cómo Funciona

La aplicación hace tres cosas:

1. Se conecta por Bluetooth a un Daly BMS usando `@abandonware/noble`.
2. Envía el comando de estado de Daly y decodifica la respuesta binaria.
3. Expone los valores decodificados mediante:
   - `GET /bms`
   - `GET /status`

La respuesta de la API es JSON, así que es fácil de consumir desde Home Assistant, scripts, dashboards u otro backend.

## Entorno Probado

Esta configuración fue probada en:

- Raspberry Pi 4
- Host Linux con Bluetooth habilitado
- Docker y Docker Compose

Es posible que funcione en otros sistemas Linux, pero Raspberry Pi 4 es la plataforma validada en este repositorio.

## Requisitos

Antes de desplegarlo, asegúrate de tener:

- Raspberry Pi 4 u otro host Linux con soporte Bluetooth
- Docker instalado
- Docker Compose disponible como `docker compose`
- Acceso al socket D-Bus del host en `/run/dbus`
- La dirección MAC Bluetooth de tu Daly BMS

## Estructura del Proyecto

```text
.
├── app.js
├── domain/
│   └── Daly2Bt.js
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Configuración

El objetivo Bluetooth actual está definido en `domain/Daly2Bt.js`:

```js
const ADDRESS = 'd0:25:11:3b:42:1a';
```

Antes del despliegue, cambia ese valor por la dirección MAC de tu propio Daly BMS.

## Despliegue con Docker Compose

Desde la raíz del repositorio:

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

Comandos útiles para operación:

```bash
docker compose -f docker/docker-compose.yml logs -f
docker compose -f docker/docker-compose.yml down
```

### Por Qué Este Compose Usa `host` Network

El acceso Bluetooth desde contenedores suele funcionar mejor en Raspberry Pi y Linux cuando el contenedor usa:

- `/run/dbus:/run/dbus`
- `network_mode: host`

Esas opciones ya están incluidas en `docker/docker-compose.yml`.

## Endpoints de la API

### `GET /status`

Devuelve el estado actual de la conexión Bluetooth.

Respuesta de ejemplo:

```json
{
  "status": "Connected"
}
```

### `GET /bms`

Solicita datos al Daly BMS y devuelve los valores decodificados en JSON.

Solicitud de ejemplo:

```bash
curl http://localhost:3000/bms
```

Ejemplo de respuesta JSON:

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

## Para Qué Sirven Estos Datos

Con este servicio puedes monitorear:

- voltaje por celda,
- voltaje total del pack,
- corriente de carga o descarga,
- capacidad restante,
- desbalance entre celdas,
- estado de carga y descarga,
- lecturas de temperatura,
- cantidad de ciclos,
- potencia estimada de la batería.

Esto resulta útil para:

- sistemas solares con baterías,
- monitoreo off-grid,
- RV o sistemas móviles de energía,
- paneles locales,
- vistas de energía y batería en Home Assistant.

## Integración con Home Assistant

Una vez que el contenedor esté corriendo, Home Assistant puede leer datos del endpoint `/bms` usando sensores REST.

Configuración de ejemplo:

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

### Notas Para Home Assistant

- Reemplaza `RASPBERRY_PI_IP` por la IP de la Raspberry Pi que ejecuta este servicio.
- Si Home Assistant corre en el mismo host, puedes usar `http://localhost:3000/bms`.
- El backend solo devuelve JSON. Los nombres amigables, unidades y clases de dispositivo se definen en Home Assistant.
- El arreglo `temperatures` puede contener valores `-40` como marcador cuando esos índices no están en uso en tu BMS. Los sensores directos se exponen aparte como `temp_one` y `temp_two`.

## Notas de Mantenimiento

Para usarlo a largo plazo, conviene tener presente lo siguiente:

- confirma la MAC Bluetooth del BMS cuando cambies hardware,
- revisa logs del contenedor después de reinicios o fallos Bluetooth,
- mantén Docker y el sistema operativo de la Raspberry Pi actualizados,
- no cambies `host` network ni el montaje de D-Bus sin volver a validar el acceso Bluetooth.

## Resolución de Problemas

Si el servicio no devuelve datos del BMS:

1. Confirma que Bluetooth está habilitado en la Raspberry Pi 4.
2. Verifica que la MAC del BMS en `domain/Daly2Bt.js` sea correcta.
3. Revisa que el contenedor esté corriendo:

```bash
docker compose -f docker/docker-compose.yml ps
```

4. Inspecciona los logs:

```bash
docker compose -f docker/docker-compose.yml logs -f
```

5. Prueba manualmente los endpoints:

```bash
curl http://localhost:3000/status
curl http://localhost:3000/bms
```

## English Documentation

Si prefieres la guía principal en inglés, revisa `README.md`.
