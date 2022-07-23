# homebridge-actron-que
Homebridge plugin for Actron Que Controller

## Current Status
Now at version 1.0.0
 - Control Master Controller and all Zones
 - Get temp and humidity data from all zones
 - Get temp data from outdoor unit
 - Report battery level on zone sensors
 - Support for homebridge config UI

 More complete readme coming soon


## Configuration
Add the following to your homebridge configuration

```
    "platforms": [
        {
            "name": "ActronQue",
            "platform": "ActronQue",
            "username": "<your_username>",
            "password": "<your_password>",
            "clientName": "<see_note_1_below>",
            "zonesFollowMaster": <see_note_2_below>,
            "refreshInterval": <seconds>,
            "deviceSerial": "Only Require for Multi-Unit Que Account"
        }]
```
### Note 1: `clientName`
This is a string value, i think you could set whatever you want, but i havent tried all special characters.
The value you set for client name will be used in two places:
1. It will set this as the default client name when pairing the accessory in homekit.
2. It will appear as the client name in the 'Authorised Devices' list on the Que cloud service.

### Note 2: `zonesFollowMaster`
This is a boolean value: `true || false`

Setting this to true will make it so that any changes to the master controller temprature setting in homekit will ALWAYS be propogated to all zones. This will make more sense once the zone accessoriers are exposed.