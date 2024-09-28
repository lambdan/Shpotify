import { Connection, Channel, ConsumeMessage, connect, Message } from "amqplib";
import { z } from "zod";
import { sleep } from "./utils";
import { EventEmitter } from "events";

export const zRabbitOptions = z.object({
  host: z.string().default("localhost"),
  port: z.number().default(5672),
  user: z.string().default("guest"),
  pass: z.string().default("guest"),
  reconnectInterval: z.number().default(15000),
});
export type RabbitOptions = z.infer<typeof zRabbitOptions>;

export class rabbitClient {
  private rabbitOptions: RabbitOptions;
  private connection: Connection | null;
  private channel: Channel | null;
  private reconnectLoopRunning = false;
  private clientName: string;
  public eventEmitter: EventEmitter;

  constructor(
    clientName: string,
    opts: RabbitOptions = zRabbitOptions.parse({})
  ) {
    this.clientName = clientName;
    this.rabbitOptions = opts;
    this.connection = null;
    this.channel = null;
    this.eventEmitter = new EventEmitter();
  }

  public async startReconnectLoop() {
    if (this.reconnectLoopRunning) {
      return;
    }
    this.reconnectLoopRunning = true;

    while (this.reconnectLoopRunning) {
      if (this.connection == null) {
        try {
          await this.connect();
        } catch (err) {
          this.log(["failed connecting to rabbit", err], "error");
        }
      }
      await sleep(this.rabbitOptions.reconnectInterval);
    }
  }

  private async connect() {
    try {
      this.connection = await connect({
        hostname: this.rabbitOptions.host,
        port: this.rabbitOptions.port,
        username: this.rabbitOptions.user,
        password: this.rabbitOptions.pass,
      });

      this.connection.on("error", (err) => {
        this.log(["Rabbit connection error:", err], "error");
      });

      this.connection.on("close", () => {
        this.log("Rabbit connection closed", "warn");
        this.eventEmitter.emit("disconnected");
        this.connection = null;
      });

      this.log("Connected to rabbit!");
      this.channel = await this.getChannel();
      this.eventEmitter.emit("connected");
    } catch (err) {
      this.log(["Rabbit connection failed", err], "error");
      throw err;
    }
  }

  private async getChannel(): Promise<Channel> {
    if (!this.connection) {
      throw new Error("getChannel(): connection null");
    }
    return await this.connection.createChannel();
  }

  public async publish(queueName: string, message: string) {
    if (!this.channel) {
      throw new Error("queue(): Channel null");
    }
    await this.channel.assertQueue(queueName, { durable: true });
    this.channel.sendToQueue(queueName, Buffer.from(message), {
      persistent: true,
    });
    this.log(["publish() OK", queueName, message]);
  }

  /**
   * Subscribes to a queue and makes callbacks. Ack/nack yourself!
   * @param queueName
   * @param callback
   */
  public async subscribe(queueName: string, callback: (msg: Message) => void) {
    if (!this.channel) {
      throw new Error("subscribe(): Channel null");
    }
    await this.channel.assertQueue(queueName, { durable: true });

    this.channel.consume(queueName, (msg: Message | null) => {
      if (msg) {
        callback(msg);
      }
    });
  }

  public ack(msg: Message) {
    this.channel!.ack(msg);
    this.log("Acked!");
  }

  public nack(msg: Message, requeue = false) {
    this.channel!.nack(msg, false, requeue);
    this.log(["*** Nacked message ***", msg], "warn");
  }

  private log(msg: string | any[], type: "log" | "error" | "warn" = "log") {
    if (type == "error") {
      console.error(`<Rabbit: ${this.clientName}>`, msg);
    }

    if (type == "warn") {
      console.warn(`<Rabbit: ${this.clientName}>`, msg);
    }

    console.log(`<Rabbit: ${this.clientName}>`, msg);
  }
}
