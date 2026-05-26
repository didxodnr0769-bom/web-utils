import jwt from './jwt-view.js';
import base64 from './base64-view.js';
import url from './url-view.js';
import curl from './curl-view.js';
import json from './json-formatter-view.js';
import color from './color-view.js';
import unixTs from './unix-timestamp-view.js';

export const views = [
  jwt,
  base64,
  url,
  curl,
  json,
  color,
  unixTs,
];
