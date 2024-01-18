import { Service, PlatformAccessory, CharacteristicValue, HAPStatus } from 'homebridge';
import { ClimateMode } from './types';
import { ActronQuePlatform } from './platform';
import { HvacZone } from './hvacZone';

// This class represents the zone controller
export class FanOnlyZoneAccessory {
  private fanService: Service;

  constructor(
    private readonly platform: ActronQuePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly zone: HvacZone,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Actron')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.hvacInstance.type + ' FanOnlyZone')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.zone.sensorId);

    // Get or create the fan service.
    this.fanService = this.accessory.getService(this.platform.Service.Fanv2)
    || this.accessory.addService(this.platform.Service.Fanv2);

    // Set accessory display name, this is taken from discover devices in platform
    this.fanService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    // register handlers for device control, references the class methods that follow for Set and Get
    this.fanService.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setEnableState.bind(this))
      .onGet(this.getEnableState.bind(this));


    setInterval(() => this.softUpdateDeviceCharacteristics(), this.platform.softRefreshInterval);

  }

  // SET's are async as these need to wait on API response then cache the return value on the hvac Class instance
  // GET's run non async as this is a quick retrieval from the hvac class instance cache
  // UPDATE is run Async as this polls the API first to confirm current cache state is accurate
  async softUpdateDeviceCharacteristics() {
    this.fanService.updateCharacteristic(this.platform.Characteristic.Active, this.getEnableState());
  }

  checkHvacComms() {
    if (!this.platform.hvacInstance.cloudConnected) {
      this.platform.log.error('Master Controller is offline. Check Master Controller Internet/Wifi connection');
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async setEnableState(value: CharacteristicValue) {
    this.checkHvacComms();
    switch (value) {
      case 0:
        await this.zone.setZoneDisable();
        break;
      case 1:
        await this.zone.setZoneEnable();
        await this.platform.hvacInstance.setClimateModeFan();
        break;
    }
    this.platform.log.debug(`Set FanOnlyZone ${this.zone.zoneName} Enable State -> `, value);
  }

  getEnableState(): CharacteristicValue {
    // Check climate mode, if it is any value other than FAN then we are not in fan-only mode
    // If it is FAN then we need to check if the zone is enabled
    let enableState: number;
    const climateMode = this.platform.hvacInstance.climateMode;
    switch (climateMode) {
      case ClimateMode.FAN:
        enableState = (this.zone.zoneEnabled === true) ? 1 : 0;
        break;
      default:
        enableState = 0;
    }
    this.platform.log.debug(`Got FanOnlyZone ${this.zone.zoneName} Enable State -> `, enableState);
    return enableState;
  }
}