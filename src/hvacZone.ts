import { validApiCommands, ZoneStatus, CommandResult } from './types';
import QueApi from './queApi';
import { Logger } from 'homebridge';

export class HvacZone {
  readonly zoneName: string;
  readonly zoneIndex: number;
  readonly sensorId: string;
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
  ) {

    this.zoneName = zoneStatus.zoneName;
    this.zoneIndex = zoneStatus.zoneIndex;
    this.sensorId = zoneStatus.sensorId;
    this.zoneEnabled = zoneStatus.zoneEnabled;
    this.currentTemp = zoneStatus.currentTemp;
    this.currentHumidity = zoneStatus.currentHumidity;
    this.maxHeatSetPoint = zoneStatus.maxHeatSetPoint;
    this.minHeatSetPoint = zoneStatus.minHeatSetPoint;
    this.maxCoolSetPoint = zoneStatus.maxCoolSetPoint;
    this.minCoolSetPoint = zoneStatus.minCoolSetPoint;
    this.currentHeatingSetTemp = zoneStatus.currentHeatingSetTemp;
    this.currentCoolingSetTemp = zoneStatus.currentCoolingSetTemp;
    this.zoneSensorBattery = zoneStatus.zoneSensorBattery;
  }

  async pushStatusUpdate(zoneStatus: ZoneStatus) {
    this.zoneEnabled = zoneStatus.zoneEnabled;
    this.currentTemp = zoneStatus.currentTemp;
    this.currentHumidity = zoneStatus.currentHumidity;
    this.maxHeatSetPoint = zoneStatus.maxHeatSetPoint;
    this.minHeatSetPoint = zoneStatus.minHeatSetPoint;
    this.maxCoolSetPoint = zoneStatus.maxCoolSetPoint;
    this.minCoolSetPoint = zoneStatus.minCoolSetPoint;
    this.currentHeatingSetTemp = zoneStatus.currentHeatingSetTemp;
    this.currentCoolingSetTemp = zoneStatus.currentCoolingSetTemp;
    this.zoneSensorBattery = zoneStatus.zoneSensorBattery;
  }

  async getZoneStatus() {
    const refreshState = await this.apiInterface.getStatus();
    if (refreshState.apiError) {
      this.log.info('Failed to refresh status, Actron Que Cloud unreachable');
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
      this.log.debug(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
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
      this.log.debug(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.zoneEnabled;
  }

  async setHeatTemp(heatTemp: number): Promise<number> {
    const coolTemp = 0;
    if (heatTemp > this.maxHeatSetPoint) {
      heatTemp = this.maxHeatSetPoint;
    } else if (heatTemp < this.minHeatSetPoint) {
      heatTemp = this.minHeatSetPoint;
    }
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_HEAT_SET_POINT, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.currentHeatingSetTemp=heatTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getZoneStatus();
      this.log.debug(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.currentHeatingSetTemp;
  }

  async setCoolTemp(coolTemp: number): Promise<number> {
    const heatTemp = 0;
    if (coolTemp > this.maxCoolSetPoint) {
      coolTemp = this.maxCoolSetPoint;
    } else if (coolTemp < this.minCoolSetPoint) {
      coolTemp = this.minCoolSetPoint;
    }
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_COOL_SET_POINT, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.currentCoolingSetTemp=heatTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getZoneStatus();
      this.log.debug(`Failed to set zone ${this.zoneIndex}, ${this.zoneName}, refreshing zone state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.currentCoolingSetTemp;
  }
}