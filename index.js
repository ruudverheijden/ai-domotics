let huejay = require('huejay');
let History = require("./model/history");
let Event = require("./model/event");
let Model = require("./model/model");

let history = new History("test.db");

history.setup(function () {

});

let client = new huejay.Client({
    host:     '10.10.1.102',
    port:     80,               // Optional
    username: 'RY1FS36azP6GMydfeBq9C1DkGmUx-TIgWrhQ1us4', // Optional
    timeout:  15000            // Optional, timeout in milliseconds (15000 is the default)
});

let hardware = {
    lights: [],
    switches: [],
    lightSensors: [],
    temperatureSensors: []
};

client.lights.getAll()
    .then(lights => {
        for (let light of lights) {
            hardware.lights.push(light.id);
        }
    })
    .catch(error => {
        console.log(error.stack);
    });

client.sensors.getAll()
    .then(sensors => {
        for (let sensor of sensors) {
            // Get all light sensors
            if (sensor.state.attributes && sensor.state.attributes.attributes.lightlevel) {
                hardware.lightSensors.push({
                    id: sensor.id,
                    lastUpdated: sensor.state.attributes.attributes.lastupdated
                });
            // Get all temperature sensors
            } else if (sensor.state.attributes && sensor.state.attributes.attributes.temperature) {
                hardware.temperatureSensors.push({
                    id: sensor.id,
                    lastUpdated: sensor.state.attributes.attributes.lastupdated
                });
            // Get all switches
            } else if (sensor.state.attributes && sensor.state.attributes.attributes.buttonevent) {
                hardware.switches.push({
                    id: sensor.id,
                    lastUpdated: sensor.state.attributes.attributes.lastupdated
                });
            }
        }
    })
    .catch(error => {
        console.log(error.stack);
    });

// Poll the switch
setInterval(function () {
    for (let _switch of hardware.switches) {
        client.sensors.getById(_switch.id)
            .then(sensor => {

                // Check if the switch was pressed since last time
                if (new Date(_switch.lastUpdated) < new Date(sensor.state.attributes.attributes.lastupdated)) {

                    // Switch ON-button pressed
                    switch (sensor.state.attributes.attributes.buttonevent) {
                        case 1000 :
                        case 1001 :
                        case 1002 :
                        case 1003 :
                            if (_switch.lastState !== 'ON') {
                                _switch.lastUpdated = sensor.state.attributes.attributes.lastupdated;
                                _switch.lastState = 'ON';

                                console.log('Pressed ON: ' + sensor.name + ' at ' + sensor.state.attributes.attributes.lastupdated);
                                saveSwitchState(1);
                            }
                            break;

                        case 4000 :
                        case 4001 :
                        case 4002 :
                        case 4003 :
                            if (_switch.lastState !== 'OFF') {
                                _switch.lastUpdated = sensor.state.attributes.attributes.lastupdated;
                                _switch.lastState = 'OFF';

                                console.log('Pressed OFF: ' + sensor.name + ' at ' + sensor.state.attributes.attributes.lastupdated);
                                saveSwitchState(-1);
                            }
                            break;
                    }
                }
            });
    }
}, 1000);


function saveSwitchState (state) {
    const now = new Date();

    // Get current light level
    client.sensors.getById(hardware.lightSensors[0].id)
        .then(sensor => {

            // Save event to train model
            history.save(new Event('switch', state, {
                hour: now.getHours(),
                weekend: (now.getDay() === 0 || now.getDay() === 1),
                lightLevel: sensor.state.attributes.attributes.lightlevel
            }));

        });

    console.log('Event saved');
}