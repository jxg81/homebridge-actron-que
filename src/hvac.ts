import QueApi from './queApi';
import { PowerState, FanMode, ClimateMode, CompressorMode, validApiCommands, ZoneStatus, HvacStatus } from './types';
import { username, password, deviceName } from './tempTools';

export class HvacUnit {

  private readonly name: string;
  type = '';
  serail = '';
  apiInterface!: QueApi;

  powerState: PowerState = PowerState.UNKNOWN;
  climateMode: ClimateMode = ClimateMode.UNKNOWN;
  fanMode: FanMode = FanMode.UNKNOWN;
  compressorMode: CompressorMode = CompressorMode.UNKNOWN;
  awayMode = false;
  quietMode = false;
  masterCoolingSetTemp = 0;
  masterHeatingSetTemp = 0;
  masterCurrentTemp = 0;
  masterHumidity = 0;
  compressorChasingTemp = 0;
  compressorCurrentTemp = 0;
  outdoorTemp = 0;
  zoneData: ZoneStatus[] = [];

  constructor(name: string) {
    this.name = name;
  }

  async actronQueApi(username: string, password: string, serialNumber = '') {
    this.type = 'actronQue';
    this.apiInterface = new QueApi(username, password, this.name, serialNumber);
    await this.apiInterface.initalizer();
    this.serail = this.apiInterface.actronSerial;
    return this.serail;
  }

  async getStatus(): Promise<HvacStatus> {
    const currentStatus = await this.apiInterface.getStatus();
    this.powerState = currentStatus.powerState;
    this.climateMode = currentStatus.climateMode;
    this.compressorMode = currentStatus.compressorMode;
    this.fanMode = currentStatus.fanMode;
    this.masterCoolingSetTemp = currentStatus.masterCoolingSetTemp;
    this.masterHeatingSetTemp = currentStatus.masterHeatingSetTemp;
    this.compressorChasingTemp = currentStatus.compressorChasingTemp;
    this.compressorCurrentTemp = currentStatus.compressorCurrentTemp;
    this.awayMode = currentStatus.awayMode;
    this.quietMode = currentStatus.quietMode;
    this.outdoorTemp = currentStatus.outdoorTemp;
    this.masterCurrentTemp = currentStatus.masterCurrentTemp;
    this.masterHumidity = currentStatus.masterCurrentHumidity;
    this.zoneData = currentStatus.zoneCurrentStatus;
    return currentStatus;
  }

  async setPowerState() {
    if (this.powerState === PowerState.UNKNOWN) {
      await this.getStatus();
    }
    let result: Promise<string>;
    if (this.powerState === PowerState.ON) {
      result = this.apiInterface.runCommand(validApiCommands.OFF)
        .then(() => this.powerState=PowerState.OFF);
    } else {
      result = this.apiInterface.runCommand(validApiCommands.ON)
        .then(() => this.powerState=PowerState.ON);
    }
    return result;
  }

  async setHeatTemp(heatTemp: number) {
    const coolTemp = 0;
    const result = this.apiInterface.runCommand(validApiCommands.HEAT_SET_POINT, coolTemp, heatTemp)
      .then(() => this.masterHeatingSetTemp=heatTemp);
    return result;
  }

  async setCoolTemp(coolTemp: number) {
    const heatTemp = 0;
    const result = this.apiInterface.runCommand(validApiCommands.COOL_SET_POINT, coolTemp, heatTemp)
      .then(() => this.masterCoolingSetTemp=coolTemp);
    return result;
  }

  async setHeatCoolTemp(coolTemp: number, heatTemp: number) {
    const result = this.apiInterface.runCommand(validApiCommands.HEAT_COOL_SET_POINT, coolTemp, heatTemp)
      .then(() => {
        this.masterCoolingSetTemp=coolTemp;
        this.masterHeatingSetTemp=heatTemp;
      });
    return result;
  }

  async setClimateModeAuto() {
    const result = this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_AUTO)
      .then(() => this.climateMode=ClimateMode.AUTO);
    return result;
  }

  async setClimateModeCool() {
    const result = this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_COOL)
      .then(() => this.climateMode=ClimateMode.COOL);
    return result;
  }

  async setClimateModeHeat() {
    const result = this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_HEAT)
      .then(() => this.climateMode=ClimateMode.HEAT);
    return result;
  }

  async setClimateModeFan() {
    const result = this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_FAN)
      .then(() => this.climateMode=ClimateMode.FAN);
    return result;
  }

  async setFanModeAuto() {
    const result = this.apiInterface.runCommand(validApiCommands.FAN_MODE_AUTO)
      .then(() => this.fanMode=FanMode.AUTO);
    return result;
  }

  async setFanModeLow() {
    const result = this.apiInterface.runCommand(validApiCommands.FAN_MODE_LOW)
      .then(() => this.fanMode=FanMode.LOW);
    return result;
  }

  async setFanModeMedium() {
    const result = this.apiInterface.runCommand(validApiCommands.FAN_MODE_MEDIUM)
      .then(() => this.fanMode=FanMode.MEDIUM);
    return result;
  }

  async setFanModeHigh() {
    const result = this.apiInterface.runCommand(validApiCommands.FAN_MODE_HIGH)
      .then(() => this.fanMode=FanMode.HIGH);
    return result;
  }

  async setAwayMode() {
    if (this.powerState === PowerState.UNKNOWN) {
      await this.getStatus();
    }
    let result: Promise<boolean>;
    if (this.awayMode === true) {
      result = this.apiInterface.runCommand(validApiCommands.AWAY_MODE_OFF)
        .then(() => this.awayMode=false);
    } else {
      result = this.apiInterface.runCommand(validApiCommands.AWAY_MODE_ON)
        .then(() => this.awayMode=true);
    }
    return result;
  }

  async setQuietMode() {
    if (this.powerState === PowerState.UNKNOWN) {
      await this.getStatus();
    }
    let result: Promise<boolean>;
    if (this.quietMode === true) {
      result = this.apiInterface.runCommand(validApiCommands.QUIET_MODE_OFF)
        .then(() => this.quietMode=false);
    } else {
      result = this.apiInterface.runCommand(validApiCommands.QUIET_MODE_ON)
        .then(() => this.quietMode=true);
    }
    return result;
  }
}


// const myAC = new HvacUnit(deviceName);
// myAC.actronQueApi(username, password)
//   .then(() => myAC.getStatus()).then(() => myAC.setPowerState());
// //newApi.getStatus();
// setTimeout(() => console.log(myAC), 6000);
// (async () => {
//   const myAC = new HvacUnit(deviceName);
//   const serialNo = await myAC.actronQueApi(username, password);
//   await myAC.getStatus();
//   //const newState = await myAC.setFanModeAuto();
//   //setTimeout(() => console.log(newState), 5000);
//   //setTimeout(() => console.log(typeof newState), 5000);
//   console.log(myAC);
// })();
