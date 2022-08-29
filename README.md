# homebridge-actron-que

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) 

[![npm](https://img.shields.io/npm/v/homebridge-actron-que/latest?label=latest)](https://www.npmjs.com/package/homebridge-actron-que)
[![GitHub release](https://img.shields.io/github/release/jxg81/homebridge-actron-que.svg)](https://github.com/jxg81/homebridge-actron-que/releases)
[![npm](https://img.shields.io/npm/dt/homebridge-actron-que)](https://www.npmjs.com/package/homebridge-actron-que)

[![Github CI](https://github.com/jxg81/homebridge-actron-que/actions/workflows/build.yml/badge.svg)](https://github.com/jxg81/homebridge-actron-que/actions)
 [![Github CD](https://github.com/jxg81/homebridge-actron-que/actions/workflows/release.yml/badge.svg)](https://github.com/jxg81/homebridge-actron-que/actions)
 [![Hex.pm](https://img.shields.io/hexpm/l/plug)](https://www.apache.org/licenses/LICENSE-2.0)

[![paypal](https://img.shields.io/badge/donate-paypal-blue)](https://www.paypal.com/donate/?business=MP4ZR6WS8UPX8&no_recurring=0&item_name=%28jxg81%29+-+Thanks+for+your+support.&currency_code=AUD)

Use this plugin to control your Actron Que system with Apple HomeKit using Homebridge.

## Current Status
---

This is an 'almost' feature complete implementation of the Que platfrom in HomeKit

 - Control either a single zone or multizone system
 - Master controller and each zone sensor will be exposed as unique, controllable accessory in HomeKit
 - Get temp and humidity data from all zones and master controller reported in HomeKit
 - Get temp data from outdoor unit as a seperate accessory
 - Report battery level on zone sensors and get low battery alerts in the home app
 - Support for homebridge config UI

New in version 1.2.0
 - Device state will now show as idle when heating/cooling temp achieved and fan is not running

 Fixes in version 1.1.1
 - Fixed support for zone sensors that do not support humidity sensing -> `https://github.com/jxg81/homebridge-actron-que/issues/1`
 - Improvements to device state transitions and status updates

New in version 1.1.0
 - Graceful recovery from service or network outages
 - Config option to control how adjustments to zone temperature are handled when set outside the +/- 2 degree variance with the master controller.
 - Faster updating of current device status in HomeKit UI on HomeKit intiated state changes.

Limitations - These options cannot be set via homekit:
 - Quiet Mode
 - Fan Only Mode
 - Constant Fan Operation
 - Away Mode

 I could not see an elegant way to implement these using the standard Heater/Cooler accessory exposed in HomeKit, and i dont generally use these features myself, so havent exposed them. I have the API commands and the tooling setup to support them, so if you really want these options drop me a line and I should be able to add some swicth accessories into homekit that turn these settings on and off

## Controlling Zone Temperature Settings
---
When modifying the zone temperature settings, the Que system only allows you to set a termprature that is within -2 degress (Heating) or +2 degress (Cooling) of the Master Control temprature. With version 1.1.0 I have modified the default behavior to autmatically adjust the master temp if required when modifying a zone temp.
Setting `zonesPushMaster` to false will revert to the prior behviour of constraing zones to the allowable max/min based on the current master setting. If you set a zone temprature that is outside of the +/- 2 degree range from the master the plugin will translate the set temp to the allowable range.


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
            "zonesFollowMaster": true | false,
            "zonesPushMaster": true | false,
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

#### `zonesPushMaster`

type: boolean 

default: true

Setting this to true will make it so that chnages to the zone temprature setting in homekit will push the master unit threshold temps for heat and cool if required. There is a +/- 2 degree variation permitted between the master temp and zone temps. Normally the Que native controls will restrict you to this temp range unless you manually adjust the master temp first. This option simply pushes the master temp to a new setting if you set the zone outside of the variance. Setting this to true has greatly increased my familys satisfaction with the controls.

#### `deviceSerial`
type: string (lowercase)

default: ""

In most cases you can exclude this option or leave it blank. If you only have a single air con system in your Que account the plugin will auto-discover the target device serial number. If you have multiple Que systems in your account you will need to specify which system you want to control by entering the serail number here. You can get your device serail numbers by logging in to que.actronair.com.au and looking at the list of authorised devices.


### HTTP Error Handling

The plugin has been designed to manage the following HTTP error states

#### Error 400
---
The Que API returns a 400 status code when you attempt to authenticate with an invalid username or password. In this case you will see an Error loggeed to the Hombridge log suggesting that you check the username and password provided.  
The error will also let you know that a restart may help if you recently revoked the client access through the que online portal. The reason the restart will help is because following this error the persistent storage of auth tokens is flushed in case there was an issue with the cached data.

`Looks like you have a username or password issue, check your config file: http status code = 400`  
`If you recently revoked access for clients on the Que portal, a restart should resolve the issue`

#### Error 401
---
If an invalid or expired bearer token is presented in a request to the Que API the server will respond with a 401 ('Unauthorised') status code. In this case, the plugin will automatically request a new bearer token, update the request and retry.
The plugin is configured to retry a maximum of three times with a pause of three seconds between requests. If the maximum number of retires is exceeded you will see the following Error logged to the Homebrigde log file.  
The error will also let you know that a restart may help if you recently revoked the client access through the que online portal. The reason the restart will help is because following this error the persistent storage of auth tokens is flushed in case there was an issue with the cached data.

`Maximum retires excced on failed Authorisation: http status code = 401`  
`If you recently revoked access for clients on the Que portal, a restart should resolve the issue`

#### Error 5xx
---
During development of the plugin I noticed that the Que API occasionally fails to service a request from its backend and responds with a 504 (i think this is what causes the Que iphone app to be particularily awful to use). Waiting a second or two and retrying seems to reliably allow you to move past the error and carry on. I also noted that on occasion the Que service will misbehave and return a range of 5xx errors (primarily 504 and 503). For this reason the plugin will retry three times on a 5xx status with a wait time of three seconds between retries. If the maximum number of retires is exceeded you will see the following Info message logged to the Homebrigde log file.

`Maximum retries exceeded -> Actron Que API returned a server side error: http status code = 5xx`

Generally these errors will resolve after time and things will keep on running. From version 1.1.0 this error handling was imporved to prevent the plugin terminating and allow for a graceful recovery once the Que API starts responding normally again.

### All other non-200
---
All other errors will fall through to a default handler that will return the following Error in the Homebridge log. As before, persistent auth data will be flushed to allow for a clean restart.

`An unhandled error has occured: http status code = <status code>`  
`If you recently revoked access for clients on the Que portal, a restart may resolve the issue`

### Network Outages
Begining with version 1.1.0 the plugin will now gracefully recover from network outages. The network MUST be available on startup, but if there is an outage during operation you will see the following Info message in the log and the plugin will resume functioning once the network is restored. 

`Cannot reach Que cloud service, check your network connection <specific error condition>`