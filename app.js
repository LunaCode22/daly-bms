const express = require('express');
const Daly2Bt = require('./domain/Daly2Bt');

const app = express();
const PORT = 3000;

const bms = new Daly2Bt();

app.get('/bms', async (req, res) => {
    try {
        const data = await bms.getData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: `Failed to fetch BMS data: ${error.message}` });
    }
});

app.get('/status', async (req, res) => {
    const status = bms.peripheral && bms.peripheral.state === 'connected';
    res.json({ status: status ? 'Connected' : 'Disconnected' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
