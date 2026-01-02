import amqp from "amqplib/callback_api";
import { promisify } from "util";

// Promisified connection and channel
let connection: any = null;
let channel: any = null;

/**
 * Get or create RabbitMQ connection and channel
 */
async function getChannel(): Promise<any> {
  if (channel) {
    return channel;
  }

  try {
    // Get RabbitMQ connection URL from environment variable
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost";

    // Create connection if it doesn't exist
    if (!connection) {
      // Use promise wrapper for callback-based API
      connection = await new Promise((resolve, reject) => {
        amqp.connect(rabbitmqUrl, (err, conn) => {
          if (err) {
            reject(err);
          } else {
            // Handle connection errors
            conn.on("error", (error: Error) => {
              console.error("RabbitMQ connection error:", error);
              connection = null;
              channel = null;
            });

            conn.on("close", () => {
              console.log("RabbitMQ connection closed");
              connection = null;
              channel = null;
            });

            resolve(conn);
          }
        });
      });
    }

    // Create channel
    channel = await new Promise((resolve, reject) => {
      connection.createChannel((err: Error | null, ch: any) => {
        if (err) {
          reject(err);
        } else {
          // Handle channel errors
          ch.on("error", (error: Error) => {
            console.error("RabbitMQ channel error:", error);
            channel = null;
          });

          ch.on("close", () => {
            console.log("RabbitMQ channel closed");
            channel = null;
          });

          resolve(ch);
        }
      });
    });

    return channel;
  } catch (error) {
    console.error("Failed to create RabbitMQ channel:", error);
    connection = null;
    channel = null;
    throw error;
  }
}

/**
 * Publish a message to a RabbitMQ queue
 * @param queueName - Name of the queue to publish to
 * @param message - Message payload to publish (will be JSON stringified)
 */
export async function publishToQueue(
  queueName: string,
  message: any
): Promise<void> {
  try {
    const ch = await getChannel();

    // Assert the queue exists (creates if it doesn't)
    await new Promise((resolve, reject) => {
      ch.assertQueue(
        queueName,
        {
          durable: true, // Queue survives broker restart
        },
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve(undefined);
          }
        }
      );
    });

    // Convert message to buffer
    const messageBuffer = Buffer.from(JSON.stringify(message));

    // Publish message to the queue
    const published = ch.sendToQueue(queueName, messageBuffer, {
      persistent: true, // Message survives broker restart
    });

    if (!published) {
      console.warn(
        `Message not published to queue ${queueName}, channel buffer is full`
      );
    } else {
      console.log(`Message published to queue ${queueName}:`, message);
    }
  } catch (error) {
    console.error(`Failed to publish message to queue ${queueName}:`, error);
    throw error;
  }
}

/**
 * Close RabbitMQ connection and channel gracefully
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await new Promise<void>((resolve) => {
        channel.close(() => {
          channel = null;
          resolve();
        });
      });
    }

    if (connection) {
      await new Promise<void>((resolve) => {
        connection.close(() => {
          connection = null;
          resolve();
        });
      });
    }

    console.log("RabbitMQ connection closed gracefully");
  } catch (error) {
    console.error("Error closing RabbitMQ connection:", error);
  }
}
