import { Service, PlatformAccessory, CharacteristicValue, HAPStatus } from 'homebridge';
import { ClimateMode, CompressorMode, FanMode, PowerState } from './types';
import { ActronQuePlatform } from './platform';

// This class represents the master controller, a seperate class is used for representing zones (or will be once i write it)
export class MasterControllerAccessory {
  private hvacService: Service;
  private humidityService: Service;

  constructor(
    private readonly platform: ActronQuePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Actron')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.hvacInstance.type + ' Master Controller')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.hvacInstance.serialNo);

    // Get or create the heater cooler service.
    this.hvacService = this.accessory.getService(this.platform.Service.HeaterCooler)
    || this.accessory.addService(this.platform.Service.HeaterCooler);

    // Get or create the humidity sensor service.
    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
    || this.accessory.addService(this.platform.Service.HumiditySensor);

    // Set accesory display name, this is taken from discover devices in platform
    this.hvacService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    // get humidity
    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));

    // register handlers for device control, references the class methods that follow for Set and Get
    this.hvacService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setPowerState.bind(this))
      .onGet(this.getPowerState.bind(this));

    this.hvacService.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentCompressorMode.bind(this));

    this.hvacService.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(this.getTargetClimateMode.bind(this))
      .onSet(this.setTargetClimateMode.bind(this));

    this.hvacService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    // The min/max values here are based on the hardcoded data taken from my unit
    this.hvacService.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: 10,
        maxValue: 26,
        minStep: 0.5,
      })
      .onGet(this.getHeatingThresholdTemperature.bind(this))
      .onSet(this.setHeatingThresholdTemperature.bind(this));

    // The min/max values here are based on the hardcoded data taken from my unit
    this.hvacService.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: 20,
        maxValue: 32,
        minStep: 0.5,
      })
      .onGet(this.getCoolingThresholdTemperature.bind(this))
      .onSet(this.setCoolingThresholdTemperature.bind(this));

    // This currently does not allow for continous fan mode at any of the speed options.
    // Setting fan mode to 0 seems to automatically trigger a power off (even though i dont request that)
    // having some trouble with range of 0-4, cant seem to set slider to 4, only gets to 3
    // need to revisit this
    this.hvacService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setFanMode.bind(this))
      .onGet(this.getFanMode.bind(this));

    // Set the refresh interval for continous device characteristic updates. Hardcoded to 1min here, I should make this a config option
    setInterval(() => this.hardUpdateDeviceCharacteristics(), this.platform.hardRefreshInterval);
    setInterval(() => this.softUpdateDeviceCharacteristics(), this.platform.softRefreshInterval);
  }

  // SET's are async as these need to wait on API response then cache the return value on the hvac Class instance
  // GET's run non async as this is a quick retrival from the hvac class insatnce cache
  // UPDATE is run Async as this polls the API first to confirm current cache state is accurate
  async hardUpdateDeviceCharacteristics() {
    const currentStatus = await this.platform.hvacInstance.getStatus();
    this.softUpdateDeviceCharacteristics();
    if (currentStatus.apiError) {
      this.platform.log.info('Actron Que cloud error, refreshing HomeKit accessory state using cached data');
    } else if (!currentStatus.cloudConnected) {
      this.platform.log.error(`Master Controller is offline. Check Master Controller Internet/Wifi connection.\n
      Refreshing HomeKit accessory state using cached data`);
    } else {
      this.platform.log.debug('Succesfully refreshed HomeKit accessory state from Que cloud\n');
    }
  }

  async softUpdateDeviceCharacteristics() {
    this.hvacService.updateCharacteristic(this.platform.Characteristic.Active, this.getPowerState());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, this.getCurrentCompressorMode());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, this.getTargetClimateMode());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.getCurrentTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, this.getHeatingThresholdTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature, this.getCoolingThresholdTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.getFanMode());
    this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.getHumidity());
  }

  checkHvacComms() {
    if (!this.platform.hvacInstance.cloudConnected) {
      this.platform.log.error('Master Controller is offline. Check Master Controller Internet/Wifi connection');
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getHumidity(): CharacteristicValue {
    const currentHumidity = this.platform.hvacInstance.masterHumidity;
    // this.platform.log.debug('Got Master Humidity -> ', currentHumidity);
    return currentHumidity;
  }

  async setPowerState(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (value) {
      case 0:
        await this.platform.hvacInstance.setPowerStateOff();
        break;
      case 1:
        await this.platform.hvacInstance.setPowerStateOn();
        break;
    }
    this.platform.log.debug('Set Master Power State -> ', value);
  }

  getPowerState(): CharacteristicValue {
    const powerState = (this.platform.hvacInstance.powerState === PowerState.ON) ? 1 : 0;
    // this.platform.log.debug('Got Master Power State -> ', powerState);
    return powerState;
  }

  getCurrentCompressorMode(): CharacteristicValue {
    let currentMode: number;
    const compressorMode = this.platform.hvacInstance.compressorMode;
    switch (compressorMode) {
      case CompressorMode.OFF:
        currentMode = 0;
        break;
      case CompressorMode.HEAT:
        currentMode = 2;
        break;
      case CompressorMode.COOL:
        currentMode = 3;
        break;
      default:
        currentMode = 0;
        this.platform.log.debug('Failed To Get Master Valid Compressor Mode -> ', compressorMode);
    }
    // if the fan is not running then update state to idle
    if (!this.platform.hvacInstance.fanRunning) {
      currentMode = 1;
    }
    // this.platform.log.debug('Got Master Compressor Mode -> ', compressorMode);
    return currentMode;
  }

  async setTargetClimateMode(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (value) {
      case this.platform.Characteristic.TargetHeaterCoolerState.AUTO:
        await this.platform.hvacInstance.setClimateModeAuto();
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        await this.platform.hvacInstance.setClimateModeHeat();
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.COOL:
        await this.platform.hvacInstance.setClimateModeCool();
        break;
      default:
        this.platform.log.debug('Failed To Set Master Climate Mode -> ', value);
    }
    this.platform.log.debug('Set Master Climate Mode -> ', value);
  }

  getTargetClimateMode(): CharacteristicValue {
    let currentMode: number;
    const climateMode = this.platform.hvacInstance.climateMode;
    switch (climateMode) {
      case ClimateMode.AUTO:
        currentMode = this.platform.Characteristic.TargetHeaterCoolerState.AUTO;
        break;
      case ClimateMode.HEAT:
        currentMode = this.platform.Characteristic.TargetHeaterCoolerState.HEAT;
        break;
      case ClimateMode.COOL:
        currentMode = this.platform.Characteristic.TargetHeaterCoolerState.COOL;
        break;
      default:
        currentMode = 0;
        this.platform.log.debug('Failed To Get Master Target Climate Mode -> ', climateMode);
    }
    // this.platform.log.debug('Got Master Target Climate Mode -> ', climateMode);
    return currentMode;
  }

  getCurrentTemperature(): CharacteristicValue {
    const currentTemp = this.platform.hvacInstance.masterCurrentTemp;
    // this.platform.log.debug('Got Master Current Indoor Temperature -> ', currentTemp);
    return currentTemp;
  }

  async setHeatingThresholdTemperature(value: CharacteristicValue) {
    this.checkHvacComms();
    if (this.platform.hvacInstance.controlAllZones === false &&
      this.platform.hvacInstance.zonesFollowMaster === true) {
      await this.platform.hvacInstance.setControlAllZonesOn();
    }
    await this.platform.hvacInstance.setHeatTemp(value as number);
    await this.platform.hvacInstance.getStatus();
    this.platform.log.debug('Set Master Target Heating Temperature -> ', value);
  }

  getHeatingThresholdTemperature(): CharacteristicValue {
    const targetTemp = this.platform.hvacInstance.masterHeatingSetTemp;
    // this.platform.log.debug('Got Master Target Heating Temerature -> ', targetTemp);
    return targetTemp;
  }

  async setCoolingThresholdTemperature(value: CharacteristicValue) {
    this.checkHvacComms();
    if (this.platform.hvacInstance.controlAllZones === false &&
      this.platform.hvacInstance.zonesFollowMaster === true) {
      await this.platform.hvacInstance.setControlAllZonesOn();
    }
    await this.platform.hvacInstance.setCoolTemp(value as number);
    await this.platform.hvacInstance.getStatus();
    this.platform.log.debug('Set Master Target Cooling Temperature -> ', value);
  }

  getCoolingThresholdTemperature(): CharacteristicValue {
    const targetTemp = this.platform.hvacInstance.masterCoolingSetTemp;
    // this.platform.log.debug('Got Master Target Cooling Temperature -> ', targetTemp);
    return targetTemp;
  }

  async setFanMode(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (true) {
      case (value <= 30):
        await this.platform.hvacInstance.setFanModeLow();
        break;
      case (value <= 60):
        await this.platform.hvacInstance.setFanModeMedium();
        break;
      case (value <= 90):
        await this.platform.hvacInstance.setFanModeHigh();
        break;
      case (value <= 100):
        await this.platform.hvacInstance.setFanModeAuto();
        break;
    }
    this.platform.log.debug('Set Master Fan Mode 91-100:Auto, 1-30:Low, 31-60:Medium, 61-90:High -> ', value);
  }

  getFanMode(): CharacteristicValue {
    let currentMode: number;
    const fanMode = this.platform.hvacInstance.fanMode;
    switch (fanMode) {
      case FanMode.AUTO || FanMode.AUTO_CONT:
        currentMode = 100;
        break;
      case FanMode.LOW || FanMode.LOW_CONT:
        currentMode = 29;
        break;
      case FanMode.MEDIUM || FanMode.MEDIUM_CONT:
        currentMode = 59;
        break;
      case FanMode.HIGH || FanMode.HIGH_CONT:
        currentMode = 89;
        break;
      default:
        currentMode = 0;
        this.platform.log.debug('Failed To Get Master Current Fan Mode -> ', fanMode);
    }
    // this.platform.log.debug('Got Master Current Fan Mode -> ', fanMode);
    return currentMode;
  }
}