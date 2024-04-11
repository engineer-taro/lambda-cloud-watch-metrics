import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { getSegment, captureAWSv3Client } from "aws-xray-sdk";
import { axiosWrapper } from "./wrapper/axios";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";

const logger = new Logger({ serviceName: "getUserHandler" });
//
const cloudWatchClient = createCwClient();

const CW_METRIC_NAMESPACE = process.env.CW_METRIC_NAMESPACE!;
const CW_METRIC_NAME = process.env.CW_METRIC_NAME!;

// Lambda関数のハンドラー
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const segment = getSegment()?.addNewSubsegment("getUserHandler");

  // リクエストから情報を取得
  const method = event.httpMethod;
  const path = event.path;
  const queryParams = event.queryStringParameters;
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    const response = await axiosWrapper.get(
      "https://jsonplaceholder.typicode.com/users"
    );
    logger.info("response", { response });

    // CloudWatchにメトリクスを送信: 非同期で通信する
    await sendSuccessMetricsSampleService();

    // 正常なレスポンスを返す
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    logger.error("error", { error });
    // エラー時のレスポンスを返す
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  } finally {
    segment?.close();
  }
};

function createCwClient() {
  let cloudWatchClient: CloudWatchClient | undefined;
  const segment = getSegment()?.addNewSubsegment("createCwClient");
  try {
    cloudWatchClient = captureAWSv3Client(
      new CloudWatchClient({
        requestHandler: {
          connectionTimeout: 1000,
          requestTimeout: 5,
        },
        maxAttempts: 1,
      })
    );
  } catch {
    logger.warn("CloudWatchClientの初期化に失敗");
  } finally {
    segment?.close();
  }
  return cloudWatchClient;
}

const sendSuccessMetricsSampleService = async () => {
  try {
    await cloudWatchClient?.send(
      new PutMetricDataCommand({
        Namespace: CW_METRIC_NAMESPACE,
        MetricData: [
          {
            MetricName: CW_METRIC_NAME,
            Value: 1,
            Unit: "Count",
            Timestamp: new Date(),
            Dimensions: [
              {
                Name: "Service",
                Value: "SampleService",
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    logger.warn("CloudWatchメトリクスへのsendに失敗", { error });
  }
};

// const sendErrorMetricsSampleService = async () => {
//   await cloudWatchClient.send(
//     new PutMetricDataCommand({
//       Namespace: CW_ERROR_METRIC_NAMESPACE,
//       MetricData: [
//         {
//           MetricName: CW_ERROR_METRIC_NAME,
//           Value: 1,
//           Unit: "Count",
//           Timestamp: new Date(),
//           Dimensions: [
//             {
//               Name: "Service",
//               Value: "SampleService",
//             },
//           ],
//         },
//       ],
//     })
//   );
// };
