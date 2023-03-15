import { Service, PlatformAccessory, CharacteristicValue, HAPStatus } from 'homebridge';
import { ClimateMode, CompressorMode } from './types';
import { ActronQuePlatform } from './platform';
import { HvacZone } from './hvacZone';

// This class represents the master controller, a separate class is used for representing zones (or will be once i write it)
export class ZoneControllerAccessory {
  private hvacService: Service;
  // some versions of the zone sensor do not support humidity
  private humidityService: Service | null;
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

    // Set accessory display name, this is taken from discover devices in platform
    this.hvacService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    // Get or create the humidity sensor service.
    this.batteryService = this.accessory.getService(this.platform.Service.Battery)
    || this.accessory.addService(this.platform.Service.Battery);

    // Get or create the humidity sensor service if the zone sensor supports humidity readings
    if (this.zone.zoneHumiditySensor) {
      this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
          || this.accessory.addService(this.platform.Service.HumiditySensor);
      // get humidity
      this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.getHumidity.bind(this));
    } else {
      this.humidityService = null;
    }

    // get battery low
    this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getBatteryStatus.bind(this));

    // get battery level
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
        minValue: this.platform.minHeatingTemp,
        maxValue: this.platform.maxHeatingTemp,
        minStep: 0.5,
      })
      .onGet(this.getHeatingThresholdTemperature.bind(this))
      .onSet(this.setHeatingThresholdTemperature.bind(this));

    // The min/max values here are based on the hardcoded data taken from my unit
    this.hvacService.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: this.platform.minCoolingTemp,
        maxValue: this.platform.maxCoolingTemp,
        minStep: 0.5,
      })
      .onGet(this.getCoolingThresholdTemperature.bind(this))
      .onSet(this.setCoolingThresholdTemperature.bind(this));

    setInterval(() => this.softUpdateDeviceCharacteristics(), this.platform.softRefreshInterval);

  }

  // SET's are async as these need to wait on API response then cache the return value on the hvac Class instance
  // GET's run non async as this is a quick retrieval from the hvac class instance cache
  // UPDATE is run Async as this polls the API first to confirm current cache state is accurate
  async softUpdateDeviceCharacteristics() {
    this.hvacService.updateCharacteristic(this.platform.Characteristic.Active, this.getEnableState());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState, this.getCurrentCompressorMode());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, this.getTargetClimateMode());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.getCurrentTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, this.getHeatingThresholdTemperature());
    this.hvacService.updateCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature, this.getCoolingThresholdTemperature());
    this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this.getBatteryStatus());
    this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.getBatteryLevel());

    if (this.humidityService) {
      this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.getHumidity());
    }
  }

  checkHvacComms() {
    if (!this.platform.hvacInstance.cloudConnected) {
      this.platform.log.error('Master Controller is offline. Check Master Controller Internet/Wifi connection');
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getHumidity(): CharacteristicValue {
    const currentHumidity = this.zone.currentHumidity;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Humidity -> `, currentHumidity);
    return currentHumidity;
  }

  getBatteryStatus(): CharacteristicValue {
    const currentBattery = this.zone.zoneSensorBattery;
    const batteryState = (currentBattery < 10) ? 1 : 0;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Battery Status -> `, batteryState);
    return batteryState;
  }

  getBatteryLevel(): CharacteristicValue {
    const currentBattery = this.zone.zoneSensorBattery;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Battery Level -> `, currentBattery);
    return currentBattery;
  }

  async setEnableState(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (value) {
      case 0:
        await this.zone.setZoneDisable();
        break;
      case 1:
        await this.zone.setZoneEnable();
        break;
    }
    this.platform.log.debug(`Set Zone ${this.zone.zoneName} Enable State -> `, value);
  }

  getEnableState(): CharacteristicValue {
    const enableState = (this.zone.zoneEnabled === true) ? 1 : 0;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Enable State -> `, enableState);
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
        this.platform.log.debug('Failed To Get a Valid Compressor Mode -> ', compressorMode);
    }
    // if the fan is not running then update state to idle
    if (!this.platform.hvacInstance.fanRunning) {
      currentMode = 1;
    }
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} current compressor mode -> `, compressorMode);
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
    }
    this.platform.log.debug(`Set Zone ${this.zone.zoneName} Climate Mode -> `, value);
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
        this.platform.log.debug('Failed To Get Target Climate Mode -> ', climateMode);
    }
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Target Climate Mode -> `, climateMode);
    return currentMode;
  }

  getCurrentTemperature(): CharacteristicValue {
    const currentTemp = this.zone.currentTemp;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Current Temperature -> `, currentTemp);
    return currentTemp;
  }

  async setHeatingThresholdTemperature(value: CharacteristicValue) {
    this.checkHvacComms();
    if (this.platform.hvacInstance.zonesPushMaster === true) {
      if (value > this.zone.maxHeatSetPoint) {
        await this.platform.hvacInstance.setHeatTemp(value as number);
        await this.platform.hvacInstance.getStatus();
      } else if (value < this.zone.minHeatSetPoint) {
        await this.platform.hvacInstance.setHeatTemp(value as number + 2);
        await this.platform.hvacInstance.getStatus();
      }
    }
    if (value > this.zone.maxHeatSetPoint) {
      value = this.zone.maxHeatSetPoint;
    } else if (value < this.zone.minHeatSetPoint) {
      value = this.zone.minHeatSetPoint;
    }
    await this.zone.setHeatTemp(value as number);
    this.platform.log.debug(`Set Zone ${this.zone.zoneName} Target Heating Temperature -> `, value);
  }

  getHeatingThresholdTemperature(): CharacteristicValue {
    const targetTemp = this.zone.currentHeatingSetTemp;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Target Heating Temperature -> `, targetTemp);
    return targetTemp;
  }

  async setCoolingThresholdTemperature(value: CharacteristicValue) {
    this.checkHvacComms();
    if (this.platform.hvacInstance.zonesPushMaster === true) {
      this.platform.log.debug('zones push master is set to True');
      if (value > this.zone.maxCoolSetPoint) {
        await this.platform.hvacInstance.setCoolTemp(value as number - 2);
        this.platform.log.debug(`Value is greater than MAX cool set point of ${this.zone.maxCoolSetPoint}, SETTING MASTER TO -> `, value);
        await this.platform.hvacInstance.getStatus();
      } else if (value < this.zone.minCoolSetPoint) {
        await this.platform.hvacInstance.setCoolTemp(value as number);
        this.platform.log.debug(`Value is less than MIN cool set point of ${this.zone.minCoolSetPoint}, SETTING MASTER TO -> `, value);
        await this.platform.hvacInstance.getStatus();
      }
    }
    if (value > this.zone.maxCoolSetPoint) {
      value = this.zone.maxCoolSetPoint;
      this.platform.log.debug(`Value is greater than max cool set point of ${this.zone.maxCoolSetPoint}, CHANGING TO -> `, value);
    } else if (value < this.zone.minCoolSetPoint) {
      value = this.zone.minCoolSetPoint;
      this.platform.log.debug(`Value is less than MIN cool set point of ${this.zone.minCoolSetPoint}, CHANGING TO -> `, value);

    }
    await this.zone.setCoolTemp(value as number);
    this.platform.log.debug(`Set Zone ${this.zone.zoneName} Target Cooling Temperature -> `, value);
  }

  getCoolingThresholdTemperature(): CharacteristicValue {
    const targetTemp = this.zone.currentCoolingSetTemp;
    // this.platform.log.debug(`Got Zone ${this.zone.zoneName} Target Cooling Temperature -> `, targetTemp);
    return targetTemp;
  }
}