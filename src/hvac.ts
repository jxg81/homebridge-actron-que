import QueApi from './queApi';
import { PowerState, FanMode, ClimateMode, CompressorMode, validApiCommands, ZoneStatus, HvacStatus, CommandResult } from './types';
import { Logger } from 'homebridge';

export class HvacUnit {

  private readonly name: string;
  type = '';
  serialNo = '';
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

  constructor(name: string, private readonly log: Logger) {
    this.name = name;
  }

  async actronQueApi(username: string, password: string, serialNo = '') {
    this.type = 'actronQue';
    this.apiInterface = new QueApi(username, password, this.name, this.log, serialNo);
    await this.apiInterface.initalizer();
    this.serialNo = this.apiInterface.actronSerial;
    return this.serialNo;
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
      } else {
        await this.getStatus();
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
      } else {
        await this.getStatus();
      }
    }
    return this.powerState;
  }

  async setHeatTemp(heatTemp: number): Promise<number> {
    const coolTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.HEAT_SET_POINT, coolTemp, heatTemp);
    if (response === CommandResult.SUCCESS) {
      this.masterHeatingSetTemp=heatTemp;
    } else {
      await this.getStatus();
    }
    return this.masterHeatingSetTemp;
  }

  async setCoolTemp(coolTemp: number): Promise<number> {
    const heatTemp = 0;
    const response = await this.apiInterface.runCommand(validApiCommands.COOL_SET_POINT, coolTemp, heatTemp);
    if (response === CommandResult.SUCCESS) {
      this.masterCoolingSetTemp=coolTemp;
    } else {
      await this.getStatus();
    }
    return this.masterCoolingSetTemp;
  }


  async setHeatCoolTemp(coolTemp: number, heatTemp: number): Promise<number[]> {
    const response = await this.apiInterface.runCommand(validApiCommands.HEAT_COOL_SET_POINT, coolTemp, heatTemp);
    if (response === CommandResult.SUCCESS) {
      this.masterCoolingSetTemp=coolTemp;
      this.masterHeatingSetTemp=heatTemp;
    } else {
      await this.getStatus();
    }
    return [this.masterCoolingSetTemp, this.masterHeatingSetTemp=heatTemp];
  }

  async setClimateModeAuto(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_AUTO);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.AUTO;
    } else {
      await this.getStatus();
    }
    return this.climateMode;
  }

  async setClimateModeCool(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_COOL);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.COOL;
    } else {
      await this.getStatus();
    }
    return this.climateMode;
  }

  async setClimateModeHeat(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_HEAT);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.HEAT;
    } else {
      await this.getStatus();
    }
    return this.climateMode;
  }

  async setClimateModeFan(): Promise<ClimateMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.CLIMATE_MODE_FAN);
    if (response === CommandResult.SUCCESS) {
      this.climateMode=ClimateMode.FAN;
    } else {
      await this.getStatus();
    }
    return this.climateMode;
  }

  async setFanModeAuto(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_AUTO);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.AUTO;
    } else {
      await this.getStatus();
    }
    return this.fanMode;
  }

  async setFanModeLow(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_LOW);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.LOW;
    } else {
      await this.getStatus();
    }
    return this.fanMode;
  }

  async setFanModeMedium(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_MEDIUM);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.MEDIUM;
    } else {
      await this.getStatus();
    }
    return this.fanMode;
  }

  async setFanModeHigh(): Promise<FanMode> {
    const response = await this.apiInterface.runCommand(validApiCommands.FAN_MODE_HIGH);
    if (response === CommandResult.SUCCESS) {
      this.fanMode=FanMode.HIGH;
    } else {
      await this.getStatus();
    }
    return this.fanMode;
  }

  async setAwayModeOn(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.AWAY_MODE_ON);
    if (response === CommandResult.SUCCESS) {
      this.awayMode=true;
    } else {
      await this.getStatus();
    }
    return this.awayMode;
  }

  async setAwayModeOff(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.AWAY_MODE_OFF);
    if (response === CommandResult.SUCCESS) {
      this.awayMode=false;
    } else {
      await this.getStatus();
    }
    return this.awayMode;
  }

  async setQuietModeOn(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.QUIET_MODE_ON);
    if (response === CommandResult.SUCCESS) {
      this.quietMode=true;
    } else {
      await this.getStatus();
    }
    return this.quietMode;
  }

  async setQuietModeOff(): Promise<boolean> {
    const response = await this.apiInterface.runCommand(validApiCommands.QUIET_MODE_OFF);
    if (response === CommandResult.SUCCESS) {
      this.quietMode=false;
    } else {
      await this.getStatus();
    }
    return this.quietMode;
  }
}