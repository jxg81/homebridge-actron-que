import { Service, PlatformAccessory, CharacteristicValue, HAPStatus } from 'homebridge';
import { ClimateMode, FanMode, PowerState } from './types';
import { ActronQuePlatform } from './platform';

// This class represents the master controller
export class FanOnlyMasterAccessory {
  private fanService: Service;

  constructor(
    private readonly platform: ActronQuePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Actron')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.hvacInstance.type + ' FanOnlyMaster')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.hvacInstance.serialNo);

    // Get or create the fan service.
    this.fanService = this.accessory.getService(this.platform.Service.Fanv2)
    || this.accessory.addService(this.platform.Service.Fanv2);

    // Set accessory display name, this is taken from discover devices in platform
    this.fanService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    // register handlers for device control, references the class methods that follow for Set and Get
    this.fanService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setPowerState.bind(this))
      .onGet(this.getPowerState.bind(this));

    this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setFanMode.bind(this))
      .onGet(this.getFanMode.bind(this));

    setInterval(() => this.softUpdateDeviceCharacteristics(), this.platform.softRefreshInterval);

  }

  // SET's are async as these need to wait on API response then cache the return value on the hvac Class instance
  // GET's run non async as this is a quick retrieval from the hvac class instance cache
  // UPDATE is run Async as this polls the API first to confirm current cache state is accurate
  async softUpdateDeviceCharacteristics() {
    this.fanService.updateCharacteristic(this.platform.Characteristic.Active, this.getPowerState());
    this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.getFanMode());
  }

  checkHvacComms() {
    if (!this.platform.hvacInstance.cloudConnected) {
      this.platform.log.error('Master Controller is offline. Check Master Controller Internet/Wifi connection');
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async setPowerState(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (value) {
      case 0:
        await this.platform.hvacInstance.setPowerStateOff();
        break;
      case 1:
        await this.platform.hvacInstance.setPowerStateOn();
        await this.platform.hvacInstance.setClimateModeFan();
        break;
    }
    this.platform.log.debug('Set FanOnlyMaster Power State -> ', value);
  }

  getPowerState(): CharacteristicValue {
    // Check climate mode, if it is any value other than FAN then we are not in fan-only mode
    // If it is FAN then we need to check if the system is powered on
    let powerState: number;
    const climateMode = this.platform.hvacInstance.climateMode;
    switch (climateMode) {
      case ClimateMode.FAN:
        powerState = (this.platform.hvacInstance.powerState === PowerState.ON) ? 1 : 0;
        break;
      default:
        powerState = 0;
    }
    this.platform.log.debug('Got FanOnlyMaster Power State -> ', powerState);
    return powerState;
  }

  async setFanMode(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (true) {
      case (+value <= 10):
        await this.platform.hvacInstance.setFanModeAuto();
        break;
      case (+value <= 30):
        await this.platform.hvacInstance.setFanModeLow();
        break;
      case (+value <= 65):
        await this.platform.hvacInstance.setFanModeMedium();
        break;
      case (+value <= 100):
        await this.platform.hvacInstance.setFanModeHigh();
        break;
    }
    this.platform.log.debug('Set FanOnlyMaster Fan Mode 1-10:Auto, 11-30:Low, 31-65:Medium, 66-100:High -> ', value);
  }

  getFanMode(): CharacteristicValue {
    let currentMode: number;
    const fanMode = this.platform.hvacInstance.fanMode;
    switch (fanMode) {
      case FanMode.AUTO || FanMode.AUTO_CONT:
        currentMode = 10;
        break;
      case FanMode.LOW || FanMode.LOW_CONT:
        currentMode = 25;
        break;
      case FanMode.MEDIUM || FanMode.MEDIUM_CONT:
        currentMode = 50;
        break;
      case FanMode.HIGH || FanMode.HIGH_CONT:
        currentMode = 100;
        break;
      default:
        currentMode = 0;
        this.platform.log.debug('Failed To Get FanOnlyMaster Current Fan Mode -> ', fanMode);
    }
    this.platform.log.debug('Got FanOnlyMaster Current Fan Mode -> ', fanMode);
    return currentMode;
  }
}