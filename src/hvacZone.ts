import { validApiCommands, ZoneStatus, CommandResult } from './types';
import QueApi from './queApi';
import { Logger } from 'homebridge';

export class HvacZone {
  readonly zoneName: string;
  readonly zoneIndex: number;
  readonly sensorId: string;
  readonly zoneHumiditySensor: boolean;
  zoneEnabled: boolean;
  currentTemp: number;
  currentHeatingSetTemp: number;
  currentCoolingSetTemp: number;
  maxHeatSetPoint: number;
  minHeatSetPoint: number;
  maxCoolSetPoint: number;
  minCoolSetPoint: number;
  currentHumidity: number;
  zoneSensorBattery: number;

  constructor(
        private readonly log: Logger,
        readonly apiInterface: QueApi,
        zoneStatus: ZoneStatus,
        readonly zoneBatteryChecking: boolean,
  ) {

    this.zoneName = zoneStatus.zoneName;
    this.zoneIndex = zoneStatus.zoneIndex;
    this.sensorId = zoneStatus.sensorId;
    this.zoneEnabled = zoneStatus.zoneEnabled;
    this.currentTemp = zoneStatus.currentTemp;
    this.maxHeatSetPoint = zoneStatus.maxHeatSetPoint;
    this.minHeatSetPoint = zoneStatus.minHeatSetPoint;
    this.maxCoolSetPoint = zoneStatus.maxCoolSetPoint;
    this.minCoolSetPoint = zoneStatus.minCoolSetPoint;
    this.currentHeatingSetTemp = zoneStatus.currentHeatingSetTemp;
    this.currentCoolingSetTemp = zoneStatus.currentCoolingSetTemp;
    this.zoneSensorBattery = zoneStatus.zoneSensorBattery;

    // some zone sensor versions do not report humidity
    if (zoneStatus.currentHumidity === 'notSupported') {
      this.zoneHumiditySensor = false;
      this.currentHumidity = 0;
    } else {
      this.zoneHumiditySensor = true;
      this.currentHumidity = zoneStatus.currentHumidity;
    }
  }

  async pushStatusUpdate(zoneStatus: ZoneStatus) {
    this.zoneEnabled = zoneStatus.zoneEnabled;
    this.currentTemp = zoneStatus.currentTemp;
    this.maxHeatSetPoint = zoneStatus.maxHeatSetPoint;
    this.minHeatSetPoint = zoneStatus.minHeatSetPoint;
    this.maxCoolSetPoint = zoneStatus.maxCoolSetPoint;
    this.minCoolSetPoint = zoneStatus.minCoolSetPoint;
    this.currentHeatingSetTemp = zoneStatus.currentHeatingSetTemp;
    this.currentCoolingSetTemp = zoneStatus.currentCoolingSetTemp;
    this.zoneSensorBattery = zoneStatus.zoneSensorBattery;
    this.currentHumidity = this.zoneHumiditySensor ? zoneStatus.currentHumidity as number : 0;
  }

  async getZoneStatus() {
    const refreshState = await this.apiInterface.getStatus();
    if (refreshState.apiError) {
      this.log.warn('Failed to refresh status, Actron Que Cloud unreachable');
      return refreshState;
    }
    const targetInstance = refreshState.zoneCurrentStatus.find(zoneInstance => zoneInstance.sensorId === this.sensorId) as ZoneStatus;
    return targetInstance;
  }

  async setZoneEnable(): Promise<boolean> {
    const coolTemp = 0;
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_ENABLE, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.zoneEnabled=true;
    } else if (response === CommandResult.FAILURE) {
      await this.getZoneStatus();
      this.log.error(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.warn('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.zoneEnabled;
  }

  async setZoneDisable(): Promise<boolean> {
    const coolTemp = 0;
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_DISABLE, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.zoneEnabled=false;
    } else if (response === CommandResult.FAILURE) {
      await this.getZoneStatus();
      this.log.error(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.warn('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.zoneEnabled;
  }

  async setHeatTemp(heatTemp: number): Promise<number> {
    const coolTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_HEAT_SET_POINT, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.currentHeatingSetTemp=heatTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getZoneStatus();
      this.log.error(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.warn('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.currentHeatingSetTemp;
  }

  async setCoolTemp(coolTemp: number): Promise<number> {
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_COOL_SET_POINT, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.currentCoolingSetTemp=coolTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getZoneStatus();
      this.log.error(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.warn('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.currentCoolingSetTemp;
  }
}