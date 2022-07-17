import * as dotenv from 'dotenv';
import fetch, { Response, Request } from 'node-fetch';
import * as fs from 'fs';

dotenv.config();

const username = String(process.env.USERNAME);
const password = String(process.env.PASSWORD);
const deviceName = 'js-testing';

// fetch error handler
function httpErrorHandler(response : Response) : Response {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
}

// fetch request wrapper / http manager
function request(request: Request) : Promise<object>{
  return fetch(request)
    .then(httpErrorHandler)
    .then(res => res.json())
    .catch(error => error);
}

// custom type declerations
interface apiToken {
  expires: number;
  token: string;
}

interface tokenCollection {
  refreshToken: apiToken;
  bearerToken: apiToken;
}

// temp logger
class Logger {
  logFile = './messages.log';

  log(message: string){
    fs.appendFile(this.logFile, `${Date()}: ${message}\n`, err => {
      if (err){
        throw Error(err.message);
      }
    });
  }
}

// Defines an api interface for the Que cloud service
export default class QueApi {

  private readonly log = new Logger(); // placeholder for the logger
  private readonly basePath: string = 'https://que.actronair.com.au';
  private readonly refreshTokenFile: string = './access.token';
  private readonly bearerTokenFile: string = './bearer.token';
  private readonly deviceIdFile: string = './clientid.token';
  private deviceName: string;
  private deviceId: string;
  private username: string;
  private password: string;
  actronSerial: string | undefined;
  actronId: string | undefined;
  refreshToken: apiToken;
  bearerToken: apiToken;

  constructor(username: string, password: string, deviceName: string, actronSerial: string | undefined = undefined) {
    this.deviceId = '';
    this.username = username;
    this.password = password;
    this.deviceName = deviceName;
    this.actronSerial = actronSerial;

    if (!fs.existsSync(this.deviceIdFile)) {
      this.deviceId = this.generateClientId();
      fs.writeFileSync(this.deviceIdFile, `[{"name": "${this.deviceName}", "id": "${this.deviceId}"}]`);
    } else {
      const registeredDevices: object[] = JSON.parse(fs.readFileSync(this.deviceIdFile).toString());
      for (const registeredDevice of registeredDevices) {
        if (registeredDevice['name'] === deviceName) {
          this.deviceId = registeredDevice['id'];
        } else {
          this.deviceId = this.generateClientId();
          registeredDevices.push({name: this.deviceName, id: this.deviceId});
          fs.writeFileSync(this.deviceIdFile, String(registeredDevices));
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
  }

  generateClientId () {

    const randomNumber = Math.round(Math.random() * (99999 - 10001) + 10001);
    return this.deviceName + '-' + randomNumber;
  }

  private async getRefreshToken() {

    const url: string = this.basePath + '/api/v0/client/user-devices';
    const preparedRequest = new Request (url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        username: this.username,
        password: this.password,
        deviceName: this.deviceName,
        deviceUniqueIdentifier: this.deviceId,
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
          this.actronId = systemList[0]['id'];
          this.log.log(`located serail number ${this.actronSerial} with ID of ${this.actronId}`);
          // if there is multiple systems make sure the provided serail matches one of the retrieved items
        } else if (systemList.length > 1 && this.actronSerial !== null) {
          for (const system of systemList) {
            if (system['serial'] === this.actronSerial) {
              this.actronId = system['id'];
              this.log.log(`located serail number ${this.actronSerial} with ID of ${this.actronId}`);
            }
          }
        } else {
          this.log.log(`could not identify target device from list of returned systems: ${systemList} `);
        }
      });
  }

  async getStatus() {

    let waitCount = 0;
    while (this.actronSerial === undefined && waitCount <= 100) {
      waitCount++;
      this.log.log(JSON.stringify(`waiting on serial number ${waitCount}`));
    }
    const url = `${this.basePath}/api/v0/client/ac-systems/status/latest?serial=${this.actronSerial}`;
    const preparedRequest = new Request (url, {
      method: 'GET',
      headers: {'Authorization': `Bearer ${this.bearerToken.token}`, 'Accept': 'application/json'},
    });
    const result = await request(preparedRequest)
      .then(response => {
        const masterCurrentSettings: object = response['lastKnownState']['UserAirconSettings'];
        const masterCurrentState: object = response['lastKnownState']['LiveAircon'];
        const currentStatus: object = {
          powerState: (masterCurrentSettings['isOn'] === true) ? PowerState.On : PowerState.Off,
          climateMode: masterCurrentSettings['Mode'],
          fanMode: masterCurrentSettings['FanMode'],
          coolingSetTemp: masterCurrentSettings['TemperatureSetpoint_Cool_oC'],
          heatingSetTemp: masterCurrentSettings['TemperatureSetpoint_Heat_oC'],
          chasingTemp: masterCurrentState['CompressorChasingTemperature'],
          currentTemp: masterCurrentState['CompressorLiveTemperature'],
        };
        return currentStatus;
      });
    return result;
  }

}

enum PowerState {
  On = 'ON',
  Off = 'OFF',
  Unknown = 'UNKNOWN',
}

enum ClimateMode {
  Automatic = 'AUTO',
  Cool = 'COOL',
  Heat = 'HEAT',
  Fan = 'FAN',
  Unknown = 'UNKNOWN',
}

enum FanMode {
  Automatic = 'AUTO',
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Unknown = 'UNKNOWN',
}

export class HvacUnit {

  private readonly name: string;
  type: string | undefined;
  apiInterface!: QueApi;

  powerState: PowerState = PowerState.Unknown;
  climateMode: ClimateMode = ClimateMode.Unknown;
  fanMode: FanMode = FanMode.Unknown;
  coolingSetTemp = 0;
  heatingSetTemp = 0;
  chasingTemp = 0;
  currentTemp = 0;

  constructor(name: string) {
    this.name = name;
  }

  async actronQueApi(username: string, password: string, serialNumber: string | undefined = undefined) {
    this.type = 'actronQue';
    this.apiInterface = new QueApi(username, password, this.name, serialNumber);
    return await this.apiInterface.initalizer();
  }

  async getStatus() {
    const currentStatus = await this.apiInterface.getStatus();
    this.powerState = currentStatus['powerState'];
    this.climateMode = currentStatus['climateMode'];
    this.fanMode = currentStatus['fanMode'];
    this.coolingSetTemp = currentStatus['coolingSetTemp'];
    this.heatingSetTemp = currentStatus['heatingSetTemp'];
    this.chasingTemp = currentStatus['chasingTemp'];
    this.currentTemp = currentStatus['currentTemp'];
    return currentStatus;
  }

  // async setPowerState() {}

  // async setClimateMode () {}

  // async setFanMode () {}

  // async setCoolingTemp () {}

  // async setHeatingTemp () {}

}


const newApi = new HvacUnit(deviceName);
newApi.actronQueApi(username, password)
  .then(() => newApi.getStatus());
//newApi.getStatus();
setTimeout(() => console.log(newApi), 3000);
// (async () => {
//   const newApi = new HvacUnit(deviceName);
//   await newApi.actronQueApi(username, password);
//   newApi.getStatus();
//   //setTimeout(() => newApi.getStatus(), 5000);
//   setTimeout(() => console.log(newApi), 2000);
// })();
