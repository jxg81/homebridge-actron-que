import { validApiCommands, ZoneStatus, CommandResult } from './types';
import QueApi from './queApi';
import { Logger } from 'homebridge';
import { HvacUnit } from './hvac';

export class HvacZone {
  readonly zoneName: string;
  readonly zoneIndex: number;
  readonly sensorId: string;
  readonly apiInterface: QueApi;
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
        readonly masterController: HvacUnit,
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
    this.apiInterface = this.masterController.apiInterface;
  }

  async updateStatus(zoneStatus: ZoneStatus) {
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

  async setZoneEnable(): Promise<boolean> {
    const coolTemp = 0;
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_ENABLE, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.zoneEnabled=true;
    } else {
      await this.apiInterface.getStatus();
    }
    return this.zoneEnabled;
  }

  async setZoneDisable(): Promise<boolean> {
    const coolTemp = 0;
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_DISABLE, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.zoneEnabled=false;
    } else {
      await this.apiInterface.getStatus();
    }
    return this.zoneEnabled;
  }

  async setHeatTemp(heatTemp: number): Promise<number> {
    const coolTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_HEAT_SET_POINT, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.currentHeatingSetTemp=heatTemp;
    } else {
      await this.apiInterface.getStatus();
    }
    return this.currentHeatingSetTemp;
  }

  async setCoolTemp(coolTemp: number): Promise<number> {
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.ZONE_COOL_SET_POINT, coolTemp, heatTemp, this.zoneIndex);
    if (response === CommandResult.SUCCESS) {
      this.currentCoolingSetTemp=heatTemp;
    } else {
      await this.apiInterface.getStatus();
    }
    return this.currentCoolingSetTemp;
  }
}