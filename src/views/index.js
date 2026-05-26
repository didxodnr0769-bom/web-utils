import jwt from './jwt-view.js';
import base64 from './base64-view.js';
import url from './url-view.js';
import htmlEntity from './html-entity-view.js';
import unicode from './unicode-view.js';
import hex from './hex-view.js';
import unixTs from './unix-timestamp-view.js';
import cron from './cron-view.js';
import caseView from './case-view.js';
import regex from './regex-view.js';
import curl from './curl-view.js';

export const views = [
  jwt,
  base64,
  url,
  htmlEntity,
  unicode,
  hex,
  unixTs,
  cron,
  caseView,
  regex,
  curl,
];
