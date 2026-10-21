export const subscriberCode = String.raw`
const { unzipSync } = require("node:zlib");
const { SQSClient, SendMessageBatchCommand } = require("@aws-sdk/client-sqs");
const sqs = new SQSClient({ region: process.env.SST_CONSOLE_ISSUE_QUEUE_REGION });
// Decodes one CloudWatch batch and delivers bounded log records to Console SQS.
exports.handler = async event => {
  const data = JSON.parse(unzipSync(Buffer.from(event.awslogs.data, "base64")).toString());
  if (data.messageType !== "DATA_MESSAGE" || !data.owner || !data.logGroup) return;
  const events = data.logEvents.map(item => ({
    id: item.id,
    timestamp: item.timestamp,
    message: String(item.message).slice(0, 16384)
  }));
  const source = {
    accountId: data.owner,
    region: process.env.AWS_REGION,
    logGroup: data.logGroup,
    logStream: data.logStream || ""
  };
  let batch = [], size = 0, sequence = 0;
  // Sends accumulated entries and fails delivery when SQS rejects any entry.
  async function send() {
    if (!batch.length) return;
    const result = await sqs.send(new SendMessageBatchCommand({
      QueueUrl: process.env.SST_CONSOLE_ISSUE_QUEUE_URL,
      Entries: batch
    }));
    if (result.Failed && result.Failed.length) throw new Error("Issue ingress queue rejected " + result.Failed.length + " messages");
    batch = []; size = 0;
  }
  for (const item of events) {
    const body = JSON.stringify({ source, events: [item] });
    if (Buffer.byteLength(body) > 240000) continue;
    if (batch.length === 10 || size + Buffer.byteLength(body) > 240000) await send();
    batch.push({ Id: String(sequence++), MessageBody: body });
    size += Buffer.byteLength(body);
  }
  await send();
};
`;
