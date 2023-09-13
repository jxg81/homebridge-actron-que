export const queApiCommands = {
  ON: () => (
    {
      'command': {
        'UserAirconSettings.isOn': true,
        'type': 'set-settings',
      },
    }),

  OFF: () => (
    {
      'command': {
        'UserAirconSettings.isOn': false,
        'type': 'set-settings',
      },
    }),

  CLIMATE_MODE_AUTO: () => (
    {
      'command': {
        'UserAirconSettings.Mode': 'AUTO',
        'type': 'set-settings',
      },
    }),

  CLIMATE_MODE_COOL: () => (
    {
      'command': {
        'UserAirconSettings.Mode': 'COOL',
        'type': 'set-settings',
      },
    }),

  CLIMATE_MODE_FAN: () => (
    {
      'command': {
        'UserAirconSettings.Mode': 'FAN',
        'type': 'set-settings',
      },
    }),

  CLIMATE_MODE_HEAT: () => (
    {
      'command': {
        'UserAirconSettings.Mode': 'HEAT',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_AUTO: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'AUTO',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_AUTO_CONT: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'AUTO-CONT',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_LOW: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'LOW',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_LOW_CONT: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'LOW-CONT',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_MEDIUM: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'MED',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_MEDIUM_CONT: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'MED-CONT',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_HIGH: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'HIGH',
        'type': 'set-settings',
      },
    }),

  FAN_MODE_HIGH_CONT: () => (
    {
      'command': {
        'UserAirconSettings.FanMode': 'HIGH-CONT',
        'type': 'set-settings',
      },
    }),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  COOL_SET_POINT: (coolTemp: number, _heatTemp: number) => (
    {
      'command': {
        'UserAirconSettings.TemperatureSetpoint_Cool_oC': coolTemp,
        'type': 'set-settings',
      },
    }),

  HEAT_SET_POINT: (_coolTemp: number, heatTemp: number) => (
    {
      'command': {
        'UserAirconSettings.TemperatureSetpoint_Heat_oC': heatTemp,
        'type': 'set-settings',
      },
    }),

  HEAT_COOL_SET_POINT: (coolTemp: number, heatTemp: number) => (
    {
      'command': {
        'UserAirconSettings.TemperatureSetpoint_Cool_oC': coolTemp,
        'UserAirconSettings.TemperatureSetpoint_Heat_oC': heatTemp,
        'type': 'set-settings',
      },
    }),

  CONTROL_ALL_ZONES_ON: () => (
    {
      'command': {
        'MasterInfo.ControlAllZones': true,
        'type': 'set-settings',
      },
    }),

  CONTROL_ALL_ZONES_OFF: () => (
    {
      'command': {
        'MasterInfo.ControlAllZones': false,
        'type': 'set-settings',
      },
    }),

  AWAY_MODE_ON: () => (
    {
      'command': {
        'UserAirconSettings.AwayMode': true,
        'type': 'set-settings',
      },
    }),

  AWAY_MODE_OFF: () => (
    {
      'command': {
        'UserAirconSettings.AwayMode': false,
        'type': 'set-settings',
      },
    }),

  QUIET_MODE_ON: () => (
    {
      'command': {
        'UserAirconSettings.QuietMode': true,
        'type': 'set-settings',
      },
    }),

  QUIET_MODE_OFF: () => (
    {
      'command': {
        'UserAirconSettings.QuietMode': false,
        'type': 'set-settings',
      },
    }),

  ZONE_ENABLE: (_coolTemp: number, _heatTemp: number, zoneIndex: number, currentZoneStatus: boolean[]) => (
    {
      'command': {
        ['UserAirconSettings.EnabledZones']: modifiedZoneStatuses(true, zoneIndex, currentZoneStatus),
        'type': 'set-settings',
      },
    }),

  ZONE_DISABLE: (_coolTemp: number, _heatTemp: number, zoneIndex: number, currentZoneStatus: boolean[]) => (
    {
      'command': {
        ['UserAirconSettings.EnabledZones']: modifiedZoneStatuses(false, zoneIndex, currentZoneStatus),
        'type': 'set-settings',
      },
    }),

  ZONE_COOL_SET_POINT: (coolTemp: number, _heatTemp: number, zoneIndex: number) => (
    {
      'command': {
        [`RemoteZoneInfo[${zoneIndex}].TemperatureSetpoint_Cool_oC`]: coolTemp,
        'type': 'set-settings',
      },
    }),

  ZONE_HEAT_SET_POINT: (_coolTemp: number, heatTemp: number, zoneIndex: number) => (
    {
      'command': {
        [`RemoteZoneInfo[${zoneIndex}].TemperatureSetpoint_Heat_oC`]: heatTemp,
        'type': 'set-settings',
      },
    }),
};

//#region "Helper Functions"

// eslint-disable-next-line max-len
function modifiedZoneStatuses(status: boolean, zoneIndex: number, currentZoneStatus: boolean[]) { // read-only property with getter function (this is not the same thing as a “function-property”)
  const modifiedValues = currentZoneStatus;
  modifiedValues[zoneIndex] = status;
  return modifiedValues;
}

//#endregion "Helper Functions"




