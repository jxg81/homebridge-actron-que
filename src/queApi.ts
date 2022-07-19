import * as fs from 'fs';
import { Request } from 'node-fetch';
import { apiToken, tokenCollection, PowerState, validApiCommands, ZoneStatus, HvacStatus } from './types';
import { Logger } from './tempTools';
import { request } from './requestManager';
import { queApiCommands } from './queCommands';

// Defines an api interface for the Que cloud service
export default class QueApi {

  private readonly log = new Logger(); // placeholder for the logger
  private readonly basePath: string = 'https://que.actronair.com.au';
  private readonly refreshTokenFile: string = './access.token';
  private readonly bearerTokenFile: string = './bearer.token';
  private readonly apiDeviceIdFile: string = './clientid.token';
  private apiDeviceName: string;
  private apiClientId: string;
  private username: string;
  private password: string;
  private commandUrl!: string;
  private queryUrl!: string;
  actronSerial = '';
  actronSystemId = '';
  refreshToken: apiToken;
  bearerToken: apiToken;

  constructor(username: string, password: string, deviceName: string, actronSerial = '') {
    this.apiClientId = '';
    this.username = username;
    this.password = password;
    this.apiDeviceName = deviceName;
    this.actronSerial = actronSerial;

    if (!fs.existsSync(this.apiDeviceIdFile)) {
      this.apiClientId = this.generateClientId();
      fs.writeFileSync(this.apiDeviceIdFile, `[{"name": "${this.apiDeviceName}", "id": "${this.apiClientId}"}]`);
    } else {
      const registeredDevices: object[] = JSON.parse(fs.readFileSync(this.apiDeviceIdFile).toString());
      for (const registeredDevice of registeredDevices) {
        if (registeredDevice['name'] === deviceName) {
          this.apiClientId = registeredDevice['id'];
        } else {
          this.apiClientId = this.generateClientId();
          registeredDevices.push({name: this.apiDeviceName, id: this.apiClientId});
          fs.writeFileSync(this.apiDeviceIdFile, JSON.stringify(registeredDevices));
        }
      }
    }
    if (!fs.existsSync(this.refreshTokenFile)) {
      fs.writeFileSync(this.refreshTokenFile, '{"expires": 0, "token": ""}');
    }
    if (!fs.existsSync(this.bearerTokenFile)) {
      fs.writeFileSync(this.bearerTokenFile, '{"expires": 0, "token": ""}');
    }
    this.refreshToken = JSON.parse(fs.readFileSync(this.refreshTokenFile).toString());
    this.bearerToken = JSON.parse(fs.readFileSync(this.bearerTokenFile).toString());
  }

  async initalizer() {

    await this.tokenGenerator();
    await this.getAcSystems();
    this.commandUrl = `${this.basePath}/api/v0/client/ac-systems/cmds/send?serial=${this.actronSerial}`;
    this.queryUrl = `${this.basePath}/api/v0/client/ac-systems/status/latest?serial=${this.actronSerial}`;

  }

  generateClientId () {

    const randomNumber = Math.round(Math.random() * (99999 - 10001) + 10001);
    return this.apiDeviceName + '-' + randomNumber;
  }

