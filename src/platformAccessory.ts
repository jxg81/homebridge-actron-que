import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ClimateMode, CompressorMode } from './types';
import { ActronQuePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MasterControllerAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: ActronQuePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Actron')
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.hvacInstance.type)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.platform.hvacInstance.serail);

    // Get or create the heater cooler service.
    this.service = this.accessory.getService(this.platform.Service.HeaterCooler)
    || this.accessory.addService(this.platform.Service.HeaterCooler);

    // Set accesory display name, this is taken from discover devices in platform
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.DisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/HeaterCooler

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setPowerState.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getPowerState.bind(this));               // GET - bind to the `getOn` method below

    // register handlers current compressor operating mode
    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onSet(this.getClimateMode.bind(this));       // SET - bind to the 'setBrightness` method below

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(this.getTargetHeaterCoolerState.bind(this))
      .onSet(this.setTargetHeaterCoolerState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));
    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // Example: add two "motion sensor" services to the accessory
    // const motionSensorOneService = this.accessory.getService('Motion Sensor One Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor One Name', 'YourUniqueIdentifier-1');

    // const motionSensorTwoService = this.accessory.getService('Motion Sensor Two Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor Two Name', 'YourUniqueIdentifier-2');

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    // let motionDetected = false;
    // setInterval(() => {
    //   // EXAMPLE - inverse the trigger
    //   motionDetected = !motionDetected;

    //   // push the new value to HomeKit
    //   motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
    //   motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

    //   this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
    //   this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    // }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setPowerState(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    const currentPowerState = (this.platform.hvacInstance.powerState === 'ON') ? 1 : 0;
    const requestedPowerState = value;
    if (currentPowerState !== requestedPowerState) {
      this.platform.hvacInstance.setPowerState();
    }
    this.platform.log.debug('Set Characteristic PowerToggle ->', requestedPowerState);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getPowerState(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const powerState = (this.platform.hvacInstance.powerState === 'ON') ? 1 : 0;
    this.platform.log.debug('Get Characteristic powerState ->', powerState);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return powerState;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async getClimateMode(): Promise<CharacteristicValue | undefined> {
    let currentMode = 0;
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
        this.platform.log.debug('Get Characteristic CompressorMode failed ->', compressorMode);
        return;
    }
    this.platform.log.debug('Get Characteristic CompressorMode Sucess -> ', compressorMode);
    return currentMode;
  }

  async setTargetHeaterCoolerState(value: CharacteristicValue) {
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
        this.platform.log.debug('Set Characteristic ClimateSetting failed ->', value);
    }
    this.platform.log.debug('Set Characteristic ClimateSetting Sucess -> ', value);
  }

  async getTargetHeaterCoolerState(): Promise<CharacteristicValue> {
    let currentMode = 0;
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
        this.platform.log.debug('Get Characteristic ClimateSettingfailed ->', climateMode);
    }
    this.platform.log.debug('Get Characteristic ClimateSetting Sucess -> ', climateMode);
    return currentMode;
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const currentTemp = this.platform.hvacInstance.masterCurrentTemp;
    this.platform.log.debug('Get Characteristic ClimateSetting Sucess -> ', currentTemp);
    return currentTemp;
  }

}