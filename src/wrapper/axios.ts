import http from "http";
import https from "https";
import * as XRayAWS from "aws-xray-sdk";
import axios from "axios";

XRayAWS.captureHTTPsGlobal(http, false);
XRayAWS.captureHTTPsGlobal(https, false);

export const axiosWrapper = axios;
