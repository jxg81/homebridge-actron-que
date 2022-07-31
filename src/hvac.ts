import QueApi from './queApi';
import { PowerState, FanMode, ClimateMode, CompressorMode, validApiCommands, ZoneStatus, HvacStatus, CommandResult } from './types';
import { Logger } from 'homebridge';
import { HvacZone } from './hvacZone';

export class HvacUnit {

  readonly name: string;
  type = '';
  serialNo = '';
  apiInterface!: QueApi;

  powerState: PowerState = PowerState.UNKNOWN;
  climateMode: ClimateMode = ClimateMode.UNKNOWN;
  fanMode: FanMode = FanMode.UNKNOWN;
  compressorMode: CompressorMode = CompressorMode.UNKNOWN;
  awayMode = false;
  quietMode = false;
  controlAllZones = false;
  masterCoolingSetTemp = 0;
  masterHeatingSetTemp = 0;
  masterCurrentTemp = 0;
  masterHumidity = 0;
  compressorChasingTemp = 0;
  compressorCurrentTemp = 0;
  outdoorTemp = 0;
  zoneData: ZoneStatus[] = [];
  zoneInstances: HvacZone[] = [];

  constructor(name: string, private readonly log: Logger, readonly zonesFollowMaster = true, readonly zonesPushMaster = true) {
    this.name = name;
  }

  async actronQueApi(username: string, password: string, serialNo = '') {
    this.type = 'actronQue';
    this.apiInterface = new QueApi(username, password, this.name, this.log, serialNo);
    await this.apiInterface.initalizer();
    if (this.apiInterface.actronSerial) {
      this.serialNo = this.apiInterface.actronSerial;
    } else {
      throw Error('Failed to locate device serial number. Please check your config file');
    }
    return this.serialNo;
  }

  async getStatus(): Promise<HvacStatus> {
    const status = await this.apiInterface.getStatus();

    if (status.apiError) {
      this.log.info('Failed to refresh status, Actron Que Cloud unreachable');
      return status;
    }

    this.powerState = (status.powerState === undefined) ? this.powerState : status.powerState;
    this.climateMode = (status.climateMode === undefined) ? this.climateMode : status.climateMode;
    this.compressorMode = (status.compressorMode === undefined) ? this.compressorMode : status.compressorMode;
    this.fanMode = (status.fanMode === undefined) ? this.fanMode : status.fanMode;
    this.masterCoolingSetTemp = (status.masterCoolingSetTemp === undefined) ? this.masterCoolingSetTemp : status.masterCoolingSetTemp;
    this.masterHeatingSetTemp = (status.masterHeatingSetTemp === undefined) ? this.masterHeatingSetTemp : status.masterHeatingSetTemp ;
    this.compressorChasingTemp = (status.compressorChasingTemp === undefined) ? this.compressorChasingTemp : status.compressorChasingTemp;
    this.compressorCurrentTemp = (status.compressorCurrentTemp === undefined) ? this.compressorCurrentTemp : status.compressorCurrentTemp;
    this.awayMode = (status.awayMode === undefined) ? this.awayMode : status.awayMode;
    this.quietMode = (status.quietMode === undefined) ? this.quietMode : status.quietMode;
    this.controlAllZones = (status.controlAllZones === undefined) ? this.controlAllZones : status.controlAllZones;
    this.outdoorTemp = (status.outdoorTemp === undefined) ? this.outdoorTemp : status.outdoorTemp ;
    this.masterCurrentTemp = (status.masterCurrentTemp === undefined) ? this.masterCurrentTemp : status.masterCurrentTemp;
    this.masterHumidity = (status.masterCurrentHumidity === undefined) ? this.masterHumidity : status.masterCurrentHumidity;
    this.zoneData = (status.zoneCurrentStatus === undefined) ? this.zoneData : status.zoneCurrentStatus;

    // logic here is compare zoneData with zoneInstances.
    // if a zone DOES exist in zoneInstance for corresponding zoneData then run .updateStatus on the instance with the data
    // if a zone DOES NOT exist in zoneInstance for corresponding zoneData entry then create the zoneInstance
    for (const zone of this.zoneData) {
      const targetInstance = this.zoneInstances.find(zoneInstance => zoneInstance.sensorId === zone.sensorId);
      if (targetInstance) {
        targetInstance.pushStatusUpdate(zone);
      } else {
        this.zoneInstances.push(new HvacZone(this.log, this.apiInterface, zone));
      }
    }
    return status;
  }

