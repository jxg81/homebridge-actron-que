# homebridge-actron-que
Homebridge plugin for Actron Que Controller

## Current Status
This is the first working version. I will update readme with further details, but here is the summary of whats working:

- Automatic registration of new client device with Que cloud service for autorisation
- Get and continously refresh current state of aircon unit into homekit to ensure current state is accurate (in case someone changes from the wall control). This currently happens every 60 seconds, i will look at making this a config option.
- Set climate mode options - Auto, Heat, Cool.  Dont currently support setting Fan Only mode as this does nto appear to be an opting in homebridge, will look into this further.
- Set the fan mode to Low, Medium or High. Max stting on the slide should be setting to Auto, but thats not working for some reason.  Cannot set continous running options for those modes yet - not sure if this will be possible.
- Control and report indoor temperature in all climate modes
- Option in config to have zones automatically follow master controller setting, or have master controller setting operate independent of zones.
- Zone discovery and control is working at an API level, but not yet implemented in homekit
- Currently im storing auth tokens and client ID data in the hombridge storage path to allow them to persist between reboots. :/

## In Progress

1. Expose each zone as a seperate accessory with independent control
2. Fix the couple of issues mentioned above
3. Look at a better appraoch for token and client ID data storage options

## Configuration
Add the following to your homebridge configuration

```json
    "platforms": [
        {
            "name": "ActronQue",
            "platform": "ActronQue",
            "username": "<your_username>",
            "password": "<your_password>",
            "clientName": "<see_note_1_below>",
            "zonesFollowMaster": <see_note_2_below>
        }]
```
### Note 1: `clinetName`
This is a string value, i think you could set whatever you want, but i havent tried all special characters.
The value you set for client name will be used in two places:
1. It will set this as the default client name when pairing the accessory in homekit.
2. It will appear as the client name in the 'Authorised Devices' list on the Que cloud service.

### Note 2: `zonesFollowMaster`
This is a boolean value: `true || false`

Setting this to true will make it so that any changes to the master controller temprature setting in homekit will ALWAYS be propogated to all zones. This will make more sense once the zone accessoriers are exposed.