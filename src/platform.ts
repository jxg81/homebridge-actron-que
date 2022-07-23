import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { MasterControllerAccessory } from './masterControllerAccessory';
import { ZoneControllerAccessory } from './zoneControllerAccessory';
import { OutdoorUnitAccessory } from './outdoorUnitAccessory';
import { HvacUnit } from './hvac';
import { HvacZone } from './hvacZone';
import { DiscoveredDevices } from './types';

export class ActronQuePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  // Attributes required for intialisation of ActronQue platform
  private readonly clientName: string;
  private readonly username: string;
  private readonly password: string;
  readonly userProvidedSerialNo: string = '';
  readonly zonesFollowMaster: boolean = true;
  readonly refreshInterval: number = 60000;
  hvacInstance!: HvacUnit;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.clientName = config['clientName'];
    this.username = config['username'];
    this.password = config['password'];
    if (config['deviceSerial']) {
      this.userProvidedSerialNo = config['deviceSerial'];
      this.log.debug('Serial number should only be specified if you have multiple systems in your Que account', this.userProvidedSerialNo);
    } else {
      this.userProvidedSerialNo = '';
    }
    if (config['zonesFollowMaster']) {
      this.zonesFollowMaster = config['zonesFollowMaster'];
      this.log.debug('Will zones follow chnages to the master controller automatically?', this.zonesFollowMaster);
    } else {
      this.zonesFollowMaster = true;
    }
    if (config['refreshInterval']) {
      this.refreshInterval = config['refreshInterval'] * 1000;
      this.log.debug('Auto refresh interval set to seconds', this.refreshInterval/1000);
    } else {
      this.refreshInterval = 60000;
    }

    // Check Required Config Fields
    if (!this.username) {
      this.log.error('Username is not configured - aborting plugin start. ' +
        'Please set the field `username` in your config and restart Homebridge.');
      return;
    }

    if (!this.password) {
      this.log.error('Password is not configured - aborting plugin start. ' +
        'Please set the field `password` in your config and restart Homebridge.');
      return;
    }

    if (!this.clientName) {
      this.log.error('Client Name is not configured - aborting plugin start. ' +
        'Please set the field `clientName` in your config and restart Homebridge.');
      return;
    }

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    // Instantiate an instance of HvacUnit and connect the actronQueApi
    this.hvacInstance = new HvacUnit(this.clientName, this.log, this.zonesFollowMaster);
    const hvacSerial = await this.hvacInstance.actronQueApi(this.username, this.password, this.userProvidedSerialNo);
    // Make sure we have havc master and zone data before adding devices
    await this.hvacInstance.getStatus();
    const devices: DiscoveredDevices[] = [
      {
        type: 'masterController',
        uniqueId: hvacSerial,
        displayName: this.clientName,
        instance: this.hvacInstance,
      },
      {
        type: 'outdoorUnit',
        uniqueId: hvacSerial + '-outdoorUnit',
        displayName: this.clientName + '-outdoorUnit',
        instance: this.hvacInstance,
      },
    ];
    for (const zone of this.hvacInstance.zoneInstances) {
      devices.push({
        type: 'zoneController',
        uniqueId: zone.sensorId,
        displayName: zone.zoneName,
        instance: zone,
      });
    }
    this.log.debug('Discovered Devices \n', devices);
    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of devices) {
      // create uuid first then see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const uuid = this.api.hap.uuid.generate(device.uniqueId);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      // Create and/or restore cached accessories
      if (existingAccessory && device.type === 'masterController') {
        this.log.info('Restoring Master Controller accessory from cache:', existingAccessory.displayName);
        new MasterControllerAccessory(this, existingAccessory);

      } else if (existingAccessory && device.type === 'zoneController') {
        this.log.info('Restoring Zone Controller accessory from cache:', existingAccessory.displayName);
        new ZoneControllerAccessory(this, existingAccessory, device.instance as HvacZone);

      } else if (existingAccessory && device.type === 'outdoorUnit') {
        this.log.info('Restoring Outdoor Unit accessory from cache:', existingAccessory.displayName);
        new OutdoorUnitAccessory(this, existingAccessory);

      } else if (!existingAccessory && device.type === 'masterController'){
        this.log.info('Adding new accessory:', device.displayName);
        const accessory = new this.api.platformAccessory(device.displayName, uuid);
        accessory.context.device = device;
        new MasterControllerAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

      } else if (!existingAccessory && device.type === 'zoneController'){
        this.log.info('Adding new accessory:', device.displayName);
        const accessory = new this.api.platformAccessory(device.displayName, uuid);
        accessory.context.device = device;
        new ZoneControllerAccessory(this, accessory, device.instance as HvacZone);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

      } else if (!existingAccessory && device.type === 'outdoorUnit'){
        this.log.info('Adding new accessory:', device.displayName);
        const accessory = new this.api.platformAccessory(device.displayName, uuid);
        accessory.context.device = device;
        new OutdoorUnitAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}