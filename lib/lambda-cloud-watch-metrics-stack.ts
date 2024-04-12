import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cw from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class LambdaCloudWatchMetricsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiLogGroup = new logs.LogGroup(this, "api-access-log-group", {
      logGroupName: `/aws/apigateway/${id}-api-access-log`,
    });

    const api = new apigateway.RestApi(this, `${id}-api`, {
      deploy: true,
      deployOptions: {
        tracingEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(
          apiLogGroup
        ),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    const cloudWatchMetric = new cw.Metric({
      namespace: "AWS/Lambda",
      metricName: "RequestSuccessCount",
      period: cdk.Duration.minutes(1),
      dimensionsMap: {
        Service: "SampleService",
      },
    });

    const getUserLambda = new NodejsFunction(this, `${id}-get-user-lambda`, {
      entry: "src/get-user-handler.ts",
      handler: "handler",
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 1024,
      bundling: {
        externalModules: ["aws-sdk"],
        forceDockerBundling: false,
      },
      environment: {
        CW_METRIC_NAMESPACE: cloudWatchMetric.namespace,
        CW_METRIC_NAME: cloudWatchMetric.metricName,
      },
    });
    cw.Metric.grantPutMetricData(getUserLambda);

    const getUsersLambdaIntegration = new apigateway.LambdaIntegration(
      getUserLambda,
      {
        proxy: true,
      }
    );
    api.root.addResource("users").addMethod("GET", getUsersLambdaIntegration);
  }
}
