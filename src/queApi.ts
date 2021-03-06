import * as fs from 'fs';
import fetch, { Request } from 'node-fetch';
import { apiToken, tokenCollection, PowerState, validApiCommands, ZoneStatus, HvacStatus, CommandResult } from './types';
import { Logger } from 'homebridge';
import { queApiCommands } from './queCommands';

// Defines an api interface for the Que cloud service
export default class QueApi {

  private readonly basePath: string = 'https://que.actronair.com.au';
  private readonly persistentDataDir: string = './homebridge-actron-que-persist';
  private readonly refreshTokenFile: string = './homebridge-actron-que-persist/access.token';
  private readonly bearerTokenFile: string = './homebridge-actron-que-persist/bearer.token';
  private readonly apiClientIdFile: string = './homebridge-actron-que-persist/clientid.token';
  private apiClientId: string;
  private commandUrl!: string;
  private queryUrl!: string;
  actronSerial = '';
  actronSystemId = '';
  refreshToken: apiToken;
  bearerToken: apiToken;

  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly apiClinetName: string,
    private readonly log: Logger,
    actronSerial = '',
  ) {
    this.apiClientId = '';
    this.actronSerial = actronSerial;

    // check for existing client ID for given client name. If client name file does not exist then create one.
    // If client is new name then create a new unique ID.
    if (!fs.existsSync(this.persistentDataDir)) {
      fs.mkdirSync(this.persistentDataDir);
    }
    if (!fs.existsSync(this.apiClientIdFile)) {
      this.apiClientId = this.generateClientId();
      fs.writeFileSync(this.apiClientIdFile, `[{"name": "${this.apiClinetName}", "id": "${this.apiClientId}"}]`);
    } else {
      const registeredDevices: object[] = JSON.parse(fs.readFileSync(this.apiClientIdFile).toString());
      for (const registeredDevice of registeredDevices) {
        if (registeredDevice['name'] === this.apiClinetName) {
          this.apiClientId = registeredDevice['id'];
        } else {
          this.apiClientId = this.generateClientId();
          registeredDevices.push({name: this.apiClinetName, id: this.apiClientId});
          fs.writeFileSync(this.apiClientIdFile, JSON.stringify(registeredDevices));
        }
      }
    }
    // ensure token files exist to prevent write errors in token reading and generation
    if (!fs.existsSync(this.refreshTokenFile)) {
      fs.writeFileSync(this.refreshTokenFile, '{"expires": 0, "token": ""}');
    }
    if (!fs.existsSync(this.bearerTokenFile)) {
      fs.writeFileSync(this.bearerTokenFile, '{"expires": 0, "token": ""}');
    }
    // read vale of existing tokens
    this.refreshToken = JSON.parse(fs.readFileSync(this.refreshTokenFile).toString());
    this.bearerToken = JSON.parse(fs.readFileSync(this.bearerTokenFile).toString());
  }

  async manageApiRequest(requestContent: Request, retries = 3, delay = 3) {
    // manage api requests with a retry on error with delay

    // Simple function to cause a delay between retries
    const wait = (time = delay) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, time * 1000);
      });
    };

    const response = await fetch(requestContent);
    switch (response.status) {

      case (200):
        return response.json();

      // If the bearer token has expired then generate new token, update request and retry
      // error will be generated after max retries is reached, default of 2
      case(401):
        await this.tokenGenerator();
        requestContent.headers.set('Authorization', `Bearer ${this.bearerToken.token}`);
        if (retries > 0) {
          await wait();
          return this.manageApiRequest(requestContent, retries -1);
        } else {
          throw Error(`Maximum retires excced on failed Authorisation: http status code = ${response.status}`);
        }

      case(400):
        throw Error(`Looks like you have a username or password issue, check your config file: http status code = ${response.status}`);

      // observed occasional gateway timeouts when querying the API. This allows for a couple of retrys before failing
      case(504):
        if (retries > 0) {
          await wait();
          return this.manageApiRequest(requestContent, retries -1);
        } else {
          throw Error(`Maximum retires excced on gateway timeout: http status code = ${response.status}`);
        }

      default:
        throw Error(`An unhandled error has occured: http status code = ${response.status}`);
    }
  }

  async initalizer() {
    // intiilisation is done outside of the constructor as we need to 'await' the collection of auth tokens
    // we also need to await the collection of the device serail number for future API requests.
    await this.tokenGenerator();
    await this.getAcSystems();
    this.commandUrl = `${this.basePath}/api/v0/client/ac-systems/cmds/send?serial=${this.actronSerial}`;
    this.queryUrl = `${this.basePath}/api/v0/client/ac-systems/status/latest?serial=${this.actronSerial}`;
  }

  generateClientId () {
    // simple method to generate a unique client ID if registering a new client
    const randomNumber = Math.round(Math.random() * (99999 - 10001) + 10001);
    return this.apiClinetName + '-' + randomNumber;
  }

  private async getRefreshToken() {
    // Registers the clinet if not already registered and collects the refresh (access) token
    // refresh token will be stored to a file for perssistence
    const url: string = this.basePath + '/api/v0/client/user-devices';
    const preparedRequest = new Request (url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        username: this.username,
        password: this.password,
        deviceName: this.apiClinetName,
        deviceUniqueIdentifier: this.apiClientId,
        client: 'ios',
      }),
    });
    // this is wrapped in a try/catch to help identify potential user/pass related errors
    let response;
    try {
      response = await this.manageApiRequest(preparedRequest);
    } catch (error) {
      if (error instanceof Error) {
        this.log.error(error.message);
        throw error;
      }
    }
    this.refreshToken = {expires: Date.parse(response['expires']), token: response['pairingToken']};
    fs.writeFile(this.refreshTokenFile, JSON.stringify(this.refreshToken), error => {
      if (error){
        if (error instanceof Error) {
          this.log.error(error.message);
          throw error;
        }
      }
      this.log.info(`new refresh token saved to ${this.refreshTokenFile}`);
    });
    return this.refreshToken;
  }

  private async getBearerToken() {
    // Collects bearer token using refresh token and store to file for persistence
    // the token is returned with 'expires_in' relative time, function converts
    // this to expires_at absolute time (minus 5 minutes) for ease of checking
    const url : string = this.basePath + '/api/v0/oauth/token';
    const preparedRequest = new Request (url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken.token,
        client_id: 'app',
      }),
    });

    const response = await this.manageApiRequest(preparedRequest);
    const expiresAt: number = Date.now() + (response['expires_in'] * 1000 ) - 300;
    this.bearerToken = {expires: expiresAt, token: response['access_token']};
    fs.writeFile(this.bearerTokenFile, JSON.stringify(this.bearerToken), error => {
      if (error){
        if (error instanceof Error) {
          this.log.error(error.message);
          throw error;
        }
      }
      this.log.info(`new bearer token saved to ${this.bearerTokenFile}`);
    });
    return this.bearerToken;
  }

  private async tokenGenerator() : Promise<tokenCollection> {
    // check if the currently stored tokens are valid, if not collect new tokens
    if (this.refreshToken.expires - Date.now() <= 0 ) {
      await this.getRefreshToken();
      await this.getBearerToken();
    } else if (this.bearerToken.expires - Date.now() <= 0 ) {
      await this.getBearerToken();
    }

    const result: tokenCollection = {
      refreshToken: this.refreshToken,
      bearerToken: this.bearerToken,
    };

    return result;
  }

  private async getAcSystems() {
    // Get a list of all AC systems in the account and select the correct unit
    // logic assumes a sinle unit in your account, but if there is multiple you can specify whcih one you want
    const url : string = this.basePath + '/api/v0/client/ac-systems';
    const preparedRequest = new Request (url, {
      method: 'GET',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`},
    });

    const response = await this.manageApiRequest(preparedRequest);
    const systemList: object[] = response['_embedded']['ac-system'];
    // if there is no serial provided and only one system then assume this is the target system
    if (systemList.length === 1) {
      this.actronSerial = systemList[0]['serial'];
      this.actronSystemId = systemList[0]['id'];
      this.log.info(`located serail number ${this.actronSerial} with ID of ${this.actronSystemId}`);
      // if there is multiple systems make sure the provided serial matches one of the retrieved items
    } else if (systemList.length > 1 && this.actronSerial !== '') {
      for (const system of systemList) {
        if (system['serial'] === this.actronSerial) {
          this.actronSystemId = system['id'];
          this.log.info(`located serail number ${this.actronSerial} with ID of ${this.actronSystemId}`);
        }
      }
      //if there serial cannot be located then we will log an error that serial was not found
    } else {
      this.log.error(`could not identify target device from list of returned systems:\n ${systemList} `);
    }
  }

  async getStatus(): Promise<HvacStatus> {
    // retrieves the full status of the aircon unit and all zones
    const preparedRequest = new Request (this.queryUrl, {
      method: 'GET',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`, 'Accept': 'application/json'},
    });

    const response = await this.manageApiRequest(preparedRequest);
    const masterCurrentSettings: object = response['lastKnownState']['UserAirconSettings'];
    const compressorCurrentState: object = response['lastKnownState']['LiveAircon'];
    const masterCurrentState: object = response['lastKnownState']['MasterInfo'];
    const zoneCurrentStateSettings: object[] = response['lastKnownState']['RemoteZoneInfo'];
    const zoneEnabledState: object = response['lastKnownState']['UserAirconSettings']['EnabledZones'];
    const zoneCurrentStatus: ZoneStatus[] = [];

    // zone index number is based on the order in the returned array, we add the zone index to the
    // results as we need this to send commands later. The zone data is enclosed behid the serial number
    // we are also capturing the serial number of the sensor to be used later in the homebridge UUID generation
    // also mapping the zone enabled sate into this field as its traccked seperate to the zone info
    let loopIndex = 0;
    for (const zone of zoneCurrentStateSettings) {
      const zoneIndex = loopIndex;
      loopIndex++;
      const sensorId = Object.keys(zone['Sensors'])[0];

      // Skip the zone entries that arent populated with a remote sensor, these seem to all have 'MASTER_CONTROLLER' as the
      // 'NV_Kind'. This works for my system, you may want to check the response data here if you have zone
      // detection issues on your system
      if (zone['Sensors'][sensorId]['NV_Kind'] === 'MASTER_CONTROLLER') {
        continue;
      }

      // Format the data in a standard model that could be used with multiple HVAC types. Not sure if this was worth the effort
      // but if i have to create another HVAC plugin it will be worthwhile :)
      // This first section is the zone data, one of these per zone
      const zoneData: ZoneStatus = {
        zoneName: zone['NV_Title'],
        zoneIndex: zoneIndex,
        sensorId: sensorId,
        zoneEnabled: zoneEnabledState[zoneIndex],
        currentTemp: zone['LiveTemp_oC'],
        currentHumidity: zone['LiveHumidity_pc'],
        maxHeatSetPoint: zone['MaxHeatSetpoint'],
        minHeatSetPoint: zone['MinHeatSetpoint'],
        maxCoolSetPoint: zone['MaxCoolSetpoint'],
        minCoolSetPoint: zone['MinCoolSetpoint'],
        currentHeatingSetTemp: zone['TemperatureSetpoint_Heat_oC'],
        currentCoolingSetTemp: zone['TemperatureSetpoint_Cool_oC'],
        zoneSensorBattery: zone['Sensors'][sensorId]['Battery_pc'],
      };
      zoneCurrentStatus.push(zoneData);
    }

    // This is the standardised format for the master controller. again, this wil be useful if i need to do
    // this for another AC type
    const currentStatus: HvacStatus = {
      powerState: (masterCurrentSettings['isOn'] === true) ? PowerState.ON : PowerState.OFF,
      climateMode: masterCurrentSettings['Mode'],
      compressorMode: compressorCurrentState['CompressorMode'],
      fanMode: masterCurrentSettings['FanMode'],
      awayMode: masterCurrentSettings['AwayMode'],
      quietMode: masterCurrentSettings['QuietMode'],
      controlAllZones: masterCurrentState['ControlAllZones'],
      masterCoolingSetTemp: masterCurrentSettings['TemperatureSetpoint_Cool_oC'],
      masterHeatingSetTemp: masterCurrentSettings['TemperatureSetpoint_Heat_oC'],
      masterCurrentTemp: masterCurrentState['LiveTemp_oC'],
      masterCurrentHumidity: masterCurrentState['LiveHumidity_pc'],
      outdoorTemp: masterCurrentState['LiveOutdoorTemp_oC'],
      compressorChasingTemp: compressorCurrentState['CompressorChasingTemperature'],
      compressorCurrentTemp: compressorCurrentState['CompressorLiveTemperature'],
      zoneCurrentStatus: zoneCurrentStatus,
    };
    this.log.debug(`got current status from Actron Cloud:\n ${JSON.stringify(currentStatus)}`);
    return currentStatus;
  }

  // defaulting zoneIndex here to 255 as this should be an invalid value, but maybe i should do soemthing different
  async runCommand(commandType: validApiCommands, coolTemp = 20.0, heatTemp = 20.0, zoneIndex = 255): Promise<CommandResult> {
    // this function does what it says on the tin. Run the command issued to the system.
    // all possible commands are stored in 'queCommands'
    const command = queApiCommands[commandType](coolTemp, heatTemp, zoneIndex);

    const preparedRequest = new Request (this.commandUrl, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(command),
    });
    const response = await this.manageApiRequest(preparedRequest);
    if (response.type === 'ack') {
      this.log.debug(`Command sucessful, 'ack' recieved from Actron Cloud:\n ${JSON.stringify(response.value)}`);
      return CommandResult.SUCCESS;
    } else {
      this.log.debug(`Command failed, NO 'ack' recieved from Actron Cloud:\n 
      Command attempted: ${JSON.stringify(command)}\n
      API response: ${JSON.stringify(response)}`);
      return CommandResult.FAILURE;
    }
  }
}