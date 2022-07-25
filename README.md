# homebridge-actron-que
Use this plugin to control your Actron Que system with Apple HomeKit using Homebridge.

## Current Status
---

This is an 'almost' feature complete implementation of the Que platfrom in HomeKit

Now at version 1.0.2
 - Control either a single zone or multizone system
 - Master controller and each zone sensor will be exposed as unique, controllable accessory in HomeKit
 - Get temp and humidity data from all zones and master controller reported in homekit
 - Get temp data from outdoor unit as a seperate accessory
 - Report battery level on zone sensors and get low battery alerts in the home app
 - Support for homebridge config UI

Limitations - These options cannot be set via homekit:
 - Quiet Mode
 - Fan Only Mode
 - Constant Fan Operation
 - Away Mode

 I could not see an elegant way to implement these using the standard Heater/Cooler accessory exposed in HomeKit, and i dont generally use these features myself, so havent exposed them. I have the API commands and the tooling setup to support them, so if you really want these options drop me a line and I should be able to add some swicth accessories into homekit that turn these settings on and off

## Controlling Zone Temperature Settings
---
When modifying the zone temperature settings, the Que system only allows you to set a termprature that is within -2 degress (Heating) or +2 degress (Cooling) of the Master Control temprature. If you set a zone temprature that is outside of this +/- 2 degree range the plugin will translate the set temp to the allowable range. Im not sure if this is a limitation of my specific installation or standard for all Actron Que systems. If your system works differently please let me know and i can make some minor updates to make this variance range user configurable.

## Installation
---
### GUI Install
1. Search for "Actron Que" on the plugin screen of Homebridge Config UI X
2. Find: homebridge-actron-que
3. Click Install
4. Enter your account details in the settings screen displayed

### CLI Install
```
npm install -g homebridge-actron-que
```
Configure account details in the homebridge `config.json` file a below.
## Configuration
---
The plugin implements the Homebridge config UI service. Simply install the plugin and you will be guided through the setup.

If you are not using the Humbridge config UI you can add the following to your homebridge configuration

```
    "platforms": [
        {
            "platform": "ActronQue",
            "name": "ActronQue",
            "username": "<your_username>",
            "password": "<your_password>",
            "clientName": "homebridgeQue",
            "zonesFollowMaster": true | false
            "refreshInterval": 60,
            "deviceSerial": ""
        }]
```

#### `platform`
type: string

default: "ActronQue"

This is the name of the platfrom plugin you are configuring. This should always be set to the default value.

#### `name`
type: string

default: "ActronQue"

This is the name used for the instance of the plugin you are running. The default of "ActronQue" can be used in mosg cases

#### `username`
type: string

The username you use to login to the Actron Que app on your phone, or at que.actronair.com.au

default: 60
#### `password`
type: string

The password you use to login to the Actron Que app on your phone, or at que.actronair.com.au

default: 60
#### `clientName`
type: string

default: "homebridgeQue"

The value you set for client name will be used in two places:
1. It will set this as the default accessory name for the master controller when pairing the accessory in homekit.
2. It will appear as the client name in the 'Authorised Devices' list on the Que cloud service.

#### `refreshinterval`

type: number

Unit: seconds

default: 60

The plugin will periodically poll the Que API to update the locally cached settings in the plugin. This allows us to keep homekit up-to-date with changes made through other control moethods (i.e. the wall controller or the Que mobile app). The default is 60 seconds but can be adjusted to suit your preference.

#### `zonesFollowMaster`

type: boolean 

default: true

Setting this to true will make it so that any changes to the master controller temprature setting in homekit will ALWAYS be propogated to all zones. This is akin to toggling the 'Control All Zones' option on the Master Controller or in the Que mobile app.

#### `deviceSerial`
type: string (lowercase)

default: ""

In most cases you can exclude this option or leave it blank. If you only have a single air con system if your Que account the plugin will auto-discover the target device serial number. If you have multiple Que systems in your account you will need to specify which system you want to control by entering the serail number here.  You can get your device serail numbers by logging in to que.actronair.com.au and looking at the list of authorised devices.


### HTTP Error Handling

The plugin has been designed to manage the following HTTP error states

#### Error 400
---
The Que API returns a 400 status code when you attempt to authenticate with an invalid username or password. In this case you will see an Error loggeed to the Hombridge log suggesting that you check the username and password provided.

`Looks like you have a username or password issue, check your config file: http status code = 400`

#### Error 401
---
If an invalid or expired bearer token is presented in a request to the Que API the server will respond with a 401 ('Unauthorised') status code. In this case, the plugin will automatically request a new bearer token, update the request and retry.
The plugin is configured to retry a maximum of three times with a pause of three seconds between requests. If the maximum number of retires is exceeded you will see the following Error logged to the Homebrigde log file.

`Maximum retires excced on failed Authorisation: http status code = 401`

#### Error 504
---
During development of the plugin I noticed that the Que API occasionally fails to service a request from its backend and responds with a 504 (i think this is what causes the Que iphone app to be particularily awful to use). Waiting a second or two and retrying seems to reliably allow you to move past the error and carry on. For this reason the plugin will retry three times on a 504 status with a wait time of three seconds between retries. If the maximum number of retires is exceeded you will see the following Error logged to the Homebrigde log file.

`Maximum retires excced on gateway timeout: http status code = 504`

### All other non-200
---
All other errors will fall through to a default handler that will return the following Error in the Homebridge log.

`An unhandled error has occured: http status code = <status code>`