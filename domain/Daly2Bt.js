const noble = require('@abandonware/noble');

const ADDRESS = 'd0:25:11:3b:42:1a'; // Daly BMS Bluetooth address
const UUID_RX = '0000fff100001000800000805f9b34fb';
const UUID_TX = '0000fff200001000800000805f9b34fb';
const COMMAND_STATUS = Buffer.from("D2030000003ED7B9", 'hex'); // Status command in HEX

class Daly2Bt {
    
    constructor() {
        this.peripheral = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        this.buffer = Buffer.alloc(0);
        this.decodedValues = {};

        noble.removeAllListeners(); // Safe cleanup to avoid memory leaks
        noble.on('stateChange', this.handleStateChange.bind(this));
        noble.on('discover', this.handleDiscover.bind(this));
    }
    
    
    handleStateChange(state) {
        if (state !== 'poweredOn') {
            console.error('Bluetooth is not enabled.');
            return;
        }
        console.log('Bluetooth is powered on, starting scan...');
        noble.startScanning();
    }
    
    async handleDiscover(peripheral) {
        if (peripheral.address !== ADDRESS) return;

        console.log(`Device found: ${peripheral.advertisement.localName} | ${peripheral.address}`);
        noble.stopScanning();
        this.peripheral = peripheral;

        try {
            await peripheral.connectAsync();
            console.log('Connection established successfully.');

            const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync([], [UUID_RX, UUID_TX]);
            this.rxCharacteristic = characteristics.find(char => char.uuid === UUID_RX);
            this.txCharacteristic = characteristics.find(char => char.uuid === UUID_TX);

            if (!this.rxCharacteristic || !this.txCharacteristic) {
                console.error('RX/TX characteristics not found.');
                await peripheral.disconnectAsync();
                return;
            }

            this.rxCharacteristic.on('data', this._notificationHandler.bind(this));
            await this.rxCharacteristic.subscribeAsync();

            // Send the first command to start receiving data
            await this.sendCommand(COMMAND_STATUS);

        } catch (error) {
            console.error(`Error connecting to or communicating with the device: ${error.message}`);
        }

        peripheral.once('disconnect', async () => {
            console.warn('Device disconnected. Attempting to reconnect...');
            this.resetState();
            this.connect();
        });
    }

    resetState() {
        this.peripheral = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        this.buffer = Buffer.alloc(0);
        this.decodedValues = {};
    }
    
    async connect() {
        if (this.peripheral && this.peripheral.state === 'connected') {
            console.log('An active connection already exists.');
            return;
        }

        console.log('Starting connection...');
        noble.startScanning();
    }

    async sendCommand(command) {
        if (!this.txCharacteristic) {
            console.error('TX characteristic not found.');
            return;
        }

        this.txCharacteristic.write(command, false, (error) => {
            if (error) {
                console.error('Error sending command:', error);
            } else {
                console.log('Command sent successfully.');
            }
        });
    }
    
    _notificationHandler(data) {
        this.buffer = Buffer.concat([this.buffer, data]);

        if (this.buffer.slice(-1).equals(Buffer.from([0x77])) || this.buffer.length > 50) {
            this.decodedValues = this.decodeResponse(this.buffer);
            this.buffer = Buffer.alloc(0);

            if (this.decodedValues) {
                console.log('Data received:', this.decodedValues.total_voltage_v);
            }
        }
    }
    
    decodeResponse(data) {
        if (data.length < 60 || data.slice(0, 2).toString('hex') !== 'd203') {
            return this.lastData;
        }
	    try {
        	return {
            	voltages: Array.from({ length: 16 }, (_, i) => {
                	const voltage = data.readUInt16BE(3 + i * 2) / 1000;
                	return voltage > 0 ? voltage : null;
            	}).filter(v => v !== null),

            	temperatures: Array.from({ length: 8 }, (_, i) => data[34 + i] - 40),

            	num_temperature_sensors: data.readUInt16BE(103),
            	temp_one: data.readUInt16BE(95) - 40,
            	temp_two: data.readUInt16BE(93) - 40,
            	total_voltage_v: data.readUInt16BE(83) / 10,
            	current_amp: (data.readUInt16BE(85) - 30000) / 10,
            	remaining_capacity: data.readUInt16BE(87) / 10,
            	max_cell_voltage: data.readUInt16BE(89) / 1000,
            	minimum_cell_voltage: data.readUInt16BE(91) / 1000,
            	average_cell_voltage: data.readUInt16BE(113) / 1000,
            	voltage_difference: data.readUInt16BE(115) / 1000,
            	soc_ah: data.readUInt16BE(99) / 10,
            	num_cells: data.readUInt16BE(101),
            	cycles: data.readUInt16BE(105),
            	balancing_state: data.readUInt16BE(107) === 1,
            	cd_load_status: data[110] === 1,
            	fd_status_discharge: data[112] === 1,
            	power_w: data.readUInt16BE(117)
        	};
    	} catch (error) {
        	return { error: `Failed to decode data: ${error.message}` };
    	}
    }

    async getData() {
        await this.connect();
        await this.sendCommand(COMMAND_STATUS);

        return new Promise((resolve, reject) => {
            this.rxCharacteristic.once('data', (data) => {
                const decodedValues = this.decodeResponse(data);
                if (decodedValues) {
                    resolve(decodedValues);
                } else {
                    reject({ error: 'No data received from the BMS.' });
                }
            });

            setTimeout(() => reject({ error: 'Request timed out.' }), 3000);
        });
    }
}

module.exports = Daly2Bt;
