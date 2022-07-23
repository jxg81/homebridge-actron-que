import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ActronQuePlatform } from './platform';

// This class represents the master controller, a seperate class is used for representing zones (or will be once i write it)
export class OutdoorUnitAccessory {
  private temperatureService: Service;

  constructor(
    private readonly platform: ActronQuePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Actron')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.hvacInstance.type + ' Outdoor Unit')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.hvacInstance.serialNo);

    // Get or create the temperature sensor service.
    this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
    || this.accessory.addService(this.platform.Service.TemperatureSensor);

    // Set accesory display name, this is taken from discover devices in platform
    this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName + '-outdoorUnit');

    this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    setInterval(() => this.updateAllDeviceCharacteristics(), this.platform.refreshInterval);

  }

  // SET's are async as these need to wait on API response then cache the return value on the hvac Class instance
  // GET's run non async as this is a quick retrival from the hvac class insatnce cache
  // UPDATE is run Async as this polls the API first to confirm current cache state is accurate
  async updateAllDeviceCharacteristics() {
    this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.getCurrentTemperature());
  }

  getCurrentTemperature(): CharacteristicValue {
    const currentTemp = this.platform.hvacInstance.outdoorTemp;
    this.platform.log.debug('Got outdoor temperature -> ', currentTemp);
    return currentTemp;
  }

}