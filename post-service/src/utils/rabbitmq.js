const amqp = require("amqplib");
const logger = require("./logger");

// NOTE: This will help us to interact with the different micro services

// we will create a connection and channel to RabbitMQ so that we can consume and publish messages
let connection = null;
let channel = null;

// we will create unique exchange name
const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);

    // the connection will create a channel for us
    channel = await connection.createChannel();

    // Exchange is like a router that will route the messages to the correct queue and exchange is the exchange name, topic is the type and {durable: false} means it will not save the messages to the disk. it is the optional function
    // assertExchange ensures that exchange exist, if it does not exist, it will create a new exchange
    // { durable: false }: This option specifies whether the exchange should survive a RabbitMQ server restart. If durable: true, the exchange will be saved to disk and restored after a restart. Here, it’s set to false, meaning the exchange will not persist.
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbit MQ");

    return channel;
  } catch (err) {
    logger.error("Error in connecting to RabbitMQ : ", err);
  }
}

// we will create the publish method because we need to publish events when we are deleting a post
async function publishEvent(routingKey, message) {
  if (!channel) {
    // if channel is not present, we will connect to our rabbitMQ which will create a channel
    await connectToRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published. the key is ${routingKey}`);
}

module.exports = { connectToRabbitMQ, publishEvent };
