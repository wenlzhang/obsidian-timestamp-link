export interface TimestampLinkSettings {
  blockIDDateFormat: string;
  appendTextDateFormat: string;
  uidField: string;
  advancedUriFormat: 'plain' | 'markdown';
}

export const DEFAULT_SETTINGS: TimestampLinkSettings = {
  blockIDDateFormat: 'YYYY-MM-DDTHH-mm-ss',
  appendTextDateFormat: '[📝 ]YYYY-MM-DDTHH:mm',
  uidField: 'uuid',
  advancedUriFormat: 'plain',
};
