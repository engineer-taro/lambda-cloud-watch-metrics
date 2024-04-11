#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { LambdaCloudWatchMetricsStack } from "../lib/lambda-cloud-watch-metrics-stack";

const app = new cdk.App();
new LambdaCloudWatchMetricsStack(app, "lambda-cw-metrics", {});
