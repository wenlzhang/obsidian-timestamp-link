export interface MyPluginSettings {
  blockIDDateFormat: string;
  appendTextDateFormat: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  blockIDDateFormat: 'YYYY-MM-DDTHH-mm-ss',
  appendTextDateFormat: '[📝 ]YYYY-MM-DDTHH:mm',
};