  private async getRefreshToken() {

    const url: string = this.basePath + '/api/v0/client/user-devices';
    const preparedRequest = new Request (url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        username: this.username,
        password: this.password,
        deviceName: this.apiDeviceName,
        deviceUniqueIdentifier: this.apiClientId,
        client: 'ios',
      }),
    });
    return request(preparedRequest)
      .then(response => {
        this.refreshToken = {expires: Date.parse(response['expires']), token: response['pairingToken']};
        fs.writeFile(this.refreshTokenFile, JSON.stringify(this.refreshToken), err => {
          if (err){
            this.log.log(err.message); //TODO: Update logger and error handling
          }
          this.log.log(`new refresh token saved to ${this.refreshTokenFile}`);
        });
      });
  }

  private async getBearerToken() {

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
    return request(preparedRequest)
      .then(response => {
        const expiresAt: number = Date.now() + (response['expires_in'] * 1000 ) - 300;
        this.bearerToken = {expires: expiresAt, token: response['access_token']};
        fs.writeFile(this.bearerTokenFile, JSON.stringify(this.bearerToken), err => {
          if (err){
            this.log.log(String(err)); //TODO: Update logger and error handling
          }
          this.log.log(`new bearer token saved to ${this.bearerTokenFile}`);
        });
      });
  }

  private async tokenGenerator() : Promise<tokenCollection> {

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

    const url : string = this.basePath + '/api/v0/client/ac-systems';
    const preparedRequest = new Request (url, {
      method: 'GET',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`},
    });
    this.log.log(JSON.stringify(Object.fromEntries(preparedRequest.headers)));
    return request(preparedRequest)
      .then(data => {
        const systemList: object[] = data['_embedded']['ac-system'];
        // if there is no serial provided and only one system then assume this is the target system
        if (systemList.length === 1) {
          this.actronSerial = systemList[0]['serial'];
          this.actronSystemId = systemList[0]['id'];
          this.log.log(`located serail number ${this.actronSerial} with ID of ${this.actronSystemId}`);
          // if there is multiple systems make sure the provided serail matches one of the retrieved items
        } else if (systemList.length > 1 && this.actronSerial !== '') {
          for (const system of systemList) {
            if (system['serial'] === this.actronSerial) {
              this.actronSystemId = system['id'];
              this.log.log(`located serail number ${this.actronSerial} with ID of ${this.actronSystemId}`);
            }
          }
        } else {
          this.log.log(`could not identify target device from list of returned systems: ${systemList} `);
        }
      });
  }

  async getStatus(): Promise<HvacStatus> {

    const preparedRequest = new Request (this.queryUrl, {
      method: 'GET',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`, 'Accept': 'application/json'},
    });
    const result = await request(preparedRequest)
      .then(response => {
        const masterCurrentSettings: object = response['lastKnownState']['UserAirconSettings'];
        const compressorCurrentState: object = response['lastKnownState']['LiveAircon'];
        const masterCurrentState: object = response['lastKnownState']['MasterInfo'];
        const zoneCurrentStateSettings: object[] = response['lastKnownState']['RemoteZoneInfo'];
        const zoneEnabledState: object = response['lastKnownState']['UserAirconSettings']['EnabledZones'];
        const zoneCurrentStatus: ZoneStatus[] = [];

        let loopIndex = 0;
        for (const zone of zoneCurrentStateSettings) {
          const zoneIndex = loopIndex;
          loopIndex++;
          const sensorId = Object.keys(zone['Sensors'])[0];
          // Skip the zone entries that arent populated with a remote sensor
          if (zone['Sensors'][sensorId]['NV_Kind'] === 'MASTER_CONTROLLER') {
            continue;
          }

          const zoneData: ZoneStatus = {
            zoneName: zone['NV_Title'],
            zoneIndex: zoneIndex,
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

        const currentStatus: HvacStatus = {
          powerState: (masterCurrentSettings['isOn'] === true) ? PowerState.ON : PowerState.OFF,
          climateMode: masterCurrentSettings['Mode'],
          compressorMode: compressorCurrentState['CompressorMode'],
          fanMode: masterCurrentSettings['FanMode'],
          awayMode: masterCurrentSettings['AwayMode'],
          quietMode: masterCurrentSettings['QuietMode'],
          masterCoolingSetTemp: masterCurrentSettings['TemperatureSetpoint_Cool_oC'],
          masterHeatingSetTemp: masterCurrentSettings['TemperatureSetpoint_Heat_oC'],
          masterCurrentTemp: masterCurrentState['LiveTemp_oC'],
          masterCurrentHumidity: masterCurrentState['LiveHumidity_pc'],
          outdoorTemp: masterCurrentState['LiveOutdoorTemp_oC'],
          compressorChasingTemp: compressorCurrentState['CompressorChasingTemperature'],
          compressorCurrentTemp: compressorCurrentState['CompressorLiveTemperature'],
          zoneCurrentStatus: zoneCurrentStatus,
        };
        return currentStatus;
      });
    return result;
  }

  async runCommand(commandType: validApiCommands, coolTemp = 20.0, heatTemp = 20.0) {
    const command = queApiCommands[commandType](coolTemp, heatTemp);
    this.log.log(JSON.stringify(command));
    const preparedRequest = new Request (this.commandUrl, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(command),
    });
    const result = request(preparedRequest).then(res => res['type']);
    return result;
  }

}