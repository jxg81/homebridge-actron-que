import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ClimateMode, CompressorMode } from './types';
import { ActronQuePlatform } from './platform';
import { HvacZone } from './hvacZone';

// This class represents the master controller, a seperate class is used for representing zones (or will be once i write it)
export class ZoneControllerAccessory {
  private hvacService: Service;
  private humidityService: Service;
  private batteryService: Service;

  constructor(
    private readonly platform: ActronQuePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly zone: HvacZone,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Actron')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.hvacInstance.type + ' Zone Controller')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.zone.sensorId);

    // Get or create the heater cooler service.
    this.hvacService = this.accessory.getService(this.platform.Service.HeaterCooler)
    || this.accessory.addService(this.platform.Service.HeaterCooler);

    // Get or create the humidity sensor service.
    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
    || this.accessory.addService(this.platform.Service.HumiditySensor);

    // Get or create the humidity sensor service.
    this.batteryService = this.accessory.getService(this.platform.Service.Battery)
    || this.accessory.addService(this.platform.Service.Battery);

    // Set accesory display name, this is taken from discover devices in platform
    this.hvacService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    // get humidity
    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));

    // get battery low
    this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getBatteryStatus.bind(this));

    this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this));

    // register handlers for device control, references the class methods that follow for Set and Get
    this.hvacService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setEnableState.bind(this))
      .onGet(this.getEnableState.bind(this));

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

    setInterval(() => this.updateAllDeviceCharacteristics(), this.platform.refreshInterval);

  }

  // SET's are async as these need to wait on API response then cache the return value on the hvac Class instance
  // GET's run non async as this is a quick retrival from the hvac class insatnce cache
  // UPDATE is run Async as this polls the API first to confirm current cache state is accurate
  async updateAllDeviceCharacteristics() {
    this.hvacService.updateCharacteristic(this.platform.Characteristic.Active, this.getEnableState());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, this.getCurrentCompressorMode());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, this.getTargetClimateMode());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.getCurrentTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, this.getHeatingThresholdTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature, this.getCoolingThresholdTemperature());
    this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.getHumidity());
    this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this.getBatteryStatus());
    this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.getBatteryLevel());
  }

  getHumidity(): CharacteristicValue {
    const currentHumidity = this.zone.currentHumidity;
    this.platform.log.debug('Got Humidity -> ', currentHumidity);
    return currentHumidity;
  }

  getBatteryStatus(): CharacteristicValue {
    const currentBattery = this.zone.zoneSensorBattery;
    const batteryState = (currentBattery < 10) ? 1 : 0;
    this.platform.log.debug('Got Battery Status -> ', batteryState);
    return batteryState;
  }

  getBatteryLevel(): CharacteristicValue {
    const currentBattery = this.zone.zoneSensorBattery;
    this.platform.log.debug('Got Battery Level -> ', currentBattery);
    return currentBattery;
  }

  async setEnableState(value: CharacteristicValue) {
    switch (value) {
      case 0:
        this.zone.setZoneDisable();
        break;
      case 1:
        this.zone.setZoneEnable();
        break;
    }
    this.platform.log.debug('Set Zone Enable State -> ', value);
  }

  getEnableState(): CharacteristicValue {
    const enableState = (this.zone.zoneEnabled === true) ? 1 : 0;
    this.platform.log.debug('Got Zone Enable State -> ', enableState);
    return enableState;
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
        this.platform.log.debug('Failed to get a valid compressor mode -> ', compressorMode);
    }
    this.platform.log.debug('Got current compressor mode -> ', compressorMode);
    return currentMode;
  }

  async setTargetClimateMode(value: CharacteristicValue) {
    switch (value) {
      case this.platform.Characteristic.TargetHeaterCoolerState.AUTO:
        this.platform.hvacInstance.setClimateModeAuto();
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        this.platform.hvacInstance.setClimateModeHeat();
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.COOL:
        this.platform.hvacInstance.setClimateModeCool();
        break;
      default:
        this.platform.log.debug('Failed to set climate mode -> ', value);
    }
    this.platform.log.debug('Set climate mode -> ', value);
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
        this.platform.log.debug('Failed to get target climate mode -> ', climateMode);
    }
    this.platform.log.debug('Got target climate mode -> ', climateMode);
    return currentMode;
  }

  getCurrentTemperature(): CharacteristicValue {
    const currentTemp = this.zone.currentTemp;
    this.platform.log.debug('Got current zone temperature -> ', currentTemp);
    return currentTemp;
  }

  async setHeatingThresholdTemperature(value: CharacteristicValue) {
    this.zone.setHeatTemp(value as number);
    this.platform.log.debug('Set zone target heating temperature -> ', value);
  }

  getHeatingThresholdTemperature(): CharacteristicValue {
    const targetTemp = this.zone.currentHeatingSetTemp;
    this.platform.log.debug('Got zone target heating temerature -> ', targetTemp);
    return targetTemp;
  }

  async setCoolingThresholdTemperature(value: CharacteristicValue) {
    this.zone.setCoolTemp(value as number);
    this.platform.log.debug('Set zone taget cooling temperature -> ', value);
  }

  getCoolingThresholdTemperature(): CharacteristicValue {
    const targetTemp = this.zone.currentCoolingSetTemp;
    this.platform.log.debug('Got zone target cooling temperature -> ', targetTemp);
    return targetTemp;
  }
}