const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['AU-A1ZB2WDM'],
    model: 'AU-A1ZB2WDM',
    vendor: 'Aurora Lighting',
    description: 'AOne Dimmer Custom Endpoint 1', // Changed desc so you can verify load
    fromZigbee: [fz.on_off, fz.brightness, fz.lighting_ballast_configuration],
    toZigbee: [tz.on_off, tz.light_onoff_brightness, tz.light_brightness_move, tz.light_brightness_step, tz.lighting_ballast_configuration],
    exposes: [
        e.light_brightness().withEndpoint('l1'),
        e.switch().withEndpoint('l1').withDescription('Direct Relay Control'),
        e.binary('backlight_led', ea.ALL, 'ON', 'OFF').withDescription('Enable or disable the blue backlight LED'),
        e.power_on_behavior(),
    ],
    endpoint: (device) => {
        return {'l1': 1, 'l2': 2, 'default': 1};
    },
    meta: {multiEndpoint: true},
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        await reporting.onOff(endpoint);
    },
};

module.exports = definition;