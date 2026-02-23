import axios from 'axios';

import { env } from '../config/env.js';

export const apiPythonClient = axios.create({
  baseURL: env.apiPythonBaseUrl,
  timeout: 10000
});
