import { Schema } from 'jtd';

export const SystemStatusSchema: Schema = {
  properties: {
    isOnline: {
      type: 'boolean',
    },
    lastKnownState: {
      properties: {
        LiveAircon: {
          optionalProperties:{
            CanRunSystem: {
              type: 'boolean',
            },
            CompressorCanRun: {
              type: 'boolean',
            },
            CompressorCapacity: {
              type: 'uint8',
            },
            IndoorUnitTemp: {
              type: 'float64',
            },
            LastCompressorPowerChange: {
              type: 'string',
            },
            LastCompressorPowerChange_time: {
              type: 'string',
            },
            SystemOn: {
              type: 'boolean',
            },
            ZoneDemandSufficient: {
              type: 'boolean',
            },
          },
          properties: {
            AmRunningFan: {
              type: 'boolean',
            },
            CompressorChasingTemperature: {
              type: 'float64',
            },
            CompressorLiveTemperature: {
              type: 'float64',
            },
            CompressorMode: {
              type: 'string',
            },
            OutdoorUnit: {
              optionalProperties: {
                AmbTemp: {
                  type: 'float64',
                },
                AutoMode: {
                  type: 'uint8',
                },
                CoilTemp: {
                  type: 'float64',
                },
                CompMustRunOFF: {
                  type: 'boolean',
                },
                CompMustRunON: {
                  type: 'boolean',
                },
                CompressorMode: {
                  type: 'uint8',
                },
                CompressorOn: {
                  type: 'boolean',
                },
                ContFan: {
                  type: 'boolean',
                },
                FanMode: {
                  type: 'uint8',
                },
                FanSetSpeed: {
                  type: 'uint8',
                },
                FanSpeed: {
                  type: 'float64',
                },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        MasterInfo: {
          optionalProperties:{
            CanOperate: {
              type: 'boolean',
            },
            CloudConnected: {
              type: 'string',
            },
            CloudReachable: {
              type: 'boolean',
            },
            ControlAllZones: {
              type: 'boolean',
            },
          },
          properties: {
            LiveHumidity_pc: {
              type: 'float64',
            },
            LiveOutdoorTemp_oC: {
              type: 'float64',
            },
            LiveTemp_oC: {
              type: 'float64',
            },
          },
          additionalProperties: true,
        },
        RemoteZoneInfo: {
          elements: {
            optionalProperties: {
              CanOperate: {
                type: 'boolean',
              },
            },
            properties: {
              LiveTemp_oC: {
                type: 'float64',
              },
              NV_Title: {
                type: 'string',
              },
              TemperatureSetpoint_Cool_oC: {
                type: 'float64',
              },
              TemperatureSetpoint_Heat_oC: {
                type: 'float64',
              },
              ZonePosition: {
                type: 'uint8',
              },
            },
            additionalProperties: true,
          },
        },
        UserAirconSettings: {
          properties: {
            AwayMode: {
              type: 'boolean',
            },
            EnabledZones: {
              elements: {
                type: 'boolean',
              },
            },
            FanMode: {
              type: 'string',
            },
            Mode: {
              type: 'string',
            },
            NV_SavedZoneState: {
              elements: {
                type: 'boolean',
              },
            },
            QuietMode: {
              type: 'boolean',
            },
            TemperatureSetpoint_Cool_oC: {
              type: 'float64',
            },
            TemperatureSetpoint_Heat_oC: {
              type: 'float64',
            },
            isFastHeating: {
              type: 'boolean',
            },
            isOn: {
              type: 'boolean',
            },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

export const AcSystemsSchema: Schema = {
  properties: {
    _embedded: {
      properties: {
        'ac-system': {
          elements: {
            properties: {
              description: {
                type: 'string',
              },
              expires: {
                type: 'timestamp',
              },
              id: {
                type: 'string',
              },
              issued: {
                'type': 'timestamp',
              },
              serial: {
                type: 'string',
              },
              type: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

export const AccessTokenSchema: Schema = {
  properties: {
    _links: {
      properties: {
        self: {
          properties: {
            href: {
              type: 'string',
            },
          },
        },
      },
    },
    deviceName: {
      type: 'string',
    },
    expires: {
      type: 'timestamp',
    },
    id: {
      type: 'string',
    },
    pairingToken: {
      type: 'string',
    },
  },
};

export const BearerTokenSchema: Schema = {
  properties: {
    access_token: {
      type: 'string',
    },
    expires_in: {
      type: 'uint32',
    },
    token_type: {
      type: 'string',
    },
  },
};

export const CommandResponseSchema: Schema = {
  properties: {
    correlationId: {
      type: 'string',
    },
    mwcResponseTime: {
      type: 'string',
    },
    type: {
      type: 'string',
    },
    value: {
      properties: {
        type: {
          type: 'string',
        },
      },
      additionalProperties: true,
    },
  },
};