  async setPowerStateOn(): Promise<PowerState> {
    if (this.powerState === PowerState.UNKNOWN) {
      await this.getStatus();
    }
    if (this.powerState === PowerState.ON) {
      return PowerState.ON;
    } else {
      const response = await this.apiInterface.runCommand(validApiCommands.ON);
      if (response === CommandResult.SUCCESS) {
        this.powerState=PowerState.ON;
      } else if (response === CommandResult.FAILURE) {
        await this.getStatus();
        this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
      } else {
        this.log.info('Failed to send command, Actron Que Cloud unreachable');
      }
    }
    return this.powerState;
  }

  async setPowerStateOff(): Promise<PowerState> {
    if (this.powerState === PowerState.UNKNOWN) {
      await this.getStatus();
    }
    if (this.powerState === PowerState.OFF) {
      return PowerState.OFF;
    } else {
      const response = await this.apiInterface.runCommand(validApiCommands.OFF);
      if (response === CommandResult.SUCCESS) {
        this.powerState=PowerState.OFF;
      } else if (response === CommandResult.FAILURE) {
        await this.getStatus();
        this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
      } else {
        this.log.info('Failed to send command, Actron Que Cloud unreachable');
      }
    }
    return this.powerState;
  }

  async setHeatTemp(heatTemp: number): Promise<number> {
    const coolTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.HEAT_SET_POINT, coolTemp, heatTemp);
    if (response === CommandResult.SUCCESS) {
      this.masterHeatingSetTemp=heatTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.masterHeatingSetTemp;
  }

  async setCoolTemp(coolTemp: number): Promise<number> {
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.COOL_SET_POINT, coolTemp, heatTemp);
    if (response === CommandResult.SUCCESS) {
      this.masterCoolingSetTemp=coolTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.masterCoolingSetTemp;
  }


  async setHeatCoolTemp(coolTemp: number, heatTemp: number): Promise<number[]> {
    const response = await this.apiInterface.runCommand(validApiCommands.HEAT_COOL_SET_POINT, coolTemp, heatTemp);
    if (response === CommandResult.SUCCESS) {
      this.masterCoolingSetTemp=coolTemp;
      this.masterHeatingSetTemp=heatTemp;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return [this.masterCoolingSetTemp, this.masterHeatingSetTemp=heatTemp];
  }

  async setClimateModeAuto(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_AUTO);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.AUTO;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.climateMode;
  }

  async setClimateModeCool(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_COOL);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.COOL;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.climateMode;
  }

  async setClimateModeHeat(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_HEAT);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.HEAT;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.climateMode;
  }

  async setClimateModeFan(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_FAN);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.FAN;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.climateMode;
  }

  async setFanModeAuto(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_AUTO);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.AUTO;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.fanMode;
  }

  async setFanModeLow(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_LOW);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.LOW;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.fanMode;
  }

  async setFanModeMedium(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_MEDIUM);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.MEDIUM;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.fanMode;
  }

  async setFanModeHigh(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_HIGH);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.HIGH;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.fanMode;
  }

  async setAwayModeOn(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.AWAY_MODE_ON);
    if (response === CommandResult.SUCCESS) {
      this.awayMode=true;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.awayMode;
  }

  async setAwayModeOff(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.AWAY_MODE_OFF);
    if (response === CommandResult.SUCCESS) {
      this.awayMode=false;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.awayMode;
  }

  async setQuietModeOn(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.QUIET_MODE_ON);
    if (response === CommandResult.SUCCESS) {
      this.quietMode=true;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.quietMode;
  }

  async setQuietModeOff(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.QUIET_MODE_OFF);
    if (response === CommandResult.SUCCESS) {
      this.quietMode=false;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.quietMode;
  }

  async setControlAllZonesOn(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.CONTROL_ALL_ZONES_ON);
    if (response === CommandResult.SUCCESS) {
      this.controlAllZones=true;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.controlAllZones;
  }

  async setControlAllZonesOff(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.CONTROL_ALL_ZONES_OFF);
    if (response === CommandResult.SUCCESS) {
      this.controlAllZones=false;
    } else if (response === CommandResult.FAILURE) {
      await this.getStatus();
      this.log.error(`Failed to set master ${this.name}, refreshing master state from API`);
    } else {
      this.log.info('Failed to send command, Actron Que Cloud unreachable');
    }
    return this.controlAllZones;
  }
